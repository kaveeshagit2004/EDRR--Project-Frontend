import React, { useEffect, useState } from 'react';
import PublicPageShell from '../components/PublicPageShell';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';
import { getAllReports, getAllWaterLevels } from '../api/api';
import { getRecordAlertInfo } from '../utils/waterAlerts';

export default function CitizenAlertsPage() {
  const [levels, setLevels] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = () => {
      Promise.all([getAllWaterLevels(), getAllReports()])
        .then(([w, r]) => {
          setLevels(w.data || []);
          setReports((r.data || []).filter(x => x.status !== 'REJECTED'));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
    const handleFocus = () => loadAlerts();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const waterAlerts = levels.filter(w => {
    const info = getRecordAlertInfo(w);
    return info.status !== 'NORMAL';
  });
  const criticalReports = reports.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').slice(0, 8);

  return (
    <PublicPageShell eyebrow="SAFETY UPDATES" title="Alerts & Warnings" description="Stay informed about flood risks and high-priority environmental damage reports.">
      {/* GA Admin Official Alert Announcement Banner */}
      <AlertAnnouncementBanner />

      {loading ? <div className="page-loading">Loading alerts...</div> : (
        <div className="alerts-layout">
          <section className="content-section">
            <div className="section-heading-inline"><div><span className="page-eyebrow">FLOOD MONITORING</span><h2>Water Level Alerts</h2></div><span className="count-badge">{waterAlerts.length}</span></div>
            {waterAlerts.length === 0 ? (
              <div className="empty-card card-surface"><div className="empty-icon success">✓</div><h3>No active flood warnings</h3><p>All available monitoring stations are currently within normal levels.</p></div>
            ) : waterAlerts.map(w => {
              const alertInfo = getRecordAlertInfo(w);
              return (
                <article
                  key={w.id}
                  className="alert-list-card card-surface"
                  style={{
                    borderLeft: `5px solid ${alertInfo.borderColor}`,
                    background: alertInfo.bgTint
                  }}
                >
                  <div
                    className="alert-symbol"
                    style={{
                      background: alertInfo.badgeBg,
                      color: alertInfo.badgeText
                    }}
                  >
                    {alertInfo.icon}
                  </div>
                  <div className="alert-list-content">
                    <span
                      className="alert-kicker"
                      style={{ color: alertInfo.textColor, fontWeight: 800 }}
                    >
                      {alertInfo.badgeLabel} &middot; {w.district} DISTRICT
                    </span>
                    <h3 style={{ color: alertInfo.textColor }}>{w.locationName}</h3>
                    <p style={{ color: alertInfo.textColor }}>
                      Current level: <strong>{w.currentLevel} m</strong> &middot; Major: {w.majorFloodLevel || w.maximumLimit || 5.0} m &middot; Minor: {w.minorFloodLevel || 4.0} m &middot; Alert: {w.alertWaterLevel || 3.0} m
                      {(w.reporterName || w.updatedByName || w.officerName) && ` · Reported by : ${w.reporterName || w.updatedByName || w.officerName}`}
                    </p>
                  </div>
                  <div className="alert-metric">
                    <strong style={{ color: alertInfo.borderColor }}>{w.currentLevel} m</strong>
                    <span>{w.trend || 'Live'}</span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="content-section">
            <div className="section-heading-inline"><div><span className="page-eyebrow">HIGH PRIORITY</span><h2>Damage Notices</h2></div><span className="count-badge">{criticalReports.length}</span></div>
            {criticalReports.length === 0 ? (
              <div className="empty-card card-surface"><h3>No high-priority damage notices</h3><p>New high-priority reports will appear here.</p></div>
            ) : criticalReports.map(r => (
              <article key={r.id} className="notice-row card-surface">
                <div className="notice-icon">!</div>
                <div>
                  <span className="notice-meta">{r.reportNumber || `Report ${r.id}`} · {r.severity}</span>
                  <h3>{r.title}</h3>
                  <p>
                    {r.location}{r.status && r.status !== 'PENDING' ? ` · ${r.status.replace('_', ' ')}` : ''}
                    {r.reporterName && ` · Reported by : ${r.reporterName}`}
                  </p>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </PublicPageShell>
  );
}
