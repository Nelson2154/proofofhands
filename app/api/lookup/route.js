// /app/api/lookup/route.js
// Primary: Blockstream Esplora API (free, no key, handles all address types)
// Fallback: blockchain.info

export const runtime = "edge";

// ========== BLOCKSTREAM ESPLORA (Primary) ==========
async function lookupBlockstream(address) {
  const base = "https://blockstream.info/api";

  // 1. Get address summary
  const addrRes = await fetch(`${base}/address/${address}`, {
    signal: AbortSignal.timeout(12000),
  });

  if (!addrRes.ok) {
    if (addrRes.status === 400) throw { status: 400, message: "Invalid Bitcoin address" };
    throw { status: addrRes.status, message: "Address lookup failed" };
  }

  const addrData = await addrRes.json();

  // Esplora gives us chain_stats (confirmed) and mempool_stats (unconfirmed)
  const stats = addrData.chain_stats;
  const totalReceived = stats.funded_txo_sum / 1e8;
  const totalSent = stats.spent_txo_sum / 1e8;
  const currentBalance = (stats.funded_txo_sum - stats.spent_txo_sum) / 1e8;
  const txCount = stats.tx_count;

  if (txCount === 0) {
    throw { status: 404, message: "Address has no transactions" };
  }

  // 2. Get transaction list (Esplora returns newest first, 25 per page)
  // First call gets the most recent txs
  const txRes = await fetch(`${base}/address/${address}/txs`, {
    signal: AbortSignal.timeout(12000),
  });

  if (!txRes.ok) throw { status: 500, message: "Could not load transactions" };

  const txs = await txRes.json();

  // Most recent tx
  const newestTx = txs[0];
  const lastActivityTimestamp = newestTx?.status?.block_time || null;

  // 3. Get oldest transaction
  // Esplora paginates with txs/chain/{last_txid} — we need to walk to the end
  // For efficiency, if we have <= 25 txs, the oldest is in this first batch
  let oldestTimestamp = null;

  if (txs.length > 0) {
    // Check if all txs fit in one page
    if (txCount <= 25) {
      const oldest = txs[txs.length - 1];
      oldestTimestamp = oldest?.status?.block_time || null;
    } else {
      // Need to paginate to find the oldest tx
      // Walk through pages (max 10 pages = 250 txs to avoid timeout)
      let currentTxs = txs;
      let lastTxid = currentTxs[currentTxs.length - 1]?.txid;
      let pages = 0;
      const maxPages = 15;

      while (currentTxs.length === 25 && pages < maxPages && lastTxid) {
        try {
          const nextRes = await fetch(
            `${base}/address/${address}/txs/chain/${lastTxid}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (!nextRes.ok) break;

          currentTxs = await nextRes.json();
          if (currentTxs.length > 0) {
            lastTxid = currentTxs[currentTxs.length - 1]?.txid;
          }
          pages++;
        } catch {
          break;
        }
      }

      // The last tx in the last page is the oldest
      if (currentTxs.length > 0) {
        oldestTimestamp = currentTxs[currentTxs.length - 1]?.status?.block_time || null;
      }
    }
  }

  // If we couldn't paginate all the way, use what we have
  // (for wallets with 375+ txs that we couldn't fully traverse)
  if (!oldestTimestamp && txs.length > 0) {
    // Use the oldest from our first batch as a minimum estimate
    oldestTimestamp = txs[txs.length - 1]?.status?.block_time || null;
  }

  if (!oldestTimestamp) {
    throw { status: 500, message: "Could not determine first transaction date" };
  }

  return {
    totalReceived,
    totalSent,
    currentBalance,
    txCount,
    firstReceiveTimestamp: oldestTimestamp,
    lastActivityTimestamp,
  };
}

// ========== BLOCKCHAIN.INFO (Fallback) ==========
async function lookupBlockchainInfo(address) {
  const res = await fetch(
    `https://blockchain.info/rawaddr/${address}?limit=1`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!res.ok) {
    throw { status: res.status, message: "Blockchain API error" };
  }

  const data = await res.json();

  const totalReceived = data.total_received / 1e8;
  const totalSent = data.total_sent / 1e8;
  const currentBalance = data.final_balance / 1e8;
  const txCount = data.n_tx;

  if (txCount === 0) {
    throw { status: 404, message: "Address has no transactions" };
  }

  const lastActivityTimestamp = data.txs?.[0]?.time || null;

  // Get oldest tx
  let firstReceiveTimestamp = null;

  if (txCount === 1) {
    firstReceiveTimestamp = data.txs[0].time;
  } else {
    try {
      const oldRes = await fetch(
        `https://blockchain.info/rawaddr/${address}?limit=1&offset=${Math.max(0, txCount - 1)}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
        }
      );
      if (oldRes.ok) {
        const oldData = await oldRes.json();
        if (oldData.txs?.length > 0) {
          firstReceiveTimestamp = oldData.txs[0].time;
        }
      }
    } catch {}
  }

  if (!firstReceiveTimestamp) {
    throw { status: 500, message: "Could not determine first transaction date" };
  }

  return {
    totalReceived,
    totalSent,
    currentBalance,
    txCount,
    firstReceiveTimestamp,
    lastActivityTimestamp,
  };
}

// ========== MAIN HANDLER ==========
export async function POST(request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    const cleaned = address.trim();

    // Validate BTC address (legacy 1..., P2SH 3..., segwit bc1q..., taproot bc1p...)
    const btcRegex = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!btcRegex.test(cleaned)) {
      return Response.json(
        { error: "Invalid Bitcoin address format" },
        { status: 400 }
      );
    }

    // Try Blockstream first, fall back to blockchain.info
    let walletData;
    try {
      walletData = await lookupBlockstream(cleaned);
    } catch (blockstreamErr) {
      // If Blockstream fails, try blockchain.info
      try {
        walletData = await lookupBlockchainInfo(cleaned);
      } catch (fallbackErr) {
        // Both failed — return the most useful error
        const err = blockstreamErr?.message || fallbackErr?.message || "Could not look up address";
        const status = blockstreamErr?.status || fallbackErr?.status || 500;
        return Response.json({ error: err }, { status: status === 404 ? 404 : 500 });
      }
    }

    const {
      totalReceived,
      totalSent,
      currentBalance,
      txCount,
      firstReceiveTimestamp,
      lastActivityTimestamp,
    } = walletData;

    const firstReceiveDate = new Date(firstReceiveTimestamp * 1000).toISOString();
    const lastActivityDate = lastActivityTimestamp
      ? new Date(lastActivityTimestamp * 1000).toISOString()
      : firstReceiveDate;

    const holdDays = Math.floor(
      (new Date() - new Date(firstReceiveDate)) / (1000 * 60 * 60 * 24)
    );

    const everSold = totalSent > 0;

    // Get BTC price
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
