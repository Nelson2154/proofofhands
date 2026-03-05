"use client";
import { useState, useEffect, useCallback } from "react";

const APP_NAME = "N400 Tracker";
const STORAGE_KEY = "n400_tracker_data";

// Default state — empty, users enter their own data
const defaultState = {
  greenCardDate: "",
  fullName: "",
  alienNumber: "",
  marriageBasedTrack: false,
  trips: [],
  taxYears: [],
  documents: [
    { name: "Green Card (I-551) — front & back copy", ready: false, notes: "Original + photocopy" },
    { name: "Valid Passport (current + all expired)", ready: false, notes: "Bring all to interview" },
    { name: "Two Passport Photos (2x2)", ready: false, notes: "Only if filing by mail or living abroad" },
    { name: "Birth Certificate", ready: false, notes: "Need certified English translation if not in English" },
    { name: "Certified English Translations", ready: false, notes: "For birth cert and any foreign-language docs" },
    { name: "Marriage Certificate", ready: false, notes: "If ever married — USCIS will ask" },
    { name: "Divorce Decree", ready: false, notes: "If applicable — bring original" },
    { name: "Tax Returns (5 years)", ready: false, notes: "Covering statutory period" },
    { name: "IRS Tax Transcripts (5 years)", ready: false, notes: "Request at irs.gov/get-transcript" },
    { name: "W-2 / 1099 Forms (5 years)", ready: false, notes: "All income documentation" },
    { name: "Proof of Address (lease/utilities)", ready: false, notes: "Current address verification" },
    { name: "Driver's License or State ID", ready: false, notes: "Bring as second photo ID to interview" },
    { name: "Employment Verification Letter(s)", ready: false, notes: "From current and recent employers" },
    { name: "Selective Service Registration", ready: false, notes: "Males 18-25 at time of entry — verify at sss.gov" },
    { name: "N-400 Filing Fee ($760)", ready: false, notes: "Pay by credit card (G-1450) or bank account (G-1650)" },
    { name: "Civics Test Prep (2025 version)", ready: false, notes: "New 128-question test effective Oct 2025" },
  ],
  addresses: [],
  employmentHistory: [],
};

// Helpers
const daysBetween = (d1, d2) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.ceil((date2 - date1) / (1000 * 60 * 60 * 24));
};

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const today = () => new Date().toISOString().split("T")[0];

const addDays = (dateStr, days) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const addYears = (dateStr, years) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
};

// Icons
const Icons = {
  plane: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.8 19.2L16 11l3.5-3.5C20.7 6.3 21 5 20.1 3.9 19 3 17.7 3.3 16.5 4.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 12l-2 3H6l-1 1 3 2 2 3 1-1v-3l3-2 3.8 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>,
  tax: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  doc: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  home: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-9 9 9"/><path d="M9 21V12h6v9"/></svg>,
  brief: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  dash: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>,
  warn: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  x: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  flag: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
};

// Status Badge
const Badge = ({ type, children }) => {
  const styles = {
    pass: { background: "#0d2818", color: "#4ade80", border: "1px solid #166534" },
    warn: { background: "#2d1f00", color: "#fbbf24", border: "1px solid #92400e" },
    fail: { background: "#2d0a0a", color: "#f87171", border: "1px solid #991b1b" },
    info: { background: "#0a1a2d", color: "#60a5fa", border: "1px solid #1e40af" },
    neutral: { background: "#1a1a2e", color: "#a5b4c4", border: "1px solid #334155" },
  };
  return (
    <span style={{ ...styles[type], padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "5px", letterSpacing: "0.3px" }}>
      {type === "pass" && <Icons.check />}
      {type === "warn" && <Icons.warn />}
      {type === "fail" && <Icons.x />}
      {children}
    </span>
  );
};

