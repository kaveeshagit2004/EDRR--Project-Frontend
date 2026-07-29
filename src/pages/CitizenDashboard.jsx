import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getAllReports, getAllWaterLevels, getReportStats } from "../api/api";
import { getStagesForType, getStageLabel } from "../utils/stages";
import govLogo from "../assets/gov-logo.png";

const NAV = [
  { path: "/citizen", icon: "", label: "Home" },
  { path: "/citizen/map", icon: "", label: "Map" },
  { path: "/citizen/alerts", icon: "", label: "Alerts" },
  { path: "/citizen/contact", icon: "", label: "Contact" },
  { path: "/citizen/feedback", icon: "", label: "Feedback" },
  { path: "/citizen/about", icon: "️", label: "About Us" },
  { path: "/citizen/profile", icon: "", label: "Profile" },
  { path: "/citizen/water", icon: "", label: "Water Levels" },
];

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [tab, setTab] = useState("home");
  const [reports, setReports] = useState([]);
  const [waterLevels, setWaterLevels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const user = { fullName: "Citizen" };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    Promise.all([getAllReports(), getAllWaterLevels(), getReportStats()])
      .then(([r, w, s]) => {
        const activeReports = (r.data || []).filter(report => report.status !== 'REJECTED');
        setReports(activeReports);
        setWaterLevels(w.data);
        setStats(s.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const criticalWater = waterLevels.filter((w) => w.status === "CRITICAL");

  // if (loading) return <Loading />;

  const S = getStyles(isMobile);

  return (
    <div style={S.page}>
      {isMobile && <Sidebar role="Citizen" links={NAV} />}
      
      {/* ── LEFT GLASS PANEL (Sidebar in 1b.jpeg style) ── */}
      <div style={S.leftPanel}>
        <img src={govLogo} alt="Sri Lanka National Emblem" style={S.logo} />
        <h1 style={S.leftTitle}>EDRR System</h1>
        <h2 style={S.leftSub}>Environmental Damage Reporting &amp; Recovery</h2>
        <span style={S.leftBadge}>Matara District, Sri Lanka</span>
        
        <p style={S.leftDesc}>
          A unified portal for citizens to view active disaster reports, monitor river water levels, and stay updated on local flood warnings.
        </p>

        <div style={S.leftNav}>
          {[
            ["home", " Home"],
            ["reports", "Damage Reports"],
            ["water", "Water Levels"],
          ].map(([k, l]) => (
            <button
              key={k}
              style={tab === k ? S.leftTabActive : S.leftTab}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <button
            style={S.portalBtn}
            onClick={() => navigate('/login?redirectTo=/admin/officers')}
          >
             Officer Login
          </button>
        </div>
      </div>

      {/* ── RIGHT CONTENT AREA ── */}
      <div style={S.content}>
        <div style={S.contentInner}>
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
                      {w.locationName} — <b>{w.percentageOfMax}%</b> of maximum limit
                    </div>
                  ))}
                </div>
              )}
  
              <div style={S.statsGrid}>
                {[
                  {
                    label: "Active Reports",
                    val: stats.total || 0,
                    icon: "",
                    color: "#1a3c1a",
                    bg: "rgba(232, 245, 233, 0.95)",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                  },
                  {
                    label: "Water Alerts",
                    val: waterLevels.filter((w) => w.status !== "NORMAL").length,
                    icon: "",
                    color: "#1a3c1a",
                    bg: "rgba(232, 245, 233, 0.95)",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                  },
                  {
                    label: "In Progress",
                    val: stats.inProgress || 0,
                    icon: "",
                    color: "#1a3c1a",
                    bg: "rgba(232, 245, 233, 0.95)",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                  },
                  {
                    label: "Resolved",
                    val: stats.resolved || 0,
                    icon: "",
                    color: "#1a3c1a",
                    bg: "rgba(232, 245, 233, 0.95)",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                  },
                ].map((s) => (
                  <div key={s.label} style={{ ...S.statCard, background: s.bg, border: s.border }}>
                    <div style={{ ...S.statNum, color: s.color }}>{s.val}</div>
                    <div style={S.statIcon}>{s.icon}</div>
                    <div style={S.statLabel}>{s.label}</div>
                  </div>
                ))}
              </div>
  
              <h3 style={S.sectionTitle}>Recent Damage Reports</h3>
              {reports.slice(0, 3).map((r) => (
                <ReportCard key={r.id} report={r} S={S} onPhotoClick={(photos) => { setSelectedPhotos(photos); setPhotoIndex(0); }} />
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
                reports.map((r) => <ReportCard key={r.id} report={r} S={S} onPhotoClick={(photos) => { setSelectedPhotos(photos); setPhotoIndex(0); }} />)
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
                waterLevels.map((w) => <WaterCard key={w.id} wl={w} S={S} />)
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PHOTO SLIDER MODAL ── */}
      {selectedPhotos && (
        <div style={S.modalOverlay} onClick={() => setSelectedPhotos(null)}>
          <div style={S.modalContent} onClick={e => e.stopPropagation()}>
            <button style={S.modalClose} onClick={() => setSelectedPhotos(null)}>✕</button>
            
            <div style={S.sliderContainer}>
              {selectedPhotos.length > 1 && (
                <button style={S.navBtnLeft} onClick={() => setPhotoIndex((photoIndex - 1 + selectedPhotos.length) % selectedPhotos.length)}>
                  ◀
                </button>
              )}
              
              <img src={selectedPhotos[photoIndex]} alt="Report detail" style={S.sliderImg} />
              
              {selectedPhotos.length > 1 && (
                <button style={S.navBtnRight} onClick={() => setPhotoIndex((photoIndex + 1) % selectedPhotos.length)}>
                  ▶
                </button>
              )}
            </div>
            
            {selectedPhotos.length > 1 && (
              <div style={S.sliderDots}>
                {selectedPhotos.map((_, idx) => (
                  <span 
                    key={idx} 
                    style={{
                      ...S.sliderDot, 
                      background: idx === photoIndex ? GREEN : '#d1d5db'
                    }}
                    onClick={() => setPhotoIndex(idx)}
                  />
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 8, color: '#6b7280', fontSize: 12, fontWeight: 600 }}>
              {photoIndex + 1} / {selectedPhotos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onPhotoClick, S }) {
  const stages = getStagesForType(report.damageType);
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
    <div style={{ ...S.card, borderLeft: `5px solid #2d5a27` }}>
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
      <p style={S.cardSub}>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}
        >
          📍 {report.location} <span style={{ fontSize: 10, color: '#2d5a27', marginLeft: 4 }}>(View Map)</span>
        </a>
      </p>
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}
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
        {report.reporterName && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>By: {report.reporterName}</span>}
      </div>
      {report.description && <p style={S.desc}>{report.description}</p>}
      {report.photoUrls && report.photoUrls.length > 0 && (
        <div style={{ marginBottom: 12, cursor: 'pointer', position: 'relative', marginTop: 10 }} onClick={() => onPhotoClick(report.photoUrls)}>
          <img src={report.photoUrls[0]} alt={report.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
          {report.photoUrls.length > 1 && (
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
              +{report.photoUrls.length - 1} More Photo{report.photoUrls.length > 2 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      {report.status === "IN_PROGRESS" && (
        <div style={{ marginTop: 10 }}>
          {/* Milestone stepper */}
          <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:6}}>
            {stages.map((stage, i) => {
              const prog = report.recoveryProgress || 0;
              const done = prog >= stage.value;
              const active = prog < stage.value && (i === 0 || prog >= stages[i-1].value);
              return (
                <React.Fragment key={stage.value}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:'0 0 auto'}}>
                    <div style={{
                      width:26,height:26,borderRadius:'50%',
                      background: done ? '#2d5a27' : active ? '#a5d6a7' : '#e5e7eb',
                      border: done ? '2px solid #1a3c1a' : active ? '2px solid #4ade80' : '2px solid #d1d5db',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:10,color: done ? 'white' : '#6b7280',fontWeight:700,boxSizing:'border-box'
                    }}>
                      {done ? '✓' : `${i+1}`}
                    </div>
                    <span style={{fontSize:8,color: done ? '#2d5a27' : active ? '#059669' : '#9ca3af',fontWeight: done ? 700 : 500,textAlign:'center',marginTop:2,maxWidth:50,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {stage.label.split('– ')[1]}
                    </span>
                  </div>
                  {i < stages.length - 1 && (
                    <div style={{flex:1,height:3,background: prog >= stages[i+1].value ? '#2d5a27' : prog >= stage.value ? '#a5d6a7' : '#e5e7eb',marginBottom:12,transition:'background 0.3s'}} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/*<div style={S.progressBg}>*/}
          {/*  <div style={{*/}
          {/*    ...S.progressFill,*/}
          {/*    background: 'linear-gradient(90deg,#3b82f6,#1d4ed8)',*/}
          {/*    width: `${report.recoveryProgress || 0}%`,*/}
          {/*  }} />*/}
          {/*</div>*/}
          {/*<span style={S.progressLabel}>{getStageLabel(report.recoveryProgress || 0)}</span>*/}
        </div>
      )}
    </div>
  );
}

function WaterCard({ wl, S }) {
  const color =
    { NORMAL: "#059669", WARNING: "#d97706", CRITICAL: "#dc2626" }[wl.status] ||
    "#6b7280";
  return (
    <div style={{ ...S.card, borderLeft: `5px solid #2d5a27` }}>
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
const getStyles = (isMobile) => ({
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #06402B 0%, #084c33 50%, #15794a 85%, #80EF80 100%)",
    backgroundAttachment: "fixed",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    fontFamily: "inherit",
  },
  leftPanel: {
    width: isMobile ? "100%" : "380px",
    minWidth: isMobile ? "auto" : "380px",
    background: "rgba(20, 45, 20, 0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRight: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
    borderBottom: isMobile ? "1px solid rgba(255, 255, 255, 0.15)" : "none",
    display: "flex",
    flexDirection: "column",
    padding: isMobile ? "24px 20px" : "40px 30px",
    boxSizing: "border-box",
    color: "white",
    height: isMobile ? "auto" : "100vh",
    position: isMobile ? "relative" : "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: {
    width: 80,
    height: "auto",
    marginBottom: 16,
    alignSelf: isMobile ? "center" : "flex-start",
  },
  leftTitle: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    color: "#fff",
    letterSpacing: "-0.5px",
    textAlign: isMobile ? "center" : "left",
  },
  leftSub: {
    fontSize: 14,
    fontWeight: 400,
    margin: "4px 0 12px 0",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 1.4,
    textAlign: isMobile ? "center" : "left",
  },
  leftBadge: {
    display: "inline-block",
    background: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    color: "#a5d6a7",
    fontSize: 11,
    padding: "4px 12px",
    borderRadius: 20,
    fontWeight: 600,
    alignSelf: isMobile ? "center" : "flex-start",
    marginBottom: 20,
  },
  leftDesc: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 1.5,
    margin: "0 0 24px 0",
    textAlign: isMobile ? "center" : "left",
  },
  leftNav: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },
  leftTab: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  leftTabActive: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #4ade80",
    background: "rgba(74, 222, 128, 0.15)",
    color: "#4ade80",
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  portalBtn: {
    width: "100%",
    padding: "12px 16px",
    background: "none",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "white",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: isMobile ? 16 : 0,
  },
  content: {
    flex: 1,
    padding: isMobile ? "20px 16px" : "40px 60px 40px 40px",
    height: isMobile ? "auto" : "100vh",
    overflowY: isMobile ? "visible" : "auto",
    boxSizing: "border-box",
  },
  contentInner: {
    maxWidth: 900,
    width: "100%",
    margin: isMobile ? "0" : "0 auto",
  },
  title: { 
    fontSize: 24, 
    fontWeight: 800, 
    margin: "0 0 20px", 
    color: "#fff",
    textShadow: "0 2px 4px rgba(0,0,0,0.5)"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: "24px 0 14px",
    color: "#fff",
    textShadow: "0 2px 4px rgba(0,0,0,0.5)"
  },
  alertCard: {
    background: "rgba(254, 226, 226, 0.95)",
    backdropFilter: "blur(10px)",
    borderLeft: "6px solid #ef4444",
    borderTop: "none",
    borderRight: "none",
    borderBottom: "none",
    borderRadius: 14,
    padding: "16px 20px",
    marginBottom: 20,
    color: "#991b1b",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },
  alertTitle: { fontWeight: 800, fontSize: 15, marginBottom: 6 },
  alertItem: { fontSize: 13, marginTop: 4 },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: 14,
    padding: 18,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  statNum: { fontSize: 32, fontWeight: 800 },
  statIcon: { fontSize: 24, margin: "6px 0" },
  statLabel: { fontSize: 12, color: "#475569", fontWeight: 600 },
  card: {
    background: "rgba(240, 248, 240, 0.93)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(74, 222, 128, 0.35)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 4px",
  },
  cardSub: { fontSize: 13, color: "#475569", margin: 0 },
  badge: {
    fontSize: 11,
    color: "white",
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  mono: { fontSize: 11, color: "#64748b", fontFamily: "monospace", fontWeight: 600 },
  metaText: {
    fontSize: 12,
    color: "#475569",
    background: "#f1f5f9",
    padding: "3px 10px",
    borderRadius: 6,
    fontWeight: 600,
  },
  desc: { fontSize: 14, color: "#334155", marginTop: 10, lineHeight: 1.5 },
  progressBg: {
    background: "#e2e8f0",
    borderRadius: 6,
    height: 8,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    transition: "width 0.3s",
  },
  progressLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    display: "block",
    fontWeight: 500,
  },
  wlLabel: { fontSize: 11, color: "#64748b", fontWeight: 500 },
  wlVal: { fontSize: 16, fontWeight: 800, color: "#0f172a" },
  
  // Modal & Slider Styles
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 16,
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    background: 'white', borderRadius: 16, padding: '32px 24px 24px', maxWidth: 600,
    width: '100%', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
  },
  modalClose: {
    position: 'absolute', top: 14, right: 14, background: '#f1f5f9',
    border: 'none', borderRadius: '50%', width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontWeight: 'bold', color: '#475569', zIndex: 10,
    transition: 'all 0.2s',
  },
  sliderContainer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', minHeight: 280, background: '#f8fafc',
    borderRadius: 12, overflow: 'hidden', marginTop: 10,
    border: '1px solid #e2e8f0',
  },
  sliderImg: {
    maxWidth: '100%', maxHeight: 420, objectFit: 'contain'
  },
  navBtnLeft: {
    position: 'absolute', left: 12, background: 'rgba(255,255,255,0.9)',
    border: 'none', borderRadius: '50%', width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontWeight: 'bold', zIndex: 10
  },
  navBtnRight: {
    position: 'absolute', right: 12, background: 'rgba(255,255,255,0.9)',
    border: 'none', borderRadius: '50%', width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontWeight: 'bold', zIndex: 10
  },
  sliderDots: {
    display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14
  },
  sliderDot: {
    width: 9, height: 9, borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s'
  }
});
