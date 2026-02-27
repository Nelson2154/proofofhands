// /app/api/lookup/route.js
// Serverless function that queries blockchain.info public API
// No API key needed — completely free

export const runtime = "edge";

export async function POST(request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    // Clean and validate BTC address format
    const cleaned = address.trim();
    const btcRegex = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!btcRegex.test(cleaned)) {
      return Response.json(
        { error: "Invalid Bitcoin address format" },
        { status: 400 }
      );
    }

    // Fetch wallet data from blockchain.info (free, no key)
    const res = await fetch(
      `https://blockchain.info/rawaddr/${cleaned}?limit=0`,
      {
        headers: { Accept: "application/json" },
        // 10 second timeout
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return Response.json(
          { error: "Address not found on blockchain" },
          { status: 404 }
        );
      }
      return Response.json(
        { error: "Blockchain API error. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Parse transaction data
    const totalReceived = data.total_received / 1e8; // satoshis to BTC
    const totalSent = data.total_sent / 1e8;
    const currentBalance = data.final_balance / 1e8;
    const txCount = data.n_tx;

    if (txCount === 0) {
      return Response.json(
        { error: "Address has no transactions" },
        { status: 404 }
      );
    }

    // We need to fetch the actual transactions to find first receive date
    // blockchain.info returns txs in reverse chronological order
    // We need the oldest tx, so fetch with offset to get the last page
    let firstReceiveTimestamp = null;
    let lastActivityTimestamp = null;

    // Get newest tx timestamp (first in the array)
    // and get oldest by fetching with offset
    const txRes = await fetch(
      `https://blockchain.info/rawaddr/${cleaned}?limit=1&offset=${Math.max(0, txCount - 1)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (txRes.ok) {
      const txData = await txRes.json();
      if (txData.txs && txData.txs.length > 0) {
        // This is the oldest transaction
        firstReceiveTimestamp = txData.txs[0].time;
      }
    }

    // Get most recent transaction
    const recentRes = await fetch(
      `https://blockchain.info/rawaddr/${cleaned}?limit=1&offset=0`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (recentRes.ok) {
      const recentData = await recentRes.json();
      if (recentData.txs && recentData.txs.length > 0) {
        lastActivityTimestamp = recentData.txs[0].time;
      }
    }

    // Fallback: if we couldn't get timestamps, use a rough estimate
    if (!firstReceiveTimestamp) {
      // Can't determine hold duration without tx timestamps
      return Response.json(
        { error: "Could not determine transaction history" },
        { status: 500 }
      );
    }

    const firstReceiveDate = new Date(firstReceiveTimestamp * 1000).toISOString();
    const lastActivityDate = lastActivityTimestamp
      ? new Date(lastActivityTimestamp * 1000).toISOString()
      : firstReceiveDate;

    // Calculate days held
    const now = new Date();
    const firstDate = new Date(firstReceiveDate);
    const holdDays = Math.floor((now - firstDate) / (1000 * 60 * 60 * 24));

    // Determine if they ever sold (sent BTC out)
    const everSold = totalSent > 0;

    // Fetch current BTC price
    let btcPrice = 67994; // fallback
    try {
      const priceRes = await fetch(
        "https://blockchain.info/ticker",
        { signal: AbortSignal.timeout(5000) }
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        btcPrice = priceData.USD?.last || btcPrice;
      }
    } catch {
      // Use fallback price
    }

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
        { error: "Blockchain API timed out. Try again." },
        { status: 504 }
      );
    }

    return Response.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
