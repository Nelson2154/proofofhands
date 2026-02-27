import "./globals.css";

export const metadata = {
  title: "Proof of Hands — Blockchain Verified Diamond Hands",
  description:
    "Paste any Bitcoin wallet address. We scan the blockchain and generate a verified badge proving your holding conviction. No login. No wallet connection. Just proof.",
  keywords: ["bitcoin", "diamond hands", "hodl", "proof", "blockchain", "crypto", "wallet"],
  openGraph: {
    title: "Proof of Hands — Blockchain Verified Diamond Hands",
    description:
      "Paste any BTC address. Get a verified badge proving how long you've held without selling. Blockchain proof, not a claim.",
    url: "https://proofofhands.com",
    siteName: "Proof of Hands",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Proof of Hands — Diamond Hands Verified",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proof of Hands — Blockchain Verified Diamond Hands",
    description: "Paste any BTC address. Get a verified holding badge. No login needed.",
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
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Geist+Mono:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
