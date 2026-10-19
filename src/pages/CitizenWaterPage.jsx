import React, { useEffect, useState } from 'react';
import PublicPageShell from '../components/PublicPageShell';
import { getAllWaterLevels } from '../api/api';
import { getRecordAlertInfo } from '../utils/waterAlerts';
import WaterLevelChart from '../components/WaterLevelChart';

export default function CitizenWaterPage() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState('ALL');

  useEffect(() => {
    const loadLevels = () => {
      getAllWaterLevels()
        .then(r => setLevels(r.data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    loadLevels();
    // Fast polling (5s) so updates from irrigation officers reflect immediately
    const interval = setInterval(loadLevels, 5000);
    // Refresh immediately when user returns to this tab
    const handleFocus = () => loadLevels();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const majorStations = levels.filter(l => getRecordAlertInfo(l).status === 'MAJOR');
  const minorStations = levels.filter(l => getRecordAlertInfo(l).status === 'MINOR');
  const alertStations = levels.filter(l => getRecordAlertInfo(l).status === 'ALERT');
  const normalStations = levels.filter(l => getRecordAlertInfo(l).status === 'NORMAL');

  const hasMajor = majorStations.length > 0;
  const hasMinor = minorStations.length > 0;
  const hasAlert = alertStations.length > 0;

  // Overview risk configuration
  const riskConfig = hasMajor ? {
    icon: '',
    title: 'Major Flood Warning Active',
    desc: `${majorStations.length} station(s) (${majorStations.map(s => s.locationName).join(', ')}) reached Major Flood Level. Inundation hazard active.`,
    bg: '#fee2e2',
    border: '#dc2626',
    textColor: '#991b1b',
    label: 'MAJOR FLOOD'
  } : hasMinor ? {
    icon: '️',
    title: 'Minor Flood Warning Active',
    desc: `${minorStations.length} station(s) (${minorStations.map(s => s.locationName).join(', ')}) reached Minor Flood Level. Low-lying terrain on notice.`,
    bg: '#ffedd5',
    border: '#ea580c',
    textColor: '#9a3412',
    label: 'MINOR FLOOD'
  } : hasAlert ? {
    icon: '',
    title: 'Water Level Alert Active',
    desc: `${alertStations.length} station(s) (${alertStations.map(s => s.locationName).join(', ')}) reached Alert Water Level. Sluice gate monitoring advised.`,
    bg: '#fef9c3',
    border: '#eab308',
    textColor: '#854d0e',
    label: 'ALERT LEVEL'
  } : {
    icon: '',
    title: 'Normal Flood Risk',
    desc: 'All monitored river and stream locations are currently within safe thresholds.',
    bg: '#DAF1DE',
    border: '#235347',
    textColor: '#0B2B26',
    label: 'NORMAL'
  };

  return (
    <PublicPageShell eyebrow="LIVE MONITORING" title="Flood Monitoring" description="View current river and stream water levels and flood-risk status.">
      
      {/* Dynamic Flood Risk Status Banner */}
      <div
        className="risk-overview-card"
        style={{
          background: riskConfig.bg,
          border: `1.5px solid ${riskConfig.border}`,
          borderLeft: `6px solid ${riskConfig.border}`,
          color: riskConfig.textColor,
          marginBottom: 16
        }}
      >
        <div
          className="risk-overview-icon"
          style={{
            background: riskConfig.border,
            color: '#fff',
            fontSize: '1.4rem'
          }}
        >
          {riskConfig.icon}
        </div>
        <div>
          <span style={{ color: riskConfig.textColor, fontWeight: 700, letterSpacing: '0.4px' }}>
            CURRENT FLOOD RISK — {riskConfig.label}
          </span>
          <h2 style={{ color: riskConfig.textColor, margin: '4px 0 6px' }}>{riskConfig.title}</h2>
          <p style={{ color: riskConfig.textColor, opacity: 0.9, margin: 0 }}>{riskConfig.desc}</p>
        </div>
        <div className="risk-overview-count" style={{ borderLeft: `1px solid ${riskConfig.border}55` }}>
          <strong style={{ color: riskConfig.textColor }}>{levels.length}</strong>
          <span style={{ color: riskConfig.textColor }}>Monitoring Stations</span>
        </div>
      </div>

      {/* 4-Tier Water Alert Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fee2e2', border: '1.5px solid #dc2626', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b' }}> MAJOR FLOOD </div>
            <div style={{ fontSize: 12, color: '#991b1b' }}>Critical Threshold</div>
          </div>
          <strong style={{ fontSize: 22, color: '#dc2626' }}>{majorStations.length}</strong>
        </div>

        <div style={{ background: '#ffedd5', border: '1.5px solid #ea580c', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9a3412' }}>️ MINOR FLOOD </div>
            <div style={{ fontSize: 12, color: '#9a3412' }}>Warning Threshold</div>
          </div>
          <strong style={{ fontSize: 22, color: '#ea580c' }}>{minorStations.length}</strong>
        </div>

        <div style={{ background: '#fef9c3', border: '1.5px solid #eab308', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e' }}> ALERT LEVEL </div>
            <div style={{ fontSize: 12, color: '#854d0e' }}>Advisory Threshold</div>
          </div>
          <strong style={{ fontSize: 22, color: '#ca8a04' }}>{alertStations.length}</strong>
        </div>

        <div style={{ background: '#DAF1DE', border: '1.5px solid #8EB69B', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#235347' }}> NORMAL </div>
            <div style={{ fontSize: 12, color: '#235347' }}>Safe Threshold</div>
          </div>
          <strong style={{ fontSize: 22, color: '#0B2B26' }}>{normalStations.length}</strong>
        </div>
      </div>

      {/* Station Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0B2B26' }}>Station Hydrographs:</span>
        <button
          onClick={() => setSelectedStation('ALL')}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: selectedStation === 'ALL' ? '2px solid #235347' : '1px solid #8EB69B',
            background: selectedStation === 'ALL' ? '#235347' : '#DAF1DE',
            color: selectedStation === 'ALL' ? '#DAF1DE' : '#0B2B26',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          All Stations ({levels.length})
        </button>
        {levels.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedStation(s.locationName)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: selectedStation === s.locationName ? '2px solid #235347' : '1px solid #8EB69B',
              background: selectedStation === s.locationName ? '#235347' : '#FFFFFF',
              color: selectedStation === s.locationName ? '#DAF1DE' : '#0B2B26',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {s.locationName}
          </button>
        ))}
      </div>

      {/* Water Monitoring Cards Grid */}
      <div className="water-card-grid">
        {loading ? (
          <div className="page-loading card-surface" style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center' }}>
            Loading water levels...
          </div>
        ) : levels.length === 0 ? (
          <div className="empty-card card-surface" style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center' }}>
            <h3>No water-level data available</h3>
          </div>
        ) : (
          (selectedStation === 'ALL' ? levels : levels.filter(l => l.locationName === selectedStation)).map(wl => {
            const alertInfo = getRecordAlertInfo(wl);
            const major = wl.majorFloodLevel != null ? wl.majorFloodLevel : (wl.maximumLimit != null ? wl.maximumLimit : 5.0);
            const minor = wl.minorFloodLevel != null ? wl.minorFloodLevel : (major * 0.8).toFixed(1);
            const alert = wl.alertWaterLevel != null ? wl.alertWaterLevel : (major * 0.6).toFixed(1);
            const current = Number(wl.currentLevel || 0);
            const pct = Math.min(Math.round((current / (major > 0 ? major : 5.0)) * 100), 100);

            return (
              <article
                className="water-monitor-card card-surface"
                key={wl.id}
                style={{
                  borderLeft: `6px solid ${alertInfo.borderColor}`,
                  border: `1.5px solid ${alertInfo.borderColor}55`,
                  borderLeftWidth: '6px',
                  background: alertInfo.status !== 'NORMAL' ? alertInfo.bgTint : undefined,
                  transition: 'all 0.3s ease'
                }}
              >
                <div className="water-card-head" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <span className="card-kicker">MONITORING STATION</span>
                    <h3 style={{ fontSize: '1.15rem', margin: '4px 0 2px', color: '#0B2B26', fontWeight: 700 }}>
                      {wl.locationName}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{wl.district} District</p>
                    {(wl.reporterName || wl.updatedByName || wl.officerName) && (
                      <p style={{ fontSize: '0.8rem', color: '#235347', margin: '4px 0 0', fontWeight: 600 }}>
                        Reported by : {wl.reporterName || wl.updatedByName || wl.officerName}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      background: alertInfo.badgeBg,
                      color: alertInfo.badgeText,
                      padding: '5px 12px',
                      borderRadius: 999,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '0.4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {alertInfo.badgeLabel}
                  </span>
                </div>

                {/* Alert Notification Callout */}
                {alertInfo.status !== 'NORMAL' && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: `1.5px solid ${alertInfo.borderColor}`,
                      borderRadius: 8,
                      padding: '9px 12px',
                      marginTop: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.82rem',
                      color: alertInfo.textColor,
                      fontWeight: 600
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{alertInfo.icon}</span>
                    <div>
                      <strong>{alertInfo.title}:</strong> Current reading ({current} m) reached {alertInfo.label} threshold!
                    </div>
                  </div>
                )}

                <div className="water-primary-value" style={{ marginTop: 14 }}>
                  <strong style={{ fontSize: '2.1rem', color: alertInfo.status !== 'NORMAL' ? alertInfo.textColor : '#0B2B26' }}>
                    {wl.currentLevel} m
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: alertInfo.status !== 'NORMAL' ? alertInfo.textColor : undefined }}>
                    Current Water Level ({pct}% of Major Flood Level)
                  </span>
                </div>

                {/* Progress track */}
                <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: alertInfo.borderColor,
                      borderRadius: 999,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>

                {/* 4-Tier Scale */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, marginTop: 6 }}>
                  <span style={{ color: '#235347' }}>● Normal</span>
                  <span style={{ color: '#854d0e' }}>● Alert ({alert}m)</span>
                  <span style={{ color: '#9a3412' }}>● Minor ({minor}m)</span>
                  <span style={{ color: '#991b1b' }}>● Major ({major}m)</span>
                </div>

                {/* Water Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: 10,
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(0,0,0,0.08)'
                  }}
                >
                  <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 6, border: '1px solid #8EB69B' }}>
                    <span style={{ fontSize: '0.72rem', color: '#235347', display: 'block' }}>Current Level</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0B2B26' }}>{wl.currentLevel} m</strong>
                  </div>
                  <div style={{ background: '#fee2e2', padding: '8px 10px', borderRadius: 6, border: '1px solid #ef9a9a' }}>
                    <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700, display: 'block' }}>Major Flood</span>
                    <strong style={{ fontSize: '0.95rem', color: '#991b1b' }}>{major} m</strong>
                  </div>
                  <div style={{ background: '#ffedd5', padding: '8px 10px', borderRadius: 6, border: '1px solid #fed7aa' }}>
                    <span style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: 700, display: 'block' }}>Minor Flood</span>
                    <strong style={{ fontSize: '0.95rem', color: '#9a3412' }}>{minor} m</strong>
                  </div>
                  <div style={{ background: '#fef9c3', padding: '8px 10px', borderRadius: 6, border: '1px solid #fef08a' }}>
                    <span style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: 700, display: 'block' }}>Alert Level</span>
                    <strong style={{ fontSize: '0.95rem', color: '#854d0e' }}>{alert} m</strong>
                  </div>
                  <div style={{ background: '#f3f4f6', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563', display: 'block' }}>Trend</span>
                    <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{wl.trend || 'STABLE'}</strong>
                  </div>
                </div>

                {/* 1-Week Water Level Graphical Graph for this Station */}
                <div style={{ marginTop: 16 }}>
                  <WaterLevelChart
                    station={wl}
                    height={260}
                    showSummary={false}
                    titleOverride={`${wl.locationName} — 7-Day Water Level Trend`}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
    </PublicPageShell>
  );
}
