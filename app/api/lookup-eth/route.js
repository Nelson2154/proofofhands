export const runtime = "edge";

const TOKENS = {
  PEPE: { contract: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", decimals: 18, coingeckoId: "pepe" },
  SHIB: { contract: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18, coingeckoId: "shiba-inu" },
  FLOKI: { contract: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", decimals: 9, coingeckoId: "floki" },
  TRUMP: { contract: "0x576e2BeD8F7b46D34016198911Cdf9886f78bea7", decimals: 9, coingeckoId: "maga" },
};

export async function POST(request) {
  try {
    const { address, token } = await request.json();

    if (!address || typeof address !== "string") {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    const cleaned = address.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(cleaned)) {
      return Response.json({ error: "Invalid Ethereum address" }, { status: 400 });
    }

    const tokenInfo = TOKENS[token];
    if (!tokenInfo) {
      return Response.json({ error: "Unsupported token" }, { status: 400 });
    }

    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Etherscan API key not configured" }, { status: 500 });
    }

    // ===== STEP 1: Get all token transfers for this wallet + token =====
    let transfers = [];
    try {
      const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${tokenInfo.contract}&address=${cleaned}&page=1&offset=10000&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "1" && Array.isArray(data.result)) {
          transfers = data.result;
        }
      }
    } catch {}

    if (transfers.length === 0) {
      return Response.json({ error: `No ${token} activity found for this address` }, { status: 404 });
    }

    // ===== STEP 2: Compute stats =====
    let totalReceived = 0n;
    let totalSent = 0n;
    let firstReceiveTimestamp = null;
    let lastSoldTimestamp = null;

    for (const tx of transfers) {
      const val = BigInt(tx.value || "0");
      const isIncoming = tx.to.toLowerCase() === cleaned;
      const isOutgoing = tx.from.toLowerCase() === cleaned;

      if (isIncoming) {
        totalReceived += val;
        if (!firstReceiveTimestamp) {
          firstReceiveTimestamp = parseInt(tx.timeStamp);
        }
      }

      if (isOutgoing) {
        totalSent += val;
        const ts = parseInt(tx.timeStamp);
        if (!lastSoldTimestamp || ts > lastSoldTimestamp) {
          lastSoldTimestamp = ts;
        }
      }
    }

    if (!firstReceiveTimestamp) {
      return Response.json({ error: `No incoming ${token} transfers found` }, { status: 404 });
    }

    const decimals = BigInt(10) ** BigInt(tokenInfo.decimals);
    const receivedFloat = Number(totalReceived) / Number(decimals);
    const sentFloat = Number(totalSent) / Number(decimals);
    const balanceFloat = receivedFloat - sentFloat;
    const everSold = totalSent > 0n;

    // ===== STEP 3: Get current balance (more accurate) =====
    let currentBalance = balanceFloat;
    try {
      const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${tokenInfo.contract}&address=${cleaned}&tag=latest&apikey=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "1" && data.result) {
          currentBalance = Number(BigInt(data.result)) / Number(decimals);
        }
      }
    } catch {}

    // ===== STEP 4: Get token price =====
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

    const firstReceiveDate = new Date(firstReceiveTimestamp * 1000).toISOString();
    const holdDays = Math.floor((Date.now() - firstReceiveTimestamp * 1000) / 864e5);

    return Response.json({
      address: cleaned,
      chain: "eth",
      token,
      firstReceive: firstReceiveDate,
      lastSold: lastSoldTimestamp ? new Date(lastSoldTimestamp * 1000).toISOString() : null,
      totalReceived: receivedFloat,
      totalSent: sentFloat,
      currentBalance,
      txCount: transfers.length,
      holdDays,
      everSold,
      tokenPrice,
    });
  } catch (err) {
    console.error("ETH lookup error:", err);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
