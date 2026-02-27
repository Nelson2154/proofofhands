# Proof of Hands

**Blockchain Verified Diamond Hands** — [proofofhands.com](https://proofofhands.com)

Paste any Bitcoin wallet address. We scan the blockchain and generate a verified badge proving your holding conviction.

## Stack

- **Next.js 14** (App Router, Edge Runtime)
- **Blockchain.info API** (free, no key needed)
- **html-to-image** (badge screenshot export)
- **Vercel** (deploy target)

## Deploy

```bash
# 1. Clone and install
git clone <repo>
cd proofofhands
npm install

# 2. Run locally
npm run dev

# 3. Deploy to Vercel
vercel --prod
```

No environment variables needed. No database. No auth.

## Before you deploy

1. Replace `bc1qYOUR_BTC_ADDRESS_HERE` in `app/page.js` (DonatePanel component) with your actual BTC donation address
2. Add an `og.png` (1200x630) to the `/public` folder for social sharing previews
3. Add a `favicon.ico` to `/public`

## How it works

1. User pastes a BTC address
2. Edge function calls `blockchain.info/rawaddr/{address}` (free, no API key)
3. Parses: first tx date, total received, total sent, balance, tx count
4. If `total_sent > 0` → Paper Hands. If never sent → Diamond Hands.
5. Hold duration (days since first receive) determines rank tier
6. Generates shareable badge card with rank, days, balance, and verification

## Rank System

| Rank | Requirement |
|------|-------------|
| 💎 OBSIDIAN DIAMOND | 2000+ days, never sold |
| 💎💎💎 TRIPLE DIAMOND | 1500+ days, never sold |
| 💎💎 DOUBLE DIAMOND | 1000+ days, never sold |
| 💎 DIAMOND HANDS | 365+ days, never sold |
| 🤝 IRON HANDS | 90+ days, never sold |
| 🫶 FRESH HANDS | Under 90 days |
| 🧻 PAPER HANDS | Sent BTC at any point |

## NG Technologies
