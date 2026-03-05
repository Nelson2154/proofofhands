"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";

// ==================== CONFIG ====================
const ETH_TOKENS = [
  { symbol: "PEPE", name: "Pepe", emoji: "🐸" },
  { symbol: "SHIB", name: "Shiba Inu", emoji: "🐕" },
  { symbol: "FLOKI", name: "Floki", emoji: "⚡" },
];

const SOL_TOKENS = [
  { symbol: "BONK", name: "Bonk", emoji: "🐕" },
  { symbol: "WIF", name: "dogwifhat", emoji: "🎩" },
  { symbol: "TRUMP", name: "Trump", emoji: "🇺🇸" },
  { symbol: "FARTCOIN", name: "Fartcoin", emoji: "💨" },
];

function detectChain(addr) {
  if (!addr) return null;
  const a = addr.trim();
  if (/^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a) || /^bc1[a-z0-9]{6,87}$/.test(a)) return "btc";
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return "eth";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) && !a.startsWith("bc1")) return "sol";
  return null;
}

// ==================== HELPERS ====================
function getRank(holdDays, everSold) {
  if (everSold) return { rank: "PAPER HANDS", emoji: "🧻", color: "#ef4444", tier: 0 };
  if (holdDays >= 2000) return { rank: "OBSIDIAN", emoji: "💎", color: "#a78bfa", tier: 6 };
  if (holdDays >= 1500) return { rank: "TRIPLE DIAMOND", emoji: "💎💎💎", color: "#22d3ee", tier: 5 };
  if (holdDays >= 1000) return { rank: "DOUBLE DIAMOND", emoji: "💎💎", color: "#4ade80", tier: 4 };
  if (holdDays >= 365) return { rank: "DIAMOND HANDS", emoji: "💎", color: "#f59e0b", tier: 3 };
  if (holdDays >= 90) return { rank: "IRON HANDS", emoji: "🤝", color: "#94a3b8", tier: 2 };
  return { rank: "FRESH", emoji: "🫶", color: "#64748b", tier: 1 };
}

