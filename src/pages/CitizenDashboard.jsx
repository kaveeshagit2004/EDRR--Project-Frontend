import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import StatusBadge from '../components/StatusBadge';
import WeatherCard from '../components/WeatherCard';
import { getAllReports, getAllWaterLevels, getReportStats, getDamageReportingStatus } from '../api/api';
import RecoveryProgressBar from '../components/RecoveryProgressBar';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';
import { getRecordAlertInfo } from '../utils/waterAlerts';

export default function CitizenDashboard() {
  const [reports, setReports] = useState([]);
  const [waterLevels, setWaterLevels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [reportingOpen, setReportingOpen] = useState(() => {
    return localStorage.getItem('edrr_damage_reporting_open') === 'true';
  });

  useEffect(() => {
    const loadPublicData = () => {
      Promise.all([
        getAllReports().catch(() => ({ data: [] })),
        getAllWaterLevels().catch(() => ({ data: [] })),
        getReportStats().catch(() => ({ data: {} })),
        getDamageReportingStatus().catch(() => ({ data: {} }))
      ])
        .then(([r, w, s, statusRes]) => {
          setReports((r.data || []).filter(report => report.status !== 'REJECTED'));
          setWaterLevels(w.data || []);
          setStats(s.data || {});
          if (statusRes.data && statusRes.data.open !== undefined) {
            const isOpen = Boolean(statusRes.data.open);
            setReportingOpen(isOpen);
            localStorage.setItem('edrr_damage_reporting_open', isOpen);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    loadPublicData();
    // Fast polling every 5s to immediately reflect water level updates from Irrigation Officers
    const interval = setInterval(loadPublicData, 5000);
    // Instant refresh on window focus
    const handleFocus = () => loadPublicData();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const majorWater = waterLevels.filter(w => getRecordAlertInfo(w).status === 'MAJOR');
  const warningWater = waterLevels.filter(w => {
    const info = getRecordAlertInfo(w);
    return info.status === 'MINOR' || info.status === 'ALERT';
  });
  const activeAlertsCount = waterLevels.filter(w => getRecordAlertInfo(w).status !== 'NORMAL').length;

  return (
    <div className="citizen-home-page">
      <PublicNavbar />
      <main className="citizen-home-content">
        <section className="citizen-hero">
          <div>
            <span className="hero-kicker">OFFICIAL ENVIRONMENTAL RESPONSE PLATFORM</span>
            <h1>Protect your community through <span>better awareness.</span></h1>
            <p>View environmental damage reports, monitor river water levels and stay informed about local flood warnings.</p>

            <div className="citizen-risk-panel card-surface">
              <div className="risk-panel-top">
                <div>
                  <span>Current condition</span>
                  <h3>Environmental Overview</h3>
                </div>
                <span className="live-dot-label"><i /> LIVE</span>
              </div>

              <div className="mini-stat-grid">
                <div>
                  <span>Active Reports</span>
                  <strong>{stats.total || reports.length || 0}</strong>
                </div>

                <div>
                  <span>Water Alerts</span>
                  <strong style={{ color: activeAlertsCount > 0 ? '#dc2626' : undefined }}>
                    {activeAlertsCount}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="citizen-hero-side">
            <WeatherCard />
          </div>
        </section>

        {/* GA Admin Alert Announcement: under main heading, sub heading, current condition card, weather forecast card, and above "CRITICAL FLOOD WARNING ACTIVE" */}
        <div style={{ maxWidth: 1180, margin: '20px auto 0', padding: '0 16px' }}>
          <AlertAnnouncementBanner />
        </div>

        {/* GA Admin Activated Damage Reporting Notice */}
        {reportingOpen && (
          <div style={{
            maxWidth: 1180,
            margin: '20px auto 28px',
            padding: '14px 20px',
            background: '#ffffff',
            border: '2px solid #235347',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 2px 10px rgba(11,43,38,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}></span>
              <div>
                <strong style={{ color: '#0B2B26', fontSize: 15, display: 'block' }}>
                  Citizen Reporting is Open
                </strong>
                <span style={{ color: '#235347', fontSize: 13 }}>
                  The Government Agent has activated the public reporting portal. Citizens can report flood damage, blocked roads, and landslides for authority response.
                </span>
              </div>
            </div>
            <Link
              to="/citizen/report-damage"
              style={{
                background: '#235347',
                color: '#DAF1DE',
                padding: '9px 18px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              Go to Citizen Report Uploader →
            </Link>
          </div>
        )}

        {majorWater.length > 0 && (
          <section className="critical-banner" style={{ marginTop: '24px', background: '#dc2626', color: '#fff', borderLeft: '6px solid #991b1b' }}>
            <div>
              <span style={{ color: '#fee2e2', fontWeight: 800 }}>🚨 MAJOR FLOOD WARNING ACTIVE</span>
              <h3 style={{ color: '#fff' }}>{majorWater.map(w => w.locationName).join(', ')}</h3>
              <p style={{ color: '#fee2e2' }}>One or more water monitoring locations have reached or exceeded Major Flood Level.</p>
            </div>
            <Link to="/citizen/alerts" style={{ background: '#fff', color: '#dc2626', fontWeight: 800 }}>View Alerts →</Link>
          </section>
        )}

        {majorWater.length === 0 && warningWater.length > 0 && (
          <section className="critical-banner" style={{ marginTop: '24px', background: '#ea580c', color: '#fff', borderLeft: '6px solid #c2410c' }}>
            <div>
              <span style={{ color: '#ffedd5', fontWeight: 800 }}>⚠️ FLOOD ADVISORY ACTIVE</span>
              <h3 style={{ color: '#fff' }}>{warningWater.map(w => w.locationName).join(', ')}</h3>
              <p style={{ color: '#ffedd5' }}>One or more stations are currently at Minor Flood or Alert water levels.</p>
            </div>
            <Link to="/citizen/alerts" style={{ background: '#fff', color: '#ea580c', fontWeight: 800 }}>View Alerts →</Link>
          </section>
        )}

        <section className="home-section two-column-home">
          <div className="home-main-column">

            <div className="home-section-heading">
              <div>
                <span className="page-eyebrow">PUBLIC REPORTS</span>
                <h2>Recent Damage Reports</h2>
              </div>

              <Link to="/citizen/reports">View all reports →</Link>
            </div>

            {loading ? (
              <div className="page-loading card-surface">
                Loading reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-card card-surface">
                <h3>No reports available</h3>
              </div>
            ) : (
              reports.slice(0, 3).map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onPhotoClick={photos => {
                    setSelectedPhotos(photos);
                    setPhotoIndex(0);
                  }}
                />
              ))
            )}

          </div>

          <aside className="home-side-column">

            <div className="home-section-heading">
              <div>
                <span className="page-eyebrow">WATER LEVELS</span>
                <h2>Live Monitor</h2>
              </div>

              <Link to="/citizen/water">View all →</Link>
            </div>

            <div className="side-water-stack">

              {waterLevels.slice(0, 4).map(w => (
                <WaterMiniCard key={w.id} water={w} />
              ))}

              {!waterLevels.length && !loading && (
                <div className="empty-card card-surface">
                  <p>No water-level data available.</p>
                </div>
              )}

            </div>
          </aside>
        </section>
      </main>

      {selectedPhotos && (
        <div className="photo-modal" onClick={() => setSelectedPhotos(null)}>
          <div className="photo-modal-card" onClick={e => e.stopPropagation()}>

            <button
              className="photo-modal-close"
              onClick={() => setSelectedPhotos(null)}
            >
              ×
            </button>

            {selectedPhotos.length > 1 && (
              <button
                className="photo-prev"
                onClick={() =>
                  setPhotoIndex(
                    (photoIndex - 1 + selectedPhotos.length) %
                    selectedPhotos.length
                  )
                }
              >
                ‹
              </button>
            )}

            <img
              src={selectedPhotos[photoIndex]}
              alt="Report detail"
            />

            {selectedPhotos.length > 1 && (
              <button
                className="photo-next"
                onClick={() =>
                  setPhotoIndex(
                    (photoIndex + 1) %
                    selectedPhotos.length
                  )
                }
              >
                ›
              </button>
            )}

            <div className="photo-count">
              {photoIndex + 1} / {selectedPhotos.length}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function ReportCard({ report, onPhotoClick }) {
  return (
    <article className="dashboard-report-card card-surface">

      <div className="dashboard-report-head">
        <div>
          <span className="report-number">{report.reportNumber}</span>
          <h3>{report.title}</h3>
        </div>

        <StatusBadge status={report.status} />
      </div>

      <a
        className="dashboard-report-location"
        href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {report.location} <span>View Map</span>
      </a>

      <div className="dashboard-report-tags">
        <span className={`severity-tag ${(report.severity || '').toLowerCase()}`}>
          {report.severity}
        </span>

        <span>{report.damageType?.replace('_', ' ')}</span>

        {report.reporterName && (
          <span>Reported by : {report.reporterName}</span>
        )}
      </div>

      {report.description && (
        <p className="dashboard-report-desc">
          {report.description}
        </p>
      )}

      {report.photoUrls?.length > 0 && (
        <div
          className="dashboard-report-photo"
          onClick={() => onPhotoClick(report.photoUrls)}
        >
          <img
            src={report.photoUrls[0]}
            alt={report.title}
          />

          {report.photoUrls.length > 1 && (
            <span>+{report.photoUrls.length - 1} more</span>
          )}
        </div>
      )}

      <RecoveryProgressBar
        status={report.status}
        recoveryProgress={report.recoveryProgress}
      />

    </article>
  );
}

function WaterMiniCard({ water }) {
  const alertInfo = getRecordAlertInfo(water);
  const major = water.majorFloodLevel != null ? water.majorFloodLevel : (water.maximumLimit != null ? water.maximumLimit : 5.0);
  const minor = water.minorFloodLevel != null ? water.minorFloodLevel : (major * 0.8).toFixed(1);
  const alert = water.alertWaterLevel != null ? water.alertWaterLevel : (major * 0.6).toFixed(1);
  const current = Number(water.currentLevel || 0);
  const pct = Math.min(Math.round((current / (major > 0 ? major : 5.0)) * 100), 100);

  return (
    <article
      className="side-water-card card-surface"
      style={{
        borderLeft: `5px solid ${alertInfo.borderColor}`,
        background: alertInfo.status !== 'NORMAL' ? alertInfo.bgTint : undefined,
        border: `1.5px solid ${alertInfo.borderColor}66`,
        borderLeftWidth: '5px',
        transition: 'all 0.3s ease'
      }}
    >
      <div className="side-water-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '0.92rem', margin: 0, color: '#0B2B26', fontWeight: 700 }}>{water.locationName}</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>{water.district} District</p>
          {(water.reporterName || water.updatedByName || water.officerName) && (
            <p style={{ fontSize: '0.74rem', color: '#235347', margin: '3px 0 0', fontWeight: 600 }}>
              Reported by : {water.reporterName || water.updatedByName || water.officerName}
            </p>
          )}
        </div>

        <span
          style={{
            background: alertInfo.badgeBg,
            color: alertInfo.badgeText,
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
          }}
        >
          {alertInfo.badgeLabel}
        </span>
      </div>

      <div className="side-water-value" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <strong style={{ fontSize: '1.35rem', color: alertInfo.status !== 'NORMAL' ? alertInfo.textColor : '#0B2B26' }}>
            {water.currentLevel} m
          </strong>
          <span style={{ display: 'block', fontSize: '0.72rem', color: alertInfo.status !== 'NORMAL' ? alertInfo.textColor : '#6b7280', marginTop: 2 }}>
            {pct}% of Major ({major}m)
          </span>
        </div>
        {alertInfo.status !== 'NORMAL' && (
          <span style={{ fontSize: '0.70rem', fontWeight: 700, color: alertInfo.textColor, background: '#ffffffcc', padding: '2px 6px', borderRadius: 4, border: `1px solid ${alertInfo.borderColor}88` }}>
            {alertInfo.icon} {alertInfo.label}
          </span>
        )}
      </div>

      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: alertInfo.borderColor,
            borderRadius: 99,
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#6b7280', marginTop: 4 }}>
        <span style={{ color: '#235347' }}>Normal</span>
        <span style={{ color: '#854d0e' }}>Alt: {alert}m</span>
        <span style={{ color: '#9a3412' }}>Min: {minor}m</span>
        <span style={{ color: '#991b1b' }}>Maj: {major}m</span>
      </div>
    </article>
  );
}