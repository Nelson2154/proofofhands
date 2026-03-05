export const runtime = "edge";

const TOKENS = {
  BONK: { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5, coingeckoId: "bonk" },
  WIF: { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", decimals: 6, coingeckoId: "dogwifcoin" },
  TRUMP: { mint: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", decimals: 6, coingeckoId: "official-trump" },
  POPCAT: { mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", decimals: 9, coingeckoId: "popcat" },
  FARTCOIN: { mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", decimals: 6, coingeckoId: "fartcoin" },
};

export async function POST(request) {
  try {
    const { address, token } = await request.json();

    if (!address || typeof address !== "string") {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    const cleaned = address.trim();
    // Basic Solana address validation (base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleaned)) {
      return Response.json({ error: "Invalid Solana address" }, { status: 400 });
    }

    const tokenInfo = TOKENS[token];
    if (!tokenInfo) {
      return Response.json({ error: "Unsupported token" }, { status: 400 });
    }

    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Helius API key not configured" }, { status: 500 });
    }

    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    // ===== STEP 1: Get current token balance =====
    let currentBalance = 0;
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            cleaned,
            { mint: tokenInfo.mint },
            { encoding: "jsonParsed" },
          ],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const accounts = data?.result?.value || [];
        for (const acct of accounts) {
          const info = acct.account?.data?.parsed?.info;
          if (info?.mint === tokenInfo.mint) {
            currentBalance = info.tokenAmount?.uiAmount || 0;
          }
        }
      }
    } catch {}

    // ===== STEP 2: Get transaction history via Helius Enhanced API =====
    let txs = [];
    try {
      const url = `https://api.helius.xyz/v0/addresses/${cleaned}/transactions?api-key=${apiKey}&type=TRANSFER`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        txs = await res.json();
      }
    } catch {}

    // Filter to only this token's transfers
    let firstReceiveTimestamp = null;
    let lastSoldTimestamp = null;
    let everSold = false;
    let totalReceived = 0;
    let totalSent = 0;
    let txCount = 0;

    for (const tx of txs) {
      if (!tx.tokenTransfers) continue;

      for (const transfer of tx.tokenTransfers) {
        if (transfer.mint !== tokenInfo.mint) continue;
        txCount++;

        const amount = transfer.tokenAmount || 0;
        const ts = tx.timestamp;

        // Incoming
        if (transfer.toUserAccount === cleaned) {
          totalReceived += amount;
          if (!firstReceiveTimestamp || ts < firstReceiveTimestamp) {
            firstReceiveTimestamp = ts;
          }
        }

        // Outgoing
        if (transfer.fromUserAccount === cleaned) {
          totalSent += amount;
          everSold = true;
          if (!lastSoldTimestamp || ts > lastSoldTimestamp) {
            lastSoldTimestamp = ts;
          }
        }
      }
    }

    // If no transfers found but has balance, try paginating
    if (txCount === 0 && currentBalance === 0) {
      return Response.json({ error: `No ${token} activity found for this address` }, { status: 404 });
    }

    // If has balance but no transfer history found (API pagination limit)
    if (txCount === 0 && currentBalance > 0) {
      // We know they hold it but can't see history
      firstReceiveTimestamp = null;
    }

    // ===== STEP 3: Get token price =====
    let tokenPrice = 0;
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenInfo.coingeckoId}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        tokenPrice = data[tokenInfo.coingeckoId]?.usd || 0;
      }
    } catch {}

    const firstReceiveDate = firstReceiveTimestamp
      ? new Date(firstReceiveTimestamp * 1000).toISOString()
      : null;
    const holdDays = firstReceiveTimestamp
      ? Math.floor((Date.now() - firstReceiveTimestamp * 1000) / 864e5)
      : 0;

    return Response.json({
      address: cleaned,
      chain: "sol",
      token,
      firstReceive: firstReceiveDate,
      lastSold: lastSoldTimestamp ? new Date(lastSoldTimestamp * 1000).toISOString() : null,
      totalReceived,
      totalSent,
      currentBalance,
      txCount,
      holdDays,
      everSold,
      tokenPrice,
    });
  } catch (err) {
    console.error("SOL lookup error:", err);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
