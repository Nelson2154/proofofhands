"use client";

import { useState, useRef, useCallback } from "react";

// ==================== RANK SYSTEM ====================
function getRank(holdDays, everSold) {
  if (everSold)
    return {
      rank: "PAPER HANDS",
      emoji: "🧻",
      color: "var(--paper)",
      tier: 0,
    };
  if (holdDays >= 2000)
    return {
      rank: "OBSIDIAN DIAMOND",
      emoji: "💎",
      color: "var(--obsidian)",
      tier: 6,
    };
  if (holdDays >= 1500)
    return {
      rank: "TRIPLE DIAMOND",
      emoji: "💎💎💎",
      color: "var(--triple)",
      tier: 5,
    };
  if (holdDays >= 1000)
    return {
      rank: "DOUBLE DIAMOND",
      emoji: "💎💎",
      color: "var(--double)",
      tier: 4,
    };
  if (holdDays >= 365)
    return {
      rank: "DIAMOND HANDS",
      emoji: "💎",
      color: "var(--diamond)",
      tier: 3,
    };
  if (holdDays >= 90)
    return {
      rank: "IRON HANDS",
      emoji: "🤝",
      color: "var(--iron)",
      tier: 2,
    };
  return {
    rank: "FRESH HANDS",
    emoji: "🫶",
    color: "var(--fresh)",
    tier: 1,
  };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function shortAddr(addr) {
  if (addr.length <= 20) return addr;
  return addr.slice(0, 10) + "···" + addr.slice(-8);
}

// ==================== DIAMOND CARD ====================
function DiamondCard({ data, cardRef, hideBalance }) {
  const rank = getRank(data.holdDays, data.everSold);
  const value = (data.currentBalance * data.btcPrice).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const masked = "••••••";

  return (
    <div
      ref={cardRef}
      className="animate-card-reveal"
      style={{
        background: "linear-gradient(155deg, #07070d 0%, #0b0b18 45%, #08080f 100%)",
        border: `1px solid color-mix(in srgb, ${rank.color} 12%, transparent)`,
        borderRadius: 18,
        overflow: "hidden",
        maxWidth: 500,
        width: "100%",
        position: "relative",
        boxShadow: `0 0 80px color-mix(in srgb, ${rank.color} 6%, transparent), 0 25px 60px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Top accent */}
      <div
        style={{
          height: 2,
          background: `linear-gradient(90deg, transparent 5%, ${rank.color}, transparent 95%)`,
          opacity: 0.5,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "28px 32px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            BLOCKCHAIN VERIFIED
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              fontWeight: 700,
              color: rank.color,
              lineHeight: 1,
              letterSpacing: "0.01em",
              textShadow: `0 0 40px color-mix(in srgb, ${rank.color} 25%, transparent)`,
            }}
          >
            {rank.rank}
          </div>
        </div>
        <div
          style={{
            fontSize: 44,
            lineHeight: 1,
            filter: data.everSold ? "grayscale(1)" : "none",
            animation: data.everSold ? "none" : "diamondFloat 4s ease-in-out infinite",
          }}
        >
          {rank.emoji}
        </div>
      </div>

      {/* Big number */}
      <div style={{ padding: "28px 32px", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 80,
            fontWeight: 900,
            color: "var(--text-primary)",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            textShadow: `0 0 60px color-mix(in srgb, ${rank.color} 15%, transparent)`,
          }}
        >
          {data.holdDays.toLocaleString()}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.2em",
            marginTop: 6,
          }}
        >
          {data.everSold ? "DAYS SINCE FIRST BUY" : "DAYS WITHOUT SELLING"}
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "var(--border-subtle)",
          margin: "0 24px",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {[
          {
            label: "HOLDING SINCE",
            value: formatDate(data.firstReceive),
            color: "var(--text-primary)",
          },
          {
            label: "BALANCE",
            value: hideBalance ? masked : `${data.currentBalance.toFixed(4)} BTC`,
            color: "var(--text-primary)",
          },
          {
            label: "CURRENT VALUE",
            value: hideBalance ? masked : `$${value}`,
            color: "var(--green)",
          },
          {
            label: data.everSold ? "STATUS" : "TRANSACTIONS",
            value: data.everSold ? "SOLD SOME" : `${data.txCount} verified`,
            color: data.everSold ? "var(--red)" : "var(--text-secondary)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--bg-card)",
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "0.15em",
                marginBottom: 6,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 700,
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Never sold badge */}
      <div
        style={{
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
          }}
        >
          {data.txCount} on-chain transactions scanned
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 4,
            color: data.everSold ? "var(--red)" : "var(--green)",
            background: data.everSold
              ? "rgba(248,113,113,0.06)"
              : "rgba(74,222,128,0.06)",
            border: `1px solid ${
              data.everSold
                ? "rgba(248,113,113,0.12)"
                : "rgba(74,222,128,0.12)"
            }`,
          }}
        >
          {data.everSold ? "📄 PAPER" : "✅ NEVER SOLD"}
        </div>
      </div>

      {/* Address */}
      <div
        style={{
          padding: "12px 32px",
          borderTop: "1px solid var(--border-subtle)",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-ghost)",
            wordBreak: "break-all",
            textAlign: "center",
          }}
        >
          {hideBalance ? data.address.slice(0, 6) + "····················" + data.address.slice(-4) : data.address}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 32px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            color: "var(--text-ghost)",
            letterSpacing: "0.12em",
          }}
        >
          proofofhands.com
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text-ghost)",
          }}
        >
          {new Date().toLocaleDateString()} · BTC $
          {data.btcPrice.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ==================== RANK LEGEND ====================
const RANKS = [
  {
    name: "OBSIDIAN DIAMOND",
    req: "2000+ days · Never sold",
    emoji: "💎",
    color: "var(--obsidian)",
  },
  {
    name: "TRIPLE DIAMOND",
    req: "1500+ days · Never sold",
    emoji: "💎💎💎",
    color: "var(--triple)",
  },
  {
    name: "DOUBLE DIAMOND",
    req: "1000+ days · Never sold",
    emoji: "💎💎",
    color: "var(--double)",
  },
  {
    name: "DIAMOND HANDS",
    req: "365+ days · Never sold",
    emoji: "💎",
    color: "var(--diamond)",
  },
  {
    name: "IRON HANDS",
    req: "90+ days · Never sold",
    emoji: "🤝",
    color: "var(--iron)",
  },
  {
    name: "FRESH HANDS",
    req: "Under 90 days",
    emoji: "🫶",
    color: "var(--fresh)",
  },
  {
    name: "PAPER HANDS",
    req: "Sold at any point",
    emoji: "🧻",
    color: "var(--paper)",
  },
];

function RankLegend() {
  return (
    <div
      className="animate-fade-up delay-4"
      style={{
        background:
          "linear-gradient(155deg, var(--bg-card) 0%, var(--bg-elevated) 100%)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 24,
        maxWidth: 500,
        width: "100%",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-muted)",
          letterSpacing: "0.2em",
          marginBottom: 18,
        }}
      >
        RANK SYSTEM
      </div>
      {RANKS.map((r, i) => (
        <div
          key={r.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 0",
            borderBottom:
              i < RANKS.length - 1
                ? "1px solid var(--border-subtle)"
                : "none",
          }}
        >
          <span style={{ fontSize: 20, width: 40, textAlign: "center" }}>
            {r.emoji}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 700,
                color: r.color,
              }}
            >
              {r.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {r.req}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== SHARE BUTTONS ====================
function ShareButtons({ data, cardRef }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const rank = getRank(data.holdDays, data.everSold);

  const shareText = data.everSold
    ? `I've been in Bitcoin since ${formatDate(data.firstReceive)}. ${data.holdDays.toLocaleString()} days. Check yours:`
    : `💎 ${rank.rank} — Holding Bitcoin for ${data.holdDays.toLocaleString()} days without selling. Blockchain verified.`;

  const shareUrl = "https://proofofhands.com";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      // Dynamic import html-to-image
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#040406",
      });
      const link = document.createElement("a");
      link.download = `proofofhands-${shortAddr(data.address)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to save image:", err);
    }
    setSaving(false);
  };

  const btnStyle = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "12px 20px",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div
      className="animate-fade-up delay-3"
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <button
        onClick={handleCopyLink}
        style={btnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(74,222,128,0.3)";
          e.currentTarget.style.color = "var(--green)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        {copied ? "✓ COPIED" : "📋 COPY"}
      </button>
      <button
        onClick={handleTwitterShare}
        style={btnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(29,155,240,0.3)";
          e.currentTarget.style.color = "#1d9bf0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        𝕏 SHARE
      </button>
      <button
        onClick={handleSaveImage}
        disabled={saving}
        style={{
          ...btnStyle,
          opacity: saving ? 0.5 : 1,
          cursor: saving ? "wait" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!saving) {
            e.currentTarget.style.borderColor = "rgba(196,181,253,0.3)";
            e.currentTarget.style.color = "var(--obsidian)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        {saving ? "⏳ SAVING..." : "📸 SAVE IMAGE"}
      </button>
    </div>
  );
}

// ==================== DONATE PANEL ====================
function DonatePanel({ show }) {
  if (!show) return null;

  // REPLACE with your actual BTC address
  const BTC_DONATE_ADDRESS = "bc1qfcc508fy9f356dnej980kv0pfemqd7lrtcharj";

  return (
    <div
      style={{
        maxWidth: 540,
        width: "100%",
        animation: "fadeUp 0.3s ease-out",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(247,147,26,0.04) 0%, var(--bg-card) 100%)",
          border: "1px solid rgba(247,147,26,0.12)",
          borderRadius: 12,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--btc)",
            marginBottom: 12,
          }}
        >
          Support Proof of Hands
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--btc)",
            padding: "12px 16px",
            background: "rgba(247,147,26,0.04)",
            border: "1px solid rgba(247,147,26,0.08)",
            borderRadius: 8,
            wordBreak: "break-all",
            userSelect: "all",
            cursor: "text",
          }}
        >
          {BTC_DONATE_ADDRESS}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text-muted)",
            marginTop: 10,
            letterSpacing: "0.05em",
          }}
        >
          Free forever · BTC donations keep it running · No ads, no tracking
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function Home() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDonate, setShowDonate] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const cardRef = useRef(null);

  const handleLookup = useCallback(async () => {
    const addr = address.trim();
    if (!addr) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  return (
    <>
      {/* Noise texture */}
      <div className="bg-noise" />

      {/* Ambient floating diamonds */}
      <div
        style={{
          position: "fixed",
          top: "12%",
          left: "6%",
          fontSize: 140,
          opacity: 0.012,
          animation: "diamondFloat 9s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        💎
      </div>
      <div
        style={{
          position: "fixed",
          bottom: "18%",
          right: "8%",
          fontSize: 90,
          opacity: 0.008,
          animation: "diamondFloat 12s ease-in-out infinite 3s",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        💎
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        {/* ===== HEADER ===== */}
        <header
          style={{
            width: "100%",
            padding: "20px 28px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 540,
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "0.01em",
                }}
              >
                Proof of Hands
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--text-ghost)",
                  letterSpacing: "0.15em",
                  marginTop: 1,
                }}
              >
                BLOCKCHAIN VERIFIED CONVICTION
              </div>
            </div>
            <button
              onClick={() => setShowDonate((p) => !p)}
              style={{
                background: "rgba(247,147,26,0.04)",
                border: "1px solid rgba(247,147,26,0.15)",
                borderRadius: 8,
                padding: "8px 16px",
                color: "var(--btc)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(247,147,26,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(247,147,26,0.04)")
              }
            >
              ₿ TIP SATS
            </button>
          </div>
        </header>

        {/* Donate panel */}
        <div style={{ maxWidth: 540, width: "100%", padding: "0 28px" }}>
          {showDonate && (
            <div style={{ marginTop: 16 }}>
              <DonatePanel show={showDonate} />
            </div>
          )}
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <main
          style={{
            maxWidth: 540,
            width: "100%",
            padding: "48px 28px 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Hero */}
          <div
            className="animate-fade-up"
            style={{ textAlign: "center", marginBottom: 44 }}
          >
            <div
              style={{
                fontSize: 52,
                marginBottom: 16,
                animation: "diamondFloat 4s ease-in-out infinite",
              }}
            >
              💎
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 42,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.05,
                marginBottom: 16,
                letterSpacing: "-0.01em",
              }}
            >
              Prove Your
              <br />
              Diamond Hands
            </h1>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 15,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              Paste any Bitcoin address. We scan the blockchain and generate a
              verified badge of your holding conviction. No login. No wallet
              connection.
            </p>
          </div>

          {/* Input */}
          <div
            className="animate-fade-up delay-2"
            style={{ width: "100%", marginBottom: 36 }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder="Paste BTC wallet address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                style={{
                  flex: 1,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  outline: "none",
                  transition: "border-color 0.25s ease",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(196,181,253,0.25)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border)")
                }
              />
              <button
                onClick={handleLookup}
                disabled={loading || !address.trim()}
                style={{
                  background: loading
                    ? "linear-gradient(90deg, rgba(196,181,253,0.15), rgba(196,181,253,0.35), rgba(196,181,253,0.15))"
                    : "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                  backgroundSize: loading ? "200% 100%" : "100% 100%",
                  animation: loading ? "shimmer 1.5s linear infinite" : "none",
                  border: "none",
                  borderRadius: 12,
                  padding: "16px 28px",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  transition: "all 0.25s ease",
                  whiteSpace: "nowrap",
                  opacity: !address.trim() && !loading ? 0.4 : 1,
                }}
              >
                {loading ? "SCANNING..." : "VERIFY"}
              </button>
            </div>

            {/* Example wallets */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-ghost)",
                }}
              >
                Try:
              </span>
              {[
                {
                  label: "Satoshi",
                  addr: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                },
                {
                  label: "MicroStrategy",
                  addr: "bc1qazcm763858nkj2dz7g6xhpfrxjcda3q3pthys",
                },
              ].map((d) => (
                <button
                  key={d.label}
                  onClick={() => setAddress(d.addr)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    padding: "4px 12px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(196,181,253,0.25)";
                    e.currentTarget.style.color = "var(--obsidian)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--red)",
                padding: "14px 20px",
                background: "rgba(248,113,113,0.04)",
                border: "1px solid rgba(248,113,113,0.12)",
                borderRadius: 10,
                marginBottom: 24,
                width: "100%",
                textAlign: "center",
                animation: "fadeUp 0.3s ease-out",
              }}
            >
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                animation: "fadeUp 0.3s ease-out",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  animation: "diamondSpin 2s linear infinite",
                  display: "inline-block",
                  marginBottom: 18,
                }}
              >
                💎
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                Scanning blockchain for {shortAddr(address)}...
              </div>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 28,
                width: "100%",
                marginBottom: 20,
              }}
            >
              {/* Privacy toggle */}
              <button
                onClick={() => setHideBalance((p) => !p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: hideBalance ? "var(--obsidian)" : "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(196,181,253,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 18,
                  borderRadius: 9,
                  background: hideBalance ? "var(--obsidian)" : "var(--border)",
                  transition: "background 0.2s ease",
                  position: "relative",
                }}>
                  <span style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: hideBalance ? "#fff" : "var(--text-muted)",
                    transition: "all 0.2s ease",
                    transform: hideBalance ? "translateX(7px)" : "translateX(-7px)",
                  }} />
                </span>
                {hideBalance ? "🔒 PRIVATE MODE" : "🔓 SHOWING ALL"}
              </button>

              <DiamondCard data={result} cardRef={cardRef} hideBalance={hideBalance} />
              <ShareButtons data={result} cardRef={cardRef} />
            </div>
          )}

          {/* Rank Legend */}
          <div style={{ marginTop: result ? 36 : 0, width: "100%" }}>
            <RankLegend />
          </div>

          {/* How it works */}
          <div
            className="animate-fade-up delay-5"
            style={{
              marginTop: 44,
              maxWidth: 500,
              width: "100%",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-ghost)",
                letterSpacing: "0.2em",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              HOW IT WORKS
            </div>
            {[
              {
                step: "01",
                title: "Paste address",
                text: "Any public BTC wallet address. No login, no wallet connection, no permissions.",
              },
              {
                step: "02",
                title: "Blockchain scan",
                text: "We query the public Bitcoin ledger for your complete transaction history.",
              },
              {
                step: "03",
                title: "Diamond rank",
                text: "Your rank is calculated from hold duration and whether you've ever sent BTC out.",
              },
              {
                step: "04",
                title: "Share your proof",
                text: "Save the badge as an image or share directly to 𝕏. It's blockchain proof, not a claim.",
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  display: "flex",
                  gap: 16,
                  marginBottom: 20,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 28,
                    fontWeight: 900,
                    color: "var(--border)",
                    lineHeight: 1,
                    minWidth: 40,
                  }}
                >
                  {s.step}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {s.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <footer
            style={{
              marginTop: 56,
              textAlign: "center",
              padding: "24px 0",
              borderTop: "1px solid var(--border-subtle)",
              width: "100%",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-ghost)",
                lineHeight: 2,
              }}
            >
              PROOF OF HANDS · NG TECHNOLOGIES
              <br />
              No wallet connection · Public blockchain data only · Your keys
              stay yours
              <br />
              <span style={{ color: "var(--text-muted)" }}>
                Built with conviction · Open source
              </span>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
