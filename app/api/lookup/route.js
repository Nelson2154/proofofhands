// /app/api/lookup/route.js
// Hybrid approach:
//   - Blockstream Esplora: wallet summary (balance, tx count, received/sent)
//   - Blockchair: oldest transaction (direct query, no pagination needed)
//   - blockchain.info: BTC price ticker

export const runtime = "edge";

export async function POST(request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    const cleaned = address.trim();

    // Validate BTC address (legacy 1..., P2SH 3..., segwit bc1q..., taproot bc1p...)
    const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    const bech32Regex = /^bc1[a-zA-HJ-NP-Z0-9]{6,87}$/;
    if (!legacyRegex.test(cleaned) && !bech32Regex.test(cleaned)) {
      return Response.json(
        { error: "Invalid Bitcoin address format" },
        { status: 400 }
      );
    }

    // ===== STEP 1: Get wallet summary from Blockstream =====
    const addrRes = await fetch(
      `https://blockstream.info/api/address/${cleaned}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (!addrRes.ok) {
      if (addrRes.status === 400) {
        return Response.json({ error: "Invalid Bitcoin address" }, { status: 400 });
      }
      return Response.json(
        { error: "Could not look up address. Try again." },
        { status: 502 }
      );
    }

    const addrData = await addrRes.json();
    const stats = addrData.chain_stats;

    const totalReceived = stats.funded_txo_sum / 1e8;
    const totalSent = stats.spent_txo_sum / 1e8;
    const currentBalance = (stats.funded_txo_sum - stats.spent_txo_sum) / 1e8;
    const txCount = stats.tx_count;

    if (txCount === 0) {
      return Response.json(
        { error: "Address has no transactions" },
        { status: 404 }
      );
    }

    const everSold = totalSent > 0;

    // ===== STEP 2: Get most recent tx from Blockstream =====
    let lastActivityTimestamp = null;
    try {
      const recentRes = await fetch(
        `https://blockstream.info/api/address/${cleaned}/txs`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (recentRes.ok) {
        const recentTxs = await recentRes.json();
        if (recentTxs.length > 0) {
          lastActivityTimestamp = recentTxs[0]?.status?.block_time || null;
        }
      }
    } catch {}

    // ===== STEP 3: Get OLDEST tx timestamp =====
    // Known addresses where pagination can't reach the first tx
    const KNOWN_FIRST_RECEIVE = {
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa": 1231006505, // Satoshi genesis: Jan 3, 2009
    };

    let firstReceiveTimestamp = KNOWN_FIRST_RECEIVE[cleaned] || null;

    // Approach A: Blockchair (handles any wallet size, returns oldest tx directly)
    try {
      const chairRes = await fetch(
        `https://api.blockchair.com/bitcoin/dashboards/address/${cleaned}?limit=0`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (chairRes.ok) {
        const chairData = await chairRes.json();
        const addrInfo = chairData?.data?.[cleaned]?.address;
        if (addrInfo?.first_seen_receiving) {
          // Blockchair returns ISO date string
          firstReceiveTimestamp = Math.floor(
            new Date(addrInfo.first_seen_receiving).getTime() / 1000
          );
        }
      }
    } catch {}

    // Approach B: If Blockchair fails, paginate Blockstream (works for < 250 txs)
    if (!firstReceiveTimestamp) {
      try {
        const txRes = await fetch(
          `https://blockstream.info/api/address/${cleaned}/txs`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (txRes.ok) {
          let txs = await txRes.json();
          let lastTxid = txs[txs.length - 1]?.txid;
          let pages = 0;

          // Walk pages (max 10 = 250 txs)
          while (txs.length === 25 && pages < 10 && lastTxid) {
            try {
              const nextRes = await fetch(
                `https://blockstream.info/api/address/${cleaned}/txs/chain/${lastTxid}`,
                { signal: AbortSignal.timeout(8000) }
              );
              if (!nextRes.ok) break;
              txs = await nextRes.json();
              if (txs.length > 0) {
                lastTxid = txs[txs.length - 1]?.txid;
              }
              pages++;
            } catch {
              break;
            }
          }

          if (txs.length > 0) {
            firstReceiveTimestamp =
              txs[txs.length - 1]?.status?.block_time || null;
          }
        }
      } catch {}
    }

    // Approach C: blockchain.info as last resort
    if (!firstReceiveTimestamp) {
      try {
        const biRes = await fetch(
          `https://blockchain.info/rawaddr/${cleaned}?limit=1&offset=${Math.max(0, txCount - 1)}`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(12000),
          }
        );
        if (biRes.ok) {
          const biData = await biRes.json();
          if (biData.txs?.length > 0) {
            firstReceiveTimestamp = biData.txs[0].time;
          }
        }
      } catch {}
    }

    if (!firstReceiveTimestamp) {
      return Response.json(
        { error: "Could not determine when this address first received BTC. Try again." },
        { status: 500 }
      );
    }

    const firstReceiveDate = new Date(firstReceiveTimestamp * 1000).toISOString();
    const lastActivityDate = lastActivityTimestamp
      ? new Date(lastActivityTimestamp * 1000).toISOString()
      : firstReceiveDate;

    const holdDays = Math.floor(
      (new Date() - new Date(firstReceiveDate)) / (1000 * 60 * 60 * 24)
    );

    // ===== STEP 4: BTC price =====
    let btcPrice = 84712;
    try {
      const priceRes = await fetch("https://blockchain.info/ticker", {
        signal: AbortSignal.timeout(5000),
      });
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        btcPrice = priceData.USD?.last || btcPrice;
      }
    } catch {}

    return Response.json({
      address: cleaned,
      firstReceive: firstReceiveDate,
      lastActivity: lastActivityDate,
      totalReceived,
      totalSent,
      currentBalance,
      txCount,
      holdDays,
      everSold,
      btcPrice,
    });
  } catch (err) {
    console.error("Lookup error:", err);

    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return Response.json(
        { error: "Request timed out. Try again." },
        { status: 504 }
      );
    }

    return Response.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
