import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getAllReports, getAllWaterLevels, getReportStats } from "../api/api";

const NAV = [
  { path: "/citizen", icon: "🏠", label: "Home" },
  { path: "/citizen/map", icon: "🗺️", label: "Map" },
  { path: "/citizen/alerts", icon: "🔔", label: "Alerts" },
  { path: "/citizen/contact", icon: "📞", label: "Contact" },
  { path: "/citizen/feedback", icon: "💬", label: "Feedback" },
  { path: "/citizen/about", icon: "ℹ️", label: "About Us" },
  { path: "/citizen/profile", icon: "👤", label: "Profile" },
  { path: "/citizen/water", icon: "💧", label: "Water Levels" },
];

export default function CitizenDashboard() {
  const [tab, setTab] = useState("home");
  const [reports, setReports] = useState([]);
  const [waterLevels, setWaterLevels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const user = { fullName: "Citizen" };

  useEffect(() => {
    Promise.all([getAllReports(), getAllWaterLevels(), getReportStats()])
      .then(([r, w, s]) => {
        setReports(r.data);
        setWaterLevels(w.data);
        setStats(s.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const criticalWater = waterLevels.filter((w) => w.status === "CRITICAL");

  // if (loading) return <Loading />;

  return (
    <div style={S.page}>
      <Sidebar role="Citizen" links={NAV} />
      <div style={S.content}>
        {/* ── TAB BAR ── */}
        <div style={S.tabBar}>
          {[
            ["home", "🏠 Home"],
            ["reports", "📋 Reports"],
            ["water", "💧 Water"],
          ].map(([k, l]) => (
            <button
              key={k}
              style={tab === k ? S.tabActive : S.tab}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* ── HOME ── */}
        {tab === "home" && (
          <div>
            <h2 style={S.title}>
              Welcome back, {user.fullName?.split(" ")[0] || "Citizen"}!
            </h2>

            {criticalWater.length > 0 && (
              <div style={S.alertCard}>
                <div style={S.alertTitle}>⚠️ Critical Flood Warning Active</div>
                {criticalWater.map((w) => (
                  <div key={w.id} style={S.alertItem}>
                    {w.locationName} — <b>{w.percentageOfMax}%</b> of maximum
                  </div>
                ))}
              </div>
            )}

            <div style={S.statsGrid}>
              {[
                {
                  label: "Active Reports",
                  val: stats.total || 0,
                  icon: "📋",
                  color: "#2d5a27",
                },
                {
                  label: "Water Alerts",
                  val: waterLevels.filter((w) => w.status !== "NORMAL").length,
                  icon: "💧",
                  color: "#1d4ed8",
                },
                {
                  label: "In Progress",
                  val: stats.inProgress || 0,
                  icon: "🔧",
                  color: "#d97706",
                },
                {
                  label: "Resolved",
                  val: stats.resolved || 0,
                  icon: "✅",
                  color: "#059669",
                },
              ].map((s) => (
                <div key={s.label} style={S.statCard}>
                  <div style={{ ...S.statNum, color: s.color }}>{s.val}</div>
                  <div style={S.statIcon}>{s.icon}</div>
                  <div style={S.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <h3 style={S.sectionTitle}>Recent Damage Reports</h3>
            {reports.slice(0, 3).map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === "reports" && (
          <div>
            <h2 style={S.title}>Damage Reports ({reports.length})</h2>
            {reports.length === 0 ? (
              <EmptyState msg="No reports available." />
            ) : (
              reports.map((r) => <ReportCard key={r.id} report={r} />)
            )}
          </div>
        )}

        {/* ── WATER LEVELS ── */}
        {tab === "water" && (
          <div>
            <h2 style={S.title}>Water Levels</h2>
            {waterLevels.length === 0 ? (
              <EmptyState msg="No water level data." />
            ) : (
              waterLevels.map((w) => <WaterCard key={w.id} wl={w} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report }) {
  const PROGRESS_STAGES = [
    { value: 20,  label: '20% – Site Inspection' },
    { value: 40,  label: '40% – Surface Preparation' },
    { value: 60,  label: '60% – Road Repair' },
    { value: 80,  label: '80% – Quality Check' },
    { value: 100, label: '100% – Completed' },
  ];
  const getStageLabel = (pct) => {
    const s = PROGRESS_STAGES.find(s => s.value === pct);
    return s ? s.label : `${pct || 0}%`;
  };
  const sevColor = {
    CRITICAL: "#dc2626",
    HIGH: "#ea580c",
    MEDIUM: "#d97706",
    LOW: "#059669",
  };
  const statColor = {
    PENDING: "#d97706",
    IN_PROGRESS: "#2563eb",
    RESOLVED: "#059669",
    REJECTED: "#dc2626",
  };
  return (
    <div style={S.card}>
      <div style={S.cardTop}>
        <span style={S.mono}>{report.reportNumber}</span>
        <span
          style={{
            ...S.badge,
            background: statColor[report.status] || "#6b7280",
          }}
        >
          {report.status?.replace("_", " ")}
        </span>
      </div>
      <h3 style={S.cardTitle}>{report.title}</h3>
      <p style={S.cardSub}>📍 {report.location}</p>
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}
      >
        <span
          style={{
            ...S.badge,
            background: sevColor[report.severity] || "#6b7280",
          }}
        >
          {report.severity}
        </span>
        <span style={S.metaText}>{report.damageType?.replace("_", " ")}</span>
      </div>
      {report.description && <p style={S.desc}>{report.description}</p>}
      {report.status === "IN_PROGRESS" && (
        <div style={{ marginTop: 10 }}>
          {/* Milestone stepper */}
          <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:6}}>
            {PROGRESS_STAGES.map((stage, i) => {
              const prog = report.recoveryProgress || 0;
              const done = prog >= stage.value;
              const active = prog < stage.value && (i === 0 || prog >= PROGRESS_STAGES[i-1].value);
              return (
                <React.Fragment key={stage.value}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:'0 0 auto'}}>
                    <div style={{
                      width:26,height:26,borderRadius:'50%',
                      background: done ? '#2563eb' : active ? '#93c5fd' : '#e5e7eb',
                      border: done ? '2px solid #1d4ed8' : active ? '2px solid #3b82f6' : '2px solid #d1d5db',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:10,color: done ? 'white' : '#6b7280',fontWeight:700,boxSizing:'border-box'
                    }}>
                      {done ? '✓' : `${i+1}`}
                    </div>
                    <span style={{fontSize:8,color: done ? '#1d4ed8' : active ? '#3b82f6' : '#9ca3af',fontWeight: done ? 700 : 500,textAlign:'center',marginTop:2,maxWidth:50,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {stage.label.split('– ')[1]}
                    </span>
                  </div>
                  {i < PROGRESS_STAGES.length - 1 && (
                    <div style={{flex:1,height:3,background: prog >= PROGRESS_STAGES[i+1].value ? '#2563eb' : prog >= stage.value ? '#93c5fd' : '#e5e7eb',marginBottom:12,transition:'background 0.3s'}} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div style={S.progressBg}>
            <div style={{
              ...S.progressFill,
              background: 'linear-gradient(90deg,#3b82f6,#1d4ed8)',
              width: `${report.recoveryProgress || 0}%`,
            }} />
          </div>
          <span style={S.progressLabel}>{getStageLabel(report.recoveryProgress || 0)}</span>
        </div>
      )}
    </div>
  );
}

function WaterCard({ wl }) {
  const color =
    { NORMAL: "#059669", WARNING: "#d97706", CRITICAL: "#dc2626" }[wl.status] ||
    "#6b7280";
  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${color}` }}>
      <div style={S.cardTop}>
        <div>
          <h3 style={S.cardTitle}>{wl.locationName}</h3>
          <p style={S.cardSub}>📍 {wl.district} District</p>
        </div>
        <span style={{ ...S.badge, background: color }}>{wl.status}</span>
      </div>
      <div style={{ display: "flex", gap: 20, margin: "10px 0" }}>
        {[
          ["Current", `${wl.currentLevel} m`],
          ["Max", `${wl.maximumLimit} m`],
          ["Trend", wl.trend],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={S.wlLabel}>{l}</div>
            <div style={S.wlVal}>{v}</div>
          </div>
        ))}
      </div>
      <div style={S.progressBg}>
        <div
          style={{
            ...S.progressFill,
            width: `${Math.min(wl.percentageOfMax || 0, 100)}%`,
            background: color,
          }}
        />
      </div>
      <span style={S.progressLabel}>
        {wl.percentageOfMax || 0}% of maximum limit
      </span>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div
      style={{
        textAlign: "center",
        color: "#9ca3af",
        padding: "60px 20px",
        fontSize: 15,
      }}
    >
      {msg}
    </div>
  );
}

function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: 16,
        color: "#6b7280",
      }}
    >
      Loading...
    </div>
  );
}

const GREEN = "#2d5a27";
const S = {
  page: { minHeight: "100vh", background: "#f0f2f5", fontFamily: "inherit" },
  content: { padding: "16px", maxWidth: 700, margin: "0 auto" },
  tabBar: {
    display: "flex",
    background: "white",
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  tab: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "none",
    color: "#6b7280",
    fontSize: 13,
    borderRadius: 8,
  },
  tabActive: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: GREEN,
    color: "white",
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
  },
  title: { fontSize: 20, fontWeight: 700, margin: "0 0 16px", color: "#111" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: "20px 0 12px",
    color: "#111",
  },
  alertCard: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 16,
    color: "#991b1b",
  },
  alertTitle: { fontWeight: 700, fontSize: 14, marginBottom: 6 },
  alertItem: { fontSize: 13, marginTop: 4 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    background: "white",
    borderRadius: 10,
    padding: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    textAlign: "center",
  },
  statNum: { fontSize: 30, fontWeight: 800 },
  statIcon: { fontSize: 22, margin: "4px 0" },
  statLabel: { fontSize: 12, color: "#6b7280", fontWeight: 500 },
  card: {
    background: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111",
    margin: "0 0 2px",
  },
  cardSub: { fontSize: 12, color: "#6b7280", margin: 0 },
  badge: {
    fontSize: 11,
    color: "white",
    padding: "3px 9px",
    borderRadius: 20,
    fontWeight: 600,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  mono: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace" },
  metaText: {
    fontSize: 12,
    color: "#6b7280",
    background: "#f3f4f6",
    padding: "2px 8px",
    borderRadius: 4,
  },
  desc: { fontSize: 13, color: "#555", marginTop: 8, lineHeight: 1.5 },
  progressBg: {
    background: "#e5e7eb",
    borderRadius: 4,
    height: 7,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    background: GREEN,
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s",
  },
  progressLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 3,
    display: "block",
  },
  wlLabel: { fontSize: 11, color: "#9ca3af" },
  wlVal: { fontSize: 15, fontWeight: 700, color: "#111" },
};