function fmtHoldTime(days) {
  if (days < 365) return { big: days, unit: days === 1 ? "DAY" : "DAYS", sub: null };
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  const d = days % 30;
  if (m > 0) return { big: y, unit: y === 1 ? "YEAR" : "YEARS", sub: `${m}mo ${d}d` };
  return { big: y, unit: y === 1 ? "YEAR" : "YEARS", sub: `${d} days` };
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtBtc(n) {
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n >= 1 ? n.toFixed(4) : n.toFixed(8);
}

function fmtTokenAmount(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(6);
}

function fmtUsd(n) {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  if (n >= 1) return "$" + n.toFixed(2);
  if (n > 0) return "$" + n.toFixed(4);
  return "$0";
}

function getAssetLabel(data) {
  if (data.chain === "btc" || !data.chain) return "BTC";
  return data.token || "TOKEN";
}

function getBalanceDisplay(data, hide) {
  if (hide) return "•••••";
  if (data.chain === "btc" || !data.chain) return fmtBtc(data.currentBalance) + " BTC";
  return fmtTokenAmount(data.currentBalance) + " " + getAssetLabel(data);
}

function getValueDisplay(data, hide) {
  if (hide) return "•••••";
  const price = (data.chain === "btc" || !data.chain) ? data.btcPrice : data.tokenPrice;
  return fmtUsd(data.currentBalance * (price || 0));
}

function getPriceDisplay(data) {
  if (data.chain === "btc" || !data.chain) return "BTC $" + (data.btcPrice || 0).toLocaleString();
  const p = data.tokenPrice;
  if (!p) return getAssetLabel(data);
  if (p >= 1) return getAssetLabel(data) + " $" + p.toFixed(2);
  return getAssetLabel(data) + " $" + p.toFixed(p >= 0.001 ? 4 : 8);
}

function getChainColor(chain) {
  if (chain === "eth") return "#627eea";
  if (chain === "sol") return "#9945ff";
  return "#f7931a";
}

// ==================== PAPER CARD ====================
function PaperCard({ data, cardRef, hideBalance }) {
  return (
    <div ref={cardRef} style={{
      background: "linear-gradient(180deg, #0f0808 0%, #0a0a0f 40%)",
      border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 16, overflow: "hidden", maxWidth: 520, width: "100%",
      animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #ef4444, #991b1b)" }} />

      <div style={{ padding: "36px 32px 12px", textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>🧻</div>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800,
          color: "#ef4444", marginTop: 10, letterSpacing: "-0.02em",
        }}>PAPER HANDS</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#7a7a8f", marginTop: 10,
        }}>This wallet has outgoing {getAssetLabel(data)} transactions.</div>
      </div>

      <div style={{ padding: "20px 32px", textAlign: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4a4a5f", lineHeight: 1.6, fontStyle: "italic" }}>
          Meanwhile, diamond hands holders are still up.
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: data.lastSold ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr",
        borderTop: "1px solid #141420", borderBottom: "1px solid #141420",
      }}>
        {[
          { l: "HOLDING SINCE", v: data.firstReceive ? fmtDate(data.firstReceive) : "N/A", c: "#ccc" },
          { l: "STACK SIZE", v: getBalanceDisplay(data, hideBalance), c: "#ccc" },
          { l: "CURRENT VALUE", v: getValueDisplay(data, hideBalance), c: "#ef4444" },
          ...(data.lastSold ? [{ l: "LAST SOLD", v: fmtDate(data.lastSold), c: "#ef4444" }] : []),
        ].map((s, i, arr) => (
          <div key={s.l} style={{
            padding: "16px 14px", textAlign: "center",
            borderRight: i < arr.length - 1 ? "1px solid #141420" : "none",
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f", letterSpacing: "0.1em", marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#3a3a4f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>
          {data.address.slice(0, 8) + "···" + data.address.slice(-4)}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: "#ef4444",
          padding: "3px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 4,
        }}>📤 SOLD</span>
      </div>

      <div style={{ padding: "10px 28px", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, color: "#5a5a6f" }}>proofofhands.com</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f" }}>VERIFIED ON-CHAIN</span>
      </div>
    </div>
  );
}

// ==================== DIAMOND CARD ====================
function DiamondCard({ data, cardRef, hideBalance }) {
  const rank = getRank(data.holdDays, data.everSold);
  const t = fmtHoldTime(data.holdDays);

  return (
    <div ref={cardRef} style={{
      background: "linear-gradient(180deg, #08081a 0%, #0a0a12 100%)",
      border: `1px solid ${rank.color}22`,
      borderRadius: 16, overflow: "hidden", maxWidth: 520, width: "100%",
      animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
    }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${rank.color}88, ${rank.color})` }} />

      <div style={{ padding: "20px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f", letterSpacing: "0.12em", marginBottom: 4 }}>BLOCKCHAIN VERIFIED</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>💎</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, color: rank.color, letterSpacing: "-0.02em" }}>{rank.rank}</span>
          </div>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f", marginTop: 4 }}>TIER {rank.tier}/6</span>
      </div>

      <div style={{ padding: "20px 28px 14px", textAlign: "center" }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 80, fontWeight: 800, color: "#fff",
          lineHeight: 1, letterSpacing: "-0.04em",
        }}>{t.big}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: rank.color,
          marginTop: 6, letterSpacing: "0.15em",
        }}>{t.unit} · NEVER SOLD</div>
        {t.sub && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5a5a6f", marginTop: 4 }}>{t.sub}</div>
        )}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        borderTop: "1px solid #141420", borderBottom: "1px solid #141420",
      }}>
        {[
          { l: "HOLDING SINCE", v: data.firstReceive ? fmtDate(data.firstReceive) : "N/A", c: "#ccc" },
          { l: "STACK SIZE", v: getBalanceDisplay(data, hideBalance), c: "#ccc" },
          { l: "CURRENT VALUE", v: getValueDisplay(data, hideBalance), c: "#4ade80" },
        ].map((s, i) => (
          <div key={s.l} style={{
            padding: "16px 18px", textAlign: "center",
            borderRight: i < 2 ? "1px solid #141420" : "none",
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f", letterSpacing: "0.1em", marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#3a3a4f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>
          {hideBalance ? data.address.slice(0, 6) + "···" + data.address.slice(-4) : data.address.slice(0, 12) + "···" + data.address.slice(-6)}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: "#4ade80",
          padding: "3px 10px", background: "rgba(74,222,128,0.08)", borderRadius: 4,
        }}>✅ NEVER SOLD</span>
      </div>

      <div style={{ padding: "10px 28px", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, color: "#5a5a6f" }}>proofofhands.com</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f" }}>{getPriceDisplay(data)}</span>
      </div>
    </div>
  );
}

// ==================== SHARE BAR ====================
function ShareBar({ data, cardRef }) {
  const [copied, setCopied] = useState(false);
  const rank = getRank(data.holdDays, data.everSold);
  const t = fmtHoldTime(data.holdDays);
  const timeStr = t.sub ? `${t.big} ${t.unit.toLowerCase()} (${t.sub})` : `${t.big} ${t.unit.toLowerCase()}`;
  const asset = getAssetLabel(data);

  const txt = data.everSold
    ? `🧻 PAPER HANDS — blockchain verified. I sold my $${asset}. Check yours:`
    : `💎 ${rank.rank} — ${timeStr} holding $${asset}. Never sold. Prove yours:`;

  const handleSavePng = useCallback(async () => {
    if (!cardRef?.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#060608" });
      const link = document.createElement("a");
      link.download = `proof-of-hands-${data.everSold ? "paper" : "diamond"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
    }
  }, [cardRef, data.everSold]);

  const hoverColor = data.everSold ? "#ef4444" : rank.color;

  const btn = (label, icon, action, color) => (
    <button key={label} onClick={action} style={{
      background: "#0c0c14", border: "1px solid #1e1e2e", borderRadius: 8,
      padding: "10px 18px", color: "#7a7a8f", fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color + "44"; e.currentTarget.style.color = color; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e2e"; e.currentTarget.style.color = "#7a7a8f"; }}
    >{icon} {label}</button>
  );

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", animation: "fadeIn 0.3s ease-out 0.3s both" }}>
      {btn(copied ? "COPIED ✓" : "COPY", "📋", () => { navigator.clipboard?.writeText(txt + "\nhttps://proofofhands.com"); setCopied(true); setTimeout(() => setCopied(false), 2000); }, "#4ade80")}
      {btn("POST ON 𝕏", "", () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent("https://proofofhands.com")}`, "_blank"), "#1d9bf0")}
      {btn("SAVE PNG", "📸", handleSavePng, "#a78bfa")}
    </div>
  );
}

// ==================== TOKEN PICKER ====================
function TokenPicker({ chain, selected, onSelect }) {
  const tokens = chain === "eth" ? ETH_TOKENS : chain === "sol" ? SOL_TOKENS : [];
  if (tokens.length === 0) return null;
  const color = chain === "eth" ? "#627eea" : "#9945ff";

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, animation: "fadeIn 0.2s ease-out" }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f",
        padding: "6px 0", display: "flex", alignItems: "center",
      }}>
        {chain === "eth" ? "⟠" : "◎"} SELECT TOKEN:
      </span>
      {tokens.map(t => {
        const isActive = selected === t.symbol;
        return (
          <button key={t.symbol} onClick={() => onSelect(t.symbol)} style={{
            background: isActive ? color + "18" : "#0a0a12",
            border: `1px solid ${isActive ? color + "55" : "#1e1e2e"}`,
            borderRadius: 6, padding: "5px 12px",
            color: isActive ? color : "#6a6a7f",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: isActive ? 700 : 400,
            cursor: "pointer", transition: "all 0.12s",
          }}>{t.emoji} {t.symbol}</button>
        );
      })}
    </div>
  );
}

// ==================== MAIN APP ====================
export default function ProofOfHands() {
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState(null);
  const [token, setToken] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const detected = detectChain(address);
    setChain(detected);
    if (detected === "eth" && !token) setToken("PEPE");
    if (detected === "sol" && !token) setToken("BONK");
    if (detected === "btc") setToken(null);
  }, [address]);

  const handleLookup = useCallback(async () => {
    const addr = address.trim();
    if (!addr) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setHideBalance(false);

    try {
      let endpoint, body;
      if (chain === "eth") {
        if (!token) { setError("Select a token first"); setLoading(false); return; }
        endpoint = "/api/lookup-eth";
        body = { address: addr, token };
      } else if (chain === "sol") {
        if (!token) { setError("Select a token first"); setLoading(false); return; }
        endpoint = "/api/lookup-sol";
        body = { address: addr, token };
      } else {
        endpoint = "/api/lookup";
        body = { address: addr };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      if (!data.chain) data.chain = "btc";
      setResult(data);
    } catch (err) {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [address, chain, token]);

  const chainLabel = chain === "eth" ? "Ethereum" : chain === "sol" ? "Solana" : chain === "btc" ? "Bitcoin" : null;
  const chainColor = getChainColor(chain);

  return (
    <div style={{ minHeight: "100vh", background: "#060608", color: "#e0e0e8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; }
        body { background: #060608; }
        ::selection { background: rgba(245,158,11,0.2); color: #f59e0b; }
        input::placeholder { color: #3a3a4f; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #060608; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 2px; }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
      `}</style>

      <div style={{ maxWidth: 580, margin: "0 auto", padding: "0 20px" }}>

        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderBottom: "1px solid #111118" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💎</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>Proof of Hands</span>
          </div>
          <button onClick={() => setShowDonate(p => !p)} style={{
            background: "rgba(247,147,26,0.05)", border: "1px solid rgba(247,147,26,0.12)",
            borderRadius: 6, padding: "5px 12px", color: "#f7931a",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>₿ DONATE</button>
        </nav>

        {showDonate && (
          <div style={{ padding: "14px 0", animation: "slideUp 0.2s ease-out" }}>
            <div style={{ background: "#0a0a12", border: "1px solid rgba(247,147,26,0.1)", borderRadius: 10, padding: "14px 18px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#f7931a", padding: "8px", background: "rgba(247,147,26,0.04)", borderRadius: 6, wordBreak: "break-all", userSelect: "all" }}>
                  bc1qfcc508fy9f356dnej980kv0pfemqd7lrtcharj
                </div>
                <button onClick={() => { navigator.clipboard?.writeText("bc1qfcc508fy9f356dnej980kv0pfemqd7lrtcharj"); }} style={{
                  background: "rgba(247,147,26,0.08)", border: "1px solid rgba(247,147,26,0.15)",
                  borderRadius: 6, padding: "8px 12px", color: "#f7931a", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                }}>COPY</button>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f", marginTop: 6 }}>Free forever · No ads · No tracking</div>
            </div>
          </div>
        )}

        <div style={{ padding: "44px 0 32px", textAlign: "center", animation: "fadeIn 0.4s ease-out" }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            Did you sell<span style={{ color: "#f59e0b" }}>?</span>
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#8a8a9f", marginTop: 10, lineHeight: 1.5 }}>
            Paste any wallet. The blockchain doesn't lie.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            {[
              { label: "BTC", color: "#f7931a", icon: "₿" },
              { label: "ETH", color: "#627eea", icon: "⟠" },
              { label: "SOL", color: "#9945ff", icon: "◎" },
            ].map(c => (
              <span key={c.label} style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: c.color + "88",
                padding: "3px 8px", background: c.color + "08", borderRadius: 4,
                border: `1px solid ${c.color}15`,
              }}>{c.icon} {c.label}</span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16, animation: "fadeIn 0.4s ease-out 0.1s both" }}>
          <div style={{
            display: "flex", gap: 8, background: "#0a0a12",
            border: `1px solid ${chain ? chainColor + "33" : "#1e1e2e"}`,
            borderRadius: 12, padding: 6, transition: "border-color 0.2s",
          }}>
            <input type="text" placeholder="Paste any wallet address (BTC, ETH, SOL)" value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLookup()}
              style={{ flex: 1, background: "transparent", border: "none", padding: "12px 14px", color: "#e0e0e8", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, outline: "none" }}
            />
            {chain && (
              <span style={{
                alignSelf: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: chainColor, padding: "3px 8px", background: chainColor + "12",
                borderRadius: 4, whiteSpace: "nowrap",
              }}>{chainLabel}</span>
            )}
            <button onClick={handleLookup} disabled={loading || !address.trim()} style={{
              background: loading ? "linear-gradient(90deg, #f59e0b44, #f59e0b88, #f59e0b44)" : "#f59e0b",
              backgroundSize: loading ? "200% 100%" : "100%", animation: loading ? "shimmer 1.2s linear infinite" : "none",
              border: "none", borderRadius: 8, padding: "12px 28px", color: "#000",
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700,
              cursor: loading ? "wait" : "pointer", opacity: !address.trim() && !loading ? 0.3 : 1,
              whiteSpace: "nowrap",
            }}>{loading ? "···" : "VERIFY"}</button>
          </div>

          {(chain === "eth" || chain === "sol") && (
            <TokenPicker chain={chain} selected={token} onSelect={setToken} />
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { l: "Satoshi 👑", a: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" },
              { l: "Binance 🏦", a: "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo" },
              { l: "vitalik.eth ⟠", a: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
            ].map(d => (
              <button key={d.l} onClick={() => { setAddress(d.a); setToken(null); }} style={{
                background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 6,
                padding: "5px 12px", color: "#6a6a7f", fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                cursor: "pointer", transition: "all 0.12s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b33"; e.currentTarget.style.color = "#f59e0b"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e2e"; e.currentTarget.style.color = "#6a6a7f"; }}
              >{d.l}</button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#ef4444",
            textAlign: "center", padding: "12px", background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8, marginBottom: 16,
            animation: "slideUp 0.2s ease-out",
          }}>{error}</div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "44px 0", animation: "fadeIn 0.2s ease-out" }}>
            <div style={{ fontSize: 28, animation: "spin 1.2s linear infinite", display: "inline-block", marginBottom: 12 }}>💎</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6a6a7f", animation: "pulse 1.5s ease-in-out infinite" }}>reading the chain...</div>
          </div>
        )}

        {result && !loading && (
          <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <button onClick={() => setHideBalance(p => !p)} style={{
              display: "flex", alignItems: "center", gap: 8, background: "transparent",
              border: "1px solid #1e1e2e", borderRadius: 20, padding: "5px 14px", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: hideBalance ? "#f59e0b" : "#5a5a6f",
            }}>
              <span style={{
                width: 26, height: 14, borderRadius: 7,
                background: hideBalance ? "#f59e0b" : "#1e1e2e",
                display: "flex", alignItems: "center", padding: "0 2px",
                transition: "background 0.15s",
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: hideBalance ? "#000" : "#5a5a6f",
                  transform: hideBalance ? "translateX(12px)" : "translateX(0)",
                  transition: "all 0.15s",
                }} />
              </span>
              {hideBalance ? "PRIVATE" : "PUBLIC"}
            </button>

            {result.everSold
              ? <PaperCard data={result} cardRef={cardRef} hideBalance={hideBalance} />
              : <DiamondCard data={result} cardRef={cardRef} hideBalance={hideBalance} />
            }
            <ShareBar data={result} cardRef={cardRef} />
          </div>
        )}

        <details style={{ marginTop: 28, marginBottom: 32 }}>
          <summary style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5a5a6f", cursor: "pointer",
            padding: "12px 0", borderTop: "1px solid #111118", listStyle: "none",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>RANK SYSTEM</span><span>▼</span>
          </summary>
          <div style={{ paddingTop: 4 }}>
            {[
              { r: "OBSIDIAN", d: "2000+ days, never sold", e: "💎", c: "#a78bfa" },
              { r: "TRIPLE DIAMOND", d: "1500+ days, never sold", e: "💎💎💎", c: "#22d3ee" },
              { r: "DOUBLE DIAMOND", d: "1000+ days, never sold", e: "💎💎", c: "#4ade80" },
              { r: "DIAMOND HANDS", d: "365+ days, never sold", e: "💎", c: "#f59e0b" },
              { r: "IRON HANDS", d: "90+ days, never sold", e: "🤝", c: "#94a3b8" },
              { r: "FRESH", d: "Under 90 days", e: "🫶", c: "#64748b" },
              { r: "PAPER HANDS", d: "Sent tokens at any point", e: "🧻", c: "#ef4444" },
            ].map(r => (
              <div key={r.r} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid #0e0e16" }}>
                <span style={{ fontSize: 16, width: 28, textAlign: "center" }}>{r.e}</span>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: r.c }}>{r.r}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a5a6f" }}>{r.d}</div>
                </div>
              </div>
            ))}
          </div>
        </details>

        <div style={{ borderTop: "1px solid #111118", padding: "20px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { n: "01", t: "Paste address", d: "BTC, ETH, or SOL. No login." },
            { n: "02", t: "Chain scan", d: "We read the public ledger." },
            { n: "03", t: "Get ranked", d: "Hold time + sell history." },
            { n: "04", t: "Talk shit", d: "Share it. Screenshot it. Flex." },
          ].map(s => (
            <div key={s.n}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#3a3a4f", marginBottom: 4 }}>{s.n}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: "#8a8a9f", marginBottom: 3 }}>{s.t}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#5a5a6f", lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>

        <footer style={{ borderTop: "1px solid #111118", padding: "18px 0 28px", textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#3a3a4f", lineHeight: 2 }}>
            PROOF OF HANDS · NG TECHNOLOGIES<br />
            <span style={{ color: "#5a5a6f" }}>Public data only · No wallet connection · Your keys stay yours</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
