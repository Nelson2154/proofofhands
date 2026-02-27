import "./globals.css";

export const metadata = {
  title: "Proof of Hands — Did You Sell?",
  description:
    "Paste any Bitcoin wallet address. The blockchain doesn't lie. Get a verified badge proving your holding conviction — or your paper hands shame.",
  keywords: ["bitcoin", "diamond hands", "hodl", "proof", "blockchain", "crypto", "wallet", "paper hands"],
  openGraph: {
    title: "Proof of Hands — Did You Sell?",
    description:
      "Paste any BTC address. The blockchain doesn't lie. Diamond hands or paper hands — find out.",
    url: "https://proofofhands.com",
    siteName: "Proof of Hands",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Proof of Hands — Did You Sell?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proof of Hands — Did You Sell?",
    description: "Paste any BTC address. The blockchain doesn't lie.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
