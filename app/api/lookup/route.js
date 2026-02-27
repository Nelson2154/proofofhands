// /app/api/lookup/route.js
// Three API sources with fallback chain:
//   1. mempool.space (primary) — same format as Blockstream, better uptime
//   2. Blockstream Esplora (fallback)
//   3. Blockchair (fallback for wallet summary + first_seen)
//   4. blockchain.info (price ticker + last resort for oldest tx)

export const runtime = "edge";

// Genesis coinbase: 50 BTC mined in block 0 is unspendable and excluded
// from Blockstream/mempool UTXO sets. Add it back for display accuracy.
const GENESIS_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const GENESIS_COINBASE_BTC = 50;
const GENESIS_TIMESTAMP = 1231006505; // Jan 3, 2009 18:15:05 UTC

export async function POST(request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    const cleaned = address.trim();

    // ===== ADDRESS VALIDATION =====
    // Permissive check: starts with 1, 3, or bc1, reasonable length.
    // The actual blockchain API will reject truly invalid addresses.
    const isLegacy = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(cleaned);
    const isBech32 = /^bc1[a-z0-9]{6,87}$/.test(cleaned);
    if (!isLegacy && !isBech32) {
      return Response.json(
        { error: "Invalid Bitcoin address format" },
        { status: 400 }
      );
    }

    // ===== STEP 1: WALLET SUMMARY =====
    // Try mempool.space first, then Blockstream, then Blockchair
    let stats = null;
    let txsSource = null;

    // --- Try mempool.space ---
    try {
      const res = await fetch(
        `https://mempool.space/api/address/${cleaned}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        stats = data.chain_stats;
        txsSource = "mempool";
      }
    } catch {}

    // --- Try Blockstream ---
    if (!stats) {
      try {
        const res = await fetch(
          `https://blockstream.info/api/address/${cleaned}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          const data = await res.json();
          stats = data.chain_stats;
          txsSource = "blockstream";
        }
      } catch {}
    }

    // --- Try Blockchair ---
    if (!stats) {
      try {
        const res = await fetch(
          `https://api.blockchair.com/bitcoin/dashboards/address/${cleaned}?limit=0`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          const data = await res.json();
          const info = data?.data?.[cleaned]?.address;
          if (info) {
            // Blockchair received/spent are already in satoshis
            stats = {
              funded_txo_sum: info.received,
              spent_txo_sum: info.spent,
              tx_count: info.transaction_count,
            };
            txsSource = "blockchair";
          }
        }
      } catch {}
    }

    if (!stats) {
      return Response.json(
        { error: "Could not look up this address. All APIs failed. Try again." },
        { status: 502 }
      );
    }

    let totalReceived = stats.funded_txo_sum / 1e8;
    let totalSent = stats.spent_txo_sum / 1e8;
    let currentBalance = (stats.funded_txo_sum - stats.spent_txo_sum) / 1e8;
    const txCount = stats.tx_count;

    // Genesis address: add the unspendable 50 BTC coinbase reward
    if (cleaned === GENESIS_ADDRESS) {
      totalReceived += GENESIS_COINBASE_BTC;
      currentBalance += GENESIS_COINBASE_BTC;
    }

    if (txCount === 0) {
      return Response.json(
        { error: "Address has no transactions" },
        { status: 404 }
      );
    }

    const everSold = totalSent > 0;

    // ===== STEP 2: SCAN RECENT TXS FOR lastSold =====
    // Find the most recent tx where this address is a SENDER (appears in vin).
    let lastSold = null;

    if (everSold) {
      const txBaseUrl =
        txsSource === "blockstream"
          ? "https://blockstream.info/api/address"
          : "https://mempool.space/api/address";

      let recentTxs = [];
      try {
        const res = await fetch(
          `${txBaseUrl}/${cleaned}/txs`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          recentTxs = await res.json();
        }
      } catch {}

      // Scan for outgoing tx
      for (const tx of recentTxs) {
        const isOutgoing = tx.vin?.some(
          (input) => input.prevout?.scriptpubkey_address === cleaned
        );
        if (isOutgoing && tx.status?.block_time) {
          lastSold = new Date(tx.status.block_time * 1000).toISOString();
          break;
        }
      }

      // If not found in first 25, check next page
      if (!lastSold && recentTxs.length === 25) {
        const lastTxid = recentTxs[recentTxs.length - 1]?.txid;
        if (lastTxid) {
          try {
            const res = await fetch(
              `${txBaseUrl}/${cleaned}/txs/chain/${lastTxid}`,
              { signal: AbortSignal.timeout(8000) }
            );
            if (res.ok) {
              const page2 = await res.json();
              for (const tx of page2) {
                const isOutgoing = tx.vin?.some(
                  (input) => input.prevout?.scriptpubkey_address === cleaned
                );
                if (isOutgoing && tx.status?.block_time) {
                  lastSold = new Date(tx.status.block_time * 1000).toISOString();
                  break;
                }
              }
            }
          } catch {}
        }
      }
    }

    // ===== STEP 3: OLDEST TX TIMESTAMP =====
    let firstReceiveTimestamp =
      cleaned === GENESIS_ADDRESS ? GENESIS_TIMESTAMP : null;

    // Approach A: Blockchair first_seen_receiving
    if (!firstReceiveTimestamp) {
      try {
        const res = await fetch(
          `https://api.blockchair.com/bitcoin/dashboards/address/${cleaned}?limit=0`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          const data = await res.json();
          const info = data?.data?.[cleaned]?.address;
          if (info?.first_seen_receiving) {
            firstReceiveTimestamp = Math.floor(
              new Date(info.first_seen_receiving).getTime() / 1000
            );
          }
        }
      } catch {}
    }

    // Approach B: Paginate mempool/blockstream (works for wallets < 250 txs)
    if (!firstReceiveTimestamp) {
      const txBaseUrl =
        txsSource === "blockstream"
          ? "https://blockstream.info/api/address"
          : "https://mempool.space/api/address";

      try {
        const res = await fetch(
          `${txBaseUrl}/${cleaned}/txs`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          let txs = await res.json();
          let lastTxid = txs[txs.length - 1]?.txid;
          let pages = 0;

          while (txs.length === 25 && pages < 10 && lastTxid) {
            try {
              const nextRes = await fetch(
                `${txBaseUrl}/${cleaned}/txs/chain/${lastTxid}`,
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

    // Approach C: blockchain.info offset query
    if (!firstReceiveTimestamp) {
      try {
        const res = await fetch(
          `https://blockchain.info/rawaddr/${cleaned}?limit=1&offset=${Math.max(0, txCount - 1)}`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(12000),
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.txs?.length > 0) {
            firstReceiveTimestamp = data.txs[0].time;
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

    const firstReceiveDate = new Date(
      firstReceiveTimestamp * 1000
    ).toISOString();

    const holdDays = Math.floor(
      (new Date() - new Date(firstReceiveDate)) / (1000 * 60 * 60 * 24)
    );

    // ===== STEP 4: BTC PRICE =====
    let btcPrice = 84712;
    try {
      const res = await fetch("https://blockchain.info/ticker", {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        btcPrice = data.USD?.last || btcPrice;
      }
    } catch {}

    return Response.json({
      address: cleaned,
      firstReceive: firstReceiveDate,
      lastSold,
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