// Progress bar
const ProgressBar = ({ value, max, color = "#4ade80", label, sublabel }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
        <span style={{ color: "#c8d6e5" }}>{label}</span>
        <span style={{ color: "#8899aa" }}>{sublabel}</span>
      </div>
      <div style={{ background: "#1a1a2e", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: "8px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
};

// Card wrapper
const Card = ({ children, title, icon, action }) => (
  <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
    {title && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0", fontSize: "15px", fontWeight: 600 }}>
          {icon}
          {title}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

// Input field
const Field = ({ label, type = "text", value, onChange, placeholder, required, options }) => (
  <div style={{ marginBottom: "12px" }}>
    <label style={{ display: "block", fontSize: "12px", color: "#8899aa", marginBottom: "4px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#0d1117", border: "1px solid #1e293b", borderRadius: "8px", color: "#e2e8f0", fontSize: "14px", outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        style={{ width: "100%", padding: "8px 12px", background: "#0d1117", border: "1px solid #1e293b", borderRadius: "8px", color: "#e2e8f0", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
    )}
  </div>
);

// Button
const Btn = ({ children, onClick, variant = "primary", small, style: extraStyle }) => {
  const styles = {
    primary: { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "none" },
    secondary: { background: "transparent", color: "#60a5fa", border: "1px solid #1e40af" },
    danger: { background: "transparent", color: "#f87171", border: "1px solid #991b1b" },
    ghost: { background: "transparent", color: "#8899aa", border: "1px solid #1e293b" },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], padding: small ? "4px 10px" : "8px 16px", borderRadius: "8px", fontSize: small ? "12px" : "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", transition: "all 0.2s", letterSpacing: "0.3px", ...extraStyle }}>
      {children}
    </button>
  );
};

// ─── MAIN APP ───
export default function N400Tracker() {
  const [data, setData] = useState(defaultState);
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem("n400_tracker_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.greenCardDate) {
            setData(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (e) {
        // No data yet
      }
      setLoaded(true);
    };
    load();
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("n400_tracker_data", JSON.stringify(data));
    } catch (e) {
      // Save failed
    }
  }, [data, loaded]);

  const update = useCallback((key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  // ─── CALCULATIONS ───
  const requiredYears = data.marriageBasedTrack ? 3 : 5;
  const requiredPresenceDays = data.marriageBasedTrack ? 548 : 913; // 18 or 30 months
  const fiveYearDate = data.greenCardDate ? addYears(data.greenCardDate, requiredYears) : null;
  const earliestFiling = data.greenCardDate ? addDays(fiveYearDate, -90) : null;
  const statutoryPeriodStart = data.greenCardDate ? addYears(today(), -requiredYears) : null;

  // Calculate days outside US
  const totalDaysOutside = data.trips.reduce((sum, trip) => {
    if (!trip.departure || !trip.return) return sum;
    const days = daysBetween(trip.departure, trip.return);
    return sum + Math.max(0, days);
  }, 0);

  // Days since green card
  const daysSinceGreenCard = data.greenCardDate ? daysBetween(data.greenCardDate, today()) : 0;
  const totalDaysInPeriod = data.greenCardDate ? Math.min(daysSinceGreenCard, requiredYears * 365) : 0;
  const daysInUS = totalDaysInPeriod - totalDaysOutside;
  const daysUntilEligible = data.greenCardDate ? Math.max(0, daysBetween(today(), earliestFiling)) : 0;

  // Longest single trip
  const longestTrip = data.trips.reduce((max, trip) => {
    if (!trip.departure || !trip.return) return max;
    const days = daysBetween(trip.departure, trip.return);
    return days > max ? days : max;
  }, 0);

  // Continuous residence status
  const continuousResidenceOk = longestTrip < 180;
  const continuousResidenceWarning = longestTrip >= 180 && longestTrip < 365;
  const continuousResidenceBroken = longestTrip >= 365;

  // Physical presence status  
  const physicalPresenceMet = daysInUS >= requiredPresenceDays;
  const physicalPresencePct = totalDaysInPeriod > 0 ? (daysInUS / requiredPresenceDays) * 100 : 0;

  // Tax years filed
  const taxYearsFiled = data.taxYears.length;

  // Documents ready
  const docsReady = data.documents.filter(d => d.ready).length;
  const docsTotal = data.documents.length;

  // Absence budget calculations
  const maxAbsence = requiredYears * 365 - requiredPresenceDays;
  const budgetPct = maxAbsence > 0 ? ((totalDaysOutside / maxAbsence) * 100).toFixed(1) : "0.0";
  const absenceDaysRemaining = maxAbsence - totalDaysOutside;

  // Yearly breakdown calculations
  const yearlyData = (() => {
    const daysByYear = {};
    const tripsByYear = {};
    data.trips.forEach(trip => {
      if (!trip.departure || !trip.return) return;
      const dep = new Date(trip.departure + "T00:00:00");
      const ret = new Date(trip.return + "T00:00:00");
      let cursor = new Date(dep);
      while (cursor <= ret) {
        const y = cursor.getFullYear();
        daysByYear[y] = (daysByYear[y] || 0) + 1;
        cursor.setDate(cursor.getDate() + 1);
      }
      const depYear = dep.getFullYear();
      tripsByYear[depYear] = (tripsByYear[depYear] || 0) + 1;
    });
    const currentYear = new Date().getFullYear();
    const gcYear = data.greenCardDate ? new Date(data.greenCardDate + "T00:00:00").getFullYear() : 2023;
    const years = [];
    for (let y = gcYear; y <= currentYear; y++) years.push(y);
    const daysInYearFn = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365;
    const todayDate = new Date();
    return years.map(y => {
      const dOut = daysByYear[y] || 0;
      const isCurrent = y === currentYear;
      const totalDaysY = daysInYearFn(y);
      const dayOfYear = isCurrent ? Math.floor((todayDate - new Date(y, 0, 1)) / (1000 * 60 * 60 * 24)) + 1 : totalDaysY;
      const dIn = dayOfYear - dOut;
      const pctOut = dayOfYear > 0 ? ((dOut / dayOfYear) * 100).toFixed(1) : "0.0";
      return { year: y, isCurrent, daysOut: dOut, daysIn: dIn, daysLeft: isCurrent ? totalDaysY - dayOfYear : 0, trips: tripsByYear[y] || 0, pctOut, totalDaysY };
    });
  })();

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <Icons.dash /> },
    { id: "trips", label: "Trips", icon: <Icons.plane /> },
    { id: "taxes", label: "Tax History", icon: <Icons.tax /> },
    { id: "documents", label: "Documents", icon: <Icons.doc /> },
    { id: "addresses", label: "Addresses", icon: <Icons.home /> },
    { id: "employment", label: "Employment", icon: <Icons.brief /> },
    { id: "settings", label: "Profile", icon: <Icons.flag /> },
  ];

  if (!loaded) {
    return (
      <div style={{ background: "#0b0f19", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ background: "#0b0f19", minHeight: "100vh", color: "#c8d6e5", fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d1117, #111827)", borderBottom: "1px solid #1e293b", padding: "16px 20px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "22px" }}>🇺🇸</span> N400 Tracker
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Naturalization Eligibility Tracker</div>
          </div>
          {data.greenCardDate && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Earliest Filing</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: daysUntilEligible <= 90 ? "#4ade80" : "#60a5fa" }}>
                {formatDate(earliestFiling)}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {daysUntilEligible > 0 ? `${daysUntilEligible} days away` : "Eligible now!"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ background: "#0d1117", borderBottom: "1px solid #1e293b", overflowX: "auto" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", gap: "2px", padding: "0 12px" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "#1e293b" : "transparent",
              color: tab === t.id ? "#60a5fa" : "#64748b",
              border: "none", borderBottom: tab === t.id ? "2px solid #2563eb" : "2px solid transparent",
              padding: "10px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
              transition: "all 0.2s", letterSpacing: "0.3px"
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 16px" }}>
        {!data.greenCardDate && tab !== "settings" && (
          <Card>
            <div style={{ textAlign: "center", padding: "30px 20px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🇺🇸</div>
              <h2 style={{ color: "#e2e8f0", fontSize: "20px", marginBottom: "8px" }}>Welcome to N400 Tracker</h2>
              <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "14px" }}>Start by entering your green card date to calculate your eligibility timeline.</p>
              <Btn onClick={() => setTab("settings")}>Set Up Profile →</Btn>
            </div>
          </Card>
        )}

        {/* ─── DASHBOARD ─── */}
        {tab === "dashboard" && data.greenCardDate && (
          <>
            {/* Countdown */}
            <Card>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>
                  {daysUntilEligible > 0 ? "Days Until You Can File" : "You Are Eligible To File!"}
                </div>
                <div style={{ fontSize: "56px", fontWeight: 800, color: daysUntilEligible <= 90 ? "#4ade80" : daysUntilEligible <= 365 ? "#fbbf24" : "#60a5fa", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                  {daysUntilEligible > 0 ? daysUntilEligible : "NOW"}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>
                  Green Card: {formatDate(data.greenCardDate)} → Eligible: {formatDate(earliestFiling)}
                </div>
              </div>
            </Card>

            {/* Status Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <Card>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Physical Presence</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: physicalPresenceMet ? "#4ade80" : "#fbbf24", fontFamily: "monospace" }}>{daysInUS}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>of {requiredPresenceDays} days required</div>
                <div style={{ marginTop: "8px" }}>
                  <Badge type={physicalPresenceMet ? "pass" : "warn"}>{physicalPresenceMet ? "MET" : "IN PROGRESS"}</Badge>
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Continuous Residence</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: continuousResidenceBroken ? "#f87171" : continuousResidenceWarning ? "#fbbf24" : "#4ade80", fontFamily: "monospace" }}>
                  {longestTrip}d
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>longest single trip</div>
                <div style={{ marginTop: "8px" }}>
                  <Badge type={continuousResidenceBroken ? "fail" : continuousResidenceWarning ? "warn" : "pass"}>
                    {continuousResidenceBroken ? "BROKEN" : continuousResidenceWarning ? "AT RISK" : "OK"}
                  </Badge>
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Tax Returns Filed</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{taxYearsFiled}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>years documented</div>
                <div style={{ marginTop: "8px" }}>
                  <Badge type={taxYearsFiled >= requiredYears ? "pass" : "info"}>{taxYearsFiled >= requiredYears ? "COMPLETE" : `NEED ${requiredYears}`}</Badge>
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Documents Ready</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: docsTotal > 0 && docsReady === docsTotal ? "#4ade80" : "#fbbf24", fontFamily: "monospace" }}>{docsReady}/{docsTotal}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>items gathered</div>
                <div style={{ marginTop: "8px" }}>
                  <Badge type={docsTotal > 0 && docsReady === docsTotal ? "pass" : "info"}>{docsTotal === 0 ? "ADD DOCS" : docsReady === docsTotal ? "READY" : "PENDING"}</Badge>
                </div>
              </Card>
            </div>

            {/* Progress Bars */}
            <Card title="Progress" icon={<Icons.flag />}>
              <ProgressBar
                value={Math.min(daysSinceGreenCard, requiredYears * 365)}
                max={requiredYears * 365}
                color="#2563eb"
                label={`Residency Period (${requiredYears}-year track)`}
                sublabel={`${Math.min(daysSinceGreenCard, requiredYears * 365)} / ${requiredYears * 365} days`}
              />
              <ProgressBar
                value={daysInUS}
                max={requiredPresenceDays}
                color={physicalPresenceMet ? "#4ade80" : "#fbbf24"}
                label="Physical Presence in U.S."
                sublabel={`${daysInUS} / ${requiredPresenceDays} days`}
              />
              <ProgressBar
                value={totalDaysOutside}
                max={requiredYears * 365 - requiredPresenceDays}
                color={totalDaysOutside > (requiredYears * 365 - requiredPresenceDays) * 0.8 ? "#f87171" : "#64748b"}
                label="Days Outside U.S."
                sublabel={`${totalDaysOutside} days abroad`}
              />
            </Card>

            {/* Trip Warnings */}
            {data.trips.some(t => daysBetween(t.departure, t.return) >= 180) && (
              <Card>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", color: "#fbbf24" }}>
                  <Icons.warn />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>Trip Duration Warning</div>
                    <div style={{ fontSize: "13px", color: "#8899aa", marginTop: "4px" }}>
                      You have a trip of 6+ months. USCIS may presume you broke continuous residence. Be prepared to show strong ties to the U.S. (lease, employment, tax filings).
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Trips */}
            {data.trips.length > 0 && (
              <Card title="Recent Trips" icon={<Icons.plane />} action={<Btn small variant="ghost" onClick={() => setTab("trips")}>View All →</Btn>}>
                {data.trips.slice(-3).reverse().map((trip, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < Math.min(data.trips.length, 3) - 1 ? "1px solid #1e293b" : "none", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "#e2e8f0" }}>{trip.destination || "Unknown"}</span>
                      <span style={{ color: "#64748b", marginLeft: "8px" }}>{formatDate(trip.departure)} — {formatDate(trip.return)}</span>
                    </div>
                    <Badge type={daysBetween(trip.departure, trip.return) >= 180 ? "warn" : "neutral"}>
                      {daysBetween(trip.departure, trip.return)} days
                    </Badge>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ─── TRIPS ─── */}
        {tab === "trips" && (
          <>
            {/* Absence Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[
                { label: "TOTAL DAYS OUTSIDE", value: totalDaysOutside, color: "#e2e8f0", sub: `across ${data.trips.length} trips` },
                { label: "DAYS REMAINING", value: absenceDaysRemaining, color: "#4ade80", sub: `of ${maxAbsence} max allowed` },
                { label: "LONGEST TRIP", value: longestTrip, color: "#fbbf24", sub: longestTrip < 180 ? "(under 180 ✓)" : "⚠️ OVER 180" },
                { label: "BUDGET USED", value: `${budgetPct}%`, color: parseFloat(budgetPct) > 50 ? "#f87171" : "#4ade80", sub: "of absence allowance" },
              ].map((card, i) => (
                <div key={i} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px", borderTop: `3px solid ${card.color}33` }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>{card.label}</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: card.color, lineHeight: 1, marginBottom: "4px", fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</div>
                  <div style={{ fontSize: "11px", color: "#475569" }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Absence Budget Bar */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0" }}>
                  Absence Budget <span style={{ fontWeight: 400, color: "#64748b" }}>(max {maxAbsence} days outside in {requiredYears} years)</span>
                </span>
                <span style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "monospace" }}>
                  {totalDaysOutside} / {maxAbsence} days used
                </span>
              </div>
              <div style={{ height: "10px", background: "#1a1a2e", borderRadius: "6px", position: "relative", overflow: "visible" }}>
                <div style={{ height: "100%", width: `${Math.min(100, parseFloat(budgetPct))}%`, background: "linear-gradient(90deg, #3b82f6, #2563eb)", borderRadius: "6px", transition: "width 0.5s ease" }} />
                <div style={{ position: "absolute", top: "-4px", left: "50%", width: "2px", height: "18px", background: "#64748b" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", position: "relative" }}>
                <span style={{ fontSize: "11px", color: "#475569" }}>0 days</span>
                <span style={{ fontSize: "11px", color: "#ef4444", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>↑ 50% warning</span>
                <span style={{ fontSize: "11px", color: "#475569" }}>{maxAbsence} days</span>
              </div>
            </Card>

            {/* Yearly Breakdown */}
            <Card title="Yearly Breakdown">
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${yearlyData.length}, 1fr)`, gap: "10px" }}>
                {yearlyData.map(yd => (
                  <div key={yd.year} style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "18px", fontWeight: 800, color: "#e2e8f0" }}>{yd.year}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "4px", background: yd.isCurrent ? "#1e3a5f" : "#1e293b", color: yd.isCurrent ? "#60a5fa" : "#64748b" }}>
                        {yd.isCurrent ? "CURRENT" : "COMPLETE"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Days outside U.S.</span>
                        <span style={{ fontWeight: 700, color: yd.daysOut > 0 ? "#fbbf24" : "#ef4444" }}>{yd.daysOut}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Days in U.S.</span>
                        <span style={{ fontWeight: 700, color: "#4ade80" }}>{yd.daysIn}</span>
                      </div>
                      {yd.isCurrent && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#94a3b8" }}>Days left in {yd.year}</span>
                          <span style={{ fontWeight: 700, color: "#ef4444" }}>{yd.daysLeft}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Trips</span>
                        <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{yd.trips}</span>
                      </div>
                    </div>
                    <div style={{ height: "3px", background: "#1e293b", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${yd.pctOut}%`, background: "#3b82f6", borderRadius: "2px" }} />
                    </div>
                    <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>{yd.pctOut}% of {yd.year} spent outside</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Trip List */}
            <Card title="Trips Outside the U.S." icon={<Icons.plane />}
              action={<Btn small onClick={() => update("trips", [...data.trips, { destination: "", departure: "", return: "", purpose: "" }])}><Icons.plus /> Add Trip</Btn>}>
              {data.trips.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>✈️</div>
                  <p style={{ fontSize: "14px" }}>No trips recorded. Add every trip outside the U.S. since your green card date.</p>
                  <p style={{ fontSize: "12px", marginTop: "8px" }}>USCIS counts the departure and return days as days in the U.S.</p>
                </div>
              ) : (
                data.trips.map((trip, i) => {
                  const tripDays = trip.departure && trip.return ? daysBetween(trip.departure, trip.return) : 0;
                  return (
                    <div key={i} style={{ background: "#0d1117", borderRadius: "8px", padding: "14px", marginBottom: "8px", border: "1px solid #1e293b" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>Trip #{i + 1}</span>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {tripDays > 0 && <Badge type={tripDays >= 365 ? "fail" : tripDays >= 180 ? "warn" : "neutral"}>{tripDays} days</Badge>}
                          <button onClick={() => update("trips", data.trips.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}><Icons.trash /></button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <Field label="Destination" value={trip.destination} onChange={v => { const t = [...data.trips]; t[i] = { ...t[i], destination: v }; update("trips", t); }} placeholder="Country" />
                        <Field label="Purpose" value={trip.purpose} onChange={v => { const t = [...data.trips]; t[i] = { ...t[i], purpose: v }; update("trips", t); }} placeholder="Vacation, Family, etc." />
                        <Field label="Departure Date" type="date" value={trip.departure} onChange={v => { const t = [...data.trips]; t[i] = { ...t[i], departure: v }; update("trips", t); }} />
                        <Field label="Return Date" type="date" value={trip.return} onChange={v => { const t = [...data.trips]; t[i] = { ...t[i], return: v }; update("trips", t); }} />
                      </div>
                    </div>
                  );
                })
              )}
            </Card>

            {data.trips.length > 0 && (
              <Card title="Trip Summary">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{data.trips.length}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Total Trips</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: totalDaysOutside > (requiredYears * 365 - requiredPresenceDays) ? "#f87171" : "#fbbf24", fontFamily: "monospace" }}>{totalDaysOutside}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Total Days Outside</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: longestTrip >= 180 ? "#f87171" : "#4ade80", fontFamily: "monospace" }}>{longestTrip}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Longest Trip (days)</div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ─── TAX HISTORY ─── */}
        {tab === "taxes" && (
          <Card title="Tax Filing History" icon={<Icons.tax />}
            action={<Btn small onClick={() => update("taxYears", [...data.taxYears, { year: "", status: "Single", agi: "", refundOwed: "", filedWith: "", accepted: true }])}><Icons.plus /> Add Year</Btn>}>
            {data.taxYears.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
                <p style={{ fontSize: "14px" }}>No tax years recorded. Add your filing history for the N-400 interview.</p>
              </div>
            ) : (
              data.taxYears.map((tax, i) => (
                <div key={i} style={{ background: "#0d1117", borderRadius: "8px", padding: "14px", marginBottom: "8px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>Tax Year {tax.year || "—"}</span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Badge type={tax.accepted ? "pass" : "warn"}>{tax.accepted ? "FILED" : "PENDING"}</Badge>
                      <button onClick={() => update("taxYears", data.taxYears.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}><Icons.trash /></button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <Field label="Tax Year" value={tax.year} onChange={v => { const t = [...data.taxYears]; t[i] = { ...t[i], year: v }; update("taxYears", t); }} placeholder="2024" />
                    <Field label="Filing Status" value={tax.status} onChange={v => { const t = [...data.taxYears]; t[i] = { ...t[i], status: v }; update("taxYears", t); }} options={[
                      { value: "Single", label: "Single" },
                      { value: "MFJ", label: "Married Filing Jointly" },
                      { value: "MFS", label: "Married Filing Separately" },
                      { value: "HOH", label: "Head of Household" },
                    ]} />
                    <Field label="AGI" value={tax.agi} onChange={v => { const t = [...data.taxYears]; t[i] = { ...t[i], agi: v }; update("taxYears", t); }} placeholder="$28,700" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <Field label="Refund / (Owed)" value={tax.refundOwed} onChange={v => { const t = [...data.taxYears]; t[i] = { ...t[i], refundOwed: v }; update("taxYears", t); }} placeholder="$2,341 or ($1,001)" />
                    <Field label="Filed With" value={tax.filedWith} onChange={v => { const t = [...data.taxYears]; t[i] = { ...t[i], filedWith: v }; update("taxYears", t); }} placeholder="FreeTaxUSA, TurboTax" />
                  </div>
                </div>
              ))
            )}
          </Card>
        )}

        {/* ─── DOCUMENTS ─── */}
        {tab === "documents" && (
          <>
            <Card title="Document Checklist" icon={<Icons.doc />}
              action={<Btn small onClick={() => update("documents", [...data.documents, { name: "", ready: false, notes: "" }])}><Icons.plus /> Add Item</Btn>}>
              {data.documents.length === 0 ? (
                <>
                  <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "14px", marginBottom: "12px" }}>
                    Start with the standard N-400 checklist:
                  </div>
                  <Btn variant="secondary" onClick={() => update("documents", [
                    { name: "Green Card (I-551)", ready: false, notes: "" },
                    { name: "Valid Passport", ready: false, notes: "" },
                    { name: "Two Passport Photos", ready: false, notes: "" },
                    { name: "Marriage Certificate", ready: false, notes: "" },
                    { name: "Divorce Decree", ready: false, notes: "" },
                    { name: "Tax Returns (5 years)", ready: false, notes: "" },
                    { name: "IRS Account Transcripts (5 years)", ready: false, notes: "" },
                    { name: "W-2 Forms (5 years)", ready: false, notes: "" },
                    { name: "Proof of Address (lease/utilities)", ready: false, notes: "" },
                    { name: "Driver's License", ready: false, notes: "" },
                    { name: "Employment Verification Letter", ready: false, notes: "" },
                  ])} style={{ width: "100%" }}>
                    📋 Load Standard N-400 Checklist
                  </Btn>
                </>
              ) : (
                data.documents.map((doc, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: i < data.documents.length - 1 ? "1px solid #1e293b" : "none" }}>
                    <button onClick={() => { const d = [...data.documents]; d[i] = { ...d[i], ready: !d[i].ready }; update("documents", d); }}
                      style={{ width: "22px", height: "22px", borderRadius: "6px", border: doc.ready ? "none" : "2px solid #334155", background: doc.ready ? "#16a34a" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {doc.ready && <Icons.check />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <input value={doc.name} onChange={e => { const d = [...data.documents]; d[i] = { ...d[i], name: e.target.value }; update("documents", d); }}
                        style={{ background: "none", border: "none", color: doc.ready ? "#4ade80" : "#e2e8f0", fontSize: "14px", width: "100%", outline: "none", textDecoration: doc.ready ? "line-through" : "none" }}
                        placeholder="Document name" />
                      <input value={doc.notes} onChange={e => { const d = [...data.documents]; d[i] = { ...d[i], notes: e.target.value }; update("documents", d); }}
                        style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", width: "100%", outline: "none", marginTop: "2px" }}
                        placeholder="Notes..." />
                    </div>
                    <button onClick={() => update("documents", data.documents.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px", flexShrink: 0 }}><Icons.trash /></button>
                  </div>
                ))
              )}
            </Card>
            {docsTotal > 0 && (
              <Card>
                <ProgressBar value={docsReady} max={docsTotal} color="#4ade80" label="Documents Ready" sublabel={`${docsReady} of ${docsTotal}`} />
              </Card>
            )}
          </>
        )}

        {/* ─── ADDRESSES ─── */}
        {tab === "addresses" && (
          <Card title="Address History" icon={<Icons.home />}
            action={<Btn small onClick={() => update("addresses", [...data.addresses, { address: "", from: "", to: "" }])}><Icons.plus /> Add Address</Btn>}>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
              List all addresses since becoming a permanent resident. USCIS will ask for your complete address history.
            </div>
            {data.addresses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "14px" }}>No addresses recorded yet.</div>
            ) : (
              data.addresses.map((addr, i) => (
                <div key={i} style={{ background: "#0d1117", borderRadius: "8px", padding: "14px", marginBottom: "8px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                    <button onClick={() => update("addresses", data.addresses.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}><Icons.trash /></button>
                  </div>
                  <Field label="Address" value={addr.address} onChange={v => { const a = [...data.addresses]; a[i] = { ...a[i], address: v }; update("addresses", a); }} placeholder="11401 3rd Ave SE, Apt Q6, Everett, WA 98208" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <Field label="From" type="date" value={addr.from} onChange={v => { const a = [...data.addresses]; a[i] = { ...a[i], from: v }; update("addresses", a); }} />
                    <Field label="To" type="date" value={addr.to} onChange={v => { const a = [...data.addresses]; a[i] = { ...a[i], to: v }; update("addresses", a); }} />
                  </div>
                </div>
              ))
            )}
          </Card>
        )}

        {/* ─── EMPLOYMENT ─── */}
        {tab === "employment" && (
          <Card title="Employment History" icon={<Icons.brief />}
            action={<Btn small onClick={() => update("employmentHistory", [...data.employmentHistory, { employer: "", title: "", from: "", to: "", current: false }])}><Icons.plus /> Add Job</Btn>}>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
              List all employers since becoming a permanent resident. Include self-employment.
            </div>
            {data.employmentHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "14px" }}>No employment history recorded yet.</div>
            ) : (
              data.employmentHistory.map((job, i) => (
                <div key={i} style={{ background: "#0d1117", borderRadius: "8px", padding: "14px", marginBottom: "8px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {job.current && <Badge type="pass">CURRENT</Badge>}
                    </div>
                    <button onClick={() => update("employmentHistory", data.employmentHistory.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}><Icons.trash /></button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <Field label="Employer" value={job.employer} onChange={v => { const e = [...data.employmentHistory]; e[i] = { ...e[i], employer: v }; update("employmentHistory", e); }} placeholder="Company name" />
                    <Field label="Title" value={job.title} onChange={v => { const e = [...data.employmentHistory]; e[i] = { ...e[i], title: v }; update("employmentHistory", e); }} placeholder="Job title" />
                    <Field label="From" type="date" value={job.from} onChange={v => { const e = [...data.employmentHistory]; e[i] = { ...e[i], from: v }; update("employmentHistory", e); }} />
                    <Field label="To (leave blank if current)" type="date" value={job.to} onChange={v => { const e = [...data.employmentHistory]; e[i] = { ...e[i], to: v }; update("employmentHistory", e); }} />
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#8899aa" }}>
                      <input type="checkbox" checked={job.current} onChange={e => { const em = [...data.employmentHistory]; em[i] = { ...em[i], current: e.target.checked, to: e.target.checked ? "" : em[i].to }; update("employmentHistory", em); }} />
                      Currently employed here
                    </label>
                  </div>
                </div>
              ))
            )}
          </Card>
        )}

        {/* ─── SETTINGS ─── */}
        {tab === "settings" && (
          <>
            <Card title="Applicant Profile" icon={<Icons.flag />}>
              <Field label="Full Legal Name" value={data.fullName} onChange={v => update("fullName", v)} placeholder="Mauro N. Gonzalez Dominguez" />
              <Field label="Alien Registration Number (A-Number)" value={data.alienNumber} onChange={v => update("alienNumber", v)} placeholder="A-XXX-XXX-XXX" />
              <Field label="Green Card Date (Resident Since)" type="date" value={data.greenCardDate} onChange={v => update("greenCardDate", v)} />
              <div style={{ marginTop: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "#c8d6e5" }}>
                  <input type="checkbox" checked={data.marriageBasedTrack} onChange={e => update("marriageBasedTrack", e.target.checked)} />
                  3-Year track (married to U.S. citizen)
                </label>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", marginLeft: "26px" }}>
                  Check if you're filing under the 3-year marriage-to-citizen provision. Otherwise, the standard 5-year track applies.
                </div>
              </div>
            </Card>

            {data.greenCardDate && (
              <Card title="Eligibility Summary">
                <div style={{ display: "grid", gap: "8px", fontSize: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8899aa" }}>Track</span>
                    <span style={{ color: "#e2e8f0" }}>{data.marriageBasedTrack ? "3-Year (Marriage)" : "5-Year (Standard)"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8899aa" }}>Green Card Date</span>
                    <span style={{ color: "#e2e8f0" }}>{formatDate(data.greenCardDate)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8899aa" }}>{requiredYears}-Year Anniversary</span>
                    <span style={{ color: "#e2e8f0" }}>{formatDate(fiveYearDate)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8899aa" }}>Earliest Filing (90 days early)</span>
                    <span style={{ color: "#4ade80", fontWeight: 600 }}>{formatDate(earliestFiling)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8899aa" }}>Physical Presence Required</span>
                    <span style={{ color: "#e2e8f0" }}>{requiredPresenceDays} days ({data.marriageBasedTrack ? "18" : "30"} months)</span>
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", color: "#f87171", fontWeight: 600 }}>Reset All Data</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Clear all saved data and start over</div>
                </div>
                <Btn variant="danger" small onClick={() => { if (confirm("Are you sure? This will delete all your data.")) { setData(defaultState); } }}>Reset</Btn>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px", color: "#334155", fontSize: "11px", borderTop: "1px solid #1e293b", marginTop: "40px" }}>
        N400 Tracker — Naturalization Eligibility Tracker · Not legal advice · Consult an immigration attorney for your specific situation
      </div>
    </div>
  );
}
