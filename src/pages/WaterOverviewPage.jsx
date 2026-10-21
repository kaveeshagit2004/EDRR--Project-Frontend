import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllWaterLevels } from '../api/api';
import { resolveSidebarNav } from '../utils/adminNav';
import { getRecordAlertInfo, WATER_ALERT_COLORS } from '../utils/waterAlerts';
import WaterLevelChart from '../components/WaterLevelChart';

// Snapshot of all 6 monitoring points for the Irrigation Officer's Overview page
const SITE_COUNT = 6;
const SITE_NUMBERS = Array.from({ length: SITE_COUNT }, (_, i) => i + 1);

export default function WaterOverviewPage() {
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);

    useEffect(() => {
        const loadOverview = () => {
            getAllWaterLevels().then(r => setLevels(r.data || [])).catch(console.error).finally(() => setLoading(false));
        };
        loadOverview();
        const interval = setInterval(loadOverview, 5000);
        const handleFocus = () => loadOverview();
        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    // Consistent alphabetical station ordering so each station maintains its location index
    const sortedLevels = [...levels].sort((a, b) => String(a.locationName || a.id || '').localeCompare(String(b.locationName || b.id || '')));
    const getSiteRecord = (n) => sortedLevels[n - 1] || null;

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#0B2B26', fontWeight: 600 }}>Loading water stations...</div>;

    const normalCount = levels.filter(l => getRecordAlertInfo(l).status === 'NORMAL').length;
    const alertCount = levels.filter(l => getRecordAlertInfo(l).status === 'ALERT').length;
    const minorCount = levels.filter(l => getRecordAlertInfo(l).status === 'MINOR').length;
    const majorCount = levels.filter(l => getRecordAlertInfo(l).status === 'MAJOR').length;

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
                    <div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: '#0B2B26', textShadow: 'none' }}>Overview</h2>
                        <p style={{ fontSize: 13, color: '#235347', marginBottom: 16 }}>Live water levels across all monitoring points with Major, Minor &amp; Alert thresholds</p>
                    </div>
                </div>

                {/* Summary row: Normal (Green), Alert (Yellow), Minor Flood (Orange), Major Flood (Red) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: '#DAF1DE', borderRadius: 10, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(11,43,38,0.10)', border: '1px solid #8EB69B', borderTop: '4px solid #235347' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#235347' }}>{normalCount}</div>
                        <div style={{ fontSize: 12, color: '#235347', marginTop: 2, fontWeight: 700 }}>Normal</div>
                        <div style={{ fontSize: 11, color: '#235347' }}>Safe Water Flow</div>
                    </div>
                    <div style={{ background: '#E8EEF9', borderRadius: 10, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(11,43,38,0.10)', border: '1px solid #00008B', borderTop: '4px solid #00008B' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#00008B' }}>{alertCount}</div>
                        <div style={{ fontSize: 12, color: '#00008B', marginTop: 2, fontWeight: 700 }}>Alert Level</div>
                        <div style={{ fontSize: 11, color: '#00008B' }}>Blue Watch</div>
                    </div>
                    <div style={{ background: '#FFF9D2', borderRadius: 10, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(11,43,38,0.10)', border: '1px solid #FFCE1B', borderTop: '4px solid #FFCE1B' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#714B00' }}>{minorCount}</div>
                        <div style={{ fontSize: 12, color: '#714B00', marginTop: 2, fontWeight: 700 }}>Minor Flood</div>
                        <div style={{ fontSize: 11, color: '#714B00' }}>Yellow Warning</div>
                    </div>
                    <div style={{ background: '#fee2e2', borderRadius: 10, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(11,43,38,0.10)', border: '1px solid #dc2626', borderTop: '4px solid #dc2626' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626' }}>{majorCount}</div>
                        <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2, fontWeight: 700 }}>Major Flood</div>
                        <div style={{ fontSize: 11, color: '#991b1b' }}>Red Critical</div>
                    </div>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: '#0B2B26', textShadow: 'none' }}>Current Water Levels (Live)</h3>

                {SITE_NUMBERS.map(siteNumber => {
                    const wl = getSiteRecord(siteNumber);

                    if (!wl) {
                        return (
                            <div
                                key={`empty-${siteNumber}`}
                                style={{ background: '#DAF1DE', borderRadius: 10, padding: 16, marginBottom: 10, boxShadow: '0 2px 10px rgba(11,43,38,0.10)', border: '1px dashed #8EB69B', borderLeft: '4px solid #8EB69B', color: '#0B2B26' }}
                            >
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#235347', letterSpacing: 0.4 }}>LOCATION {siteNumber}</span>
                                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 4px' }}>Not registered yet</h3>
                                <p style={{ fontSize: 12, color: '#235347', margin: 0 }}>No reading has been recorded for this monitoring point.</p>
                            </div>
                        );
                    }

                    const alertInfo = getRecordAlertInfo(wl);
                    const majorLevelVal = wl.majorFloodLevel != null ? wl.majorFloodLevel : (wl.maximumLimit != null ? wl.maximumLimit : 5.0);
                    const minorLevelVal = wl.minorFloodLevel != null ? wl.minorFloodLevel : (majorLevelVal * 0.8).toFixed(1);
                    const alertLevelVal = wl.alertWaterLevel != null ? wl.alertWaterLevel : (majorLevelVal * 0.6).toFixed(1);
                    const pct = Math.min(Math.round(((wl.currentLevel || 0) / (majorLevelVal || 5.0)) * 100), 100);

                    return (
                        <div
                            key={wl.id}
                            style={{
                                background: '#DAF1DE',
                                borderRadius: 10,
                                padding: 18,
                                marginBottom: 14,
                                boxShadow: '0 2px 10px rgba(11,43,38,0.10)',
                                border: `1px solid ${alertInfo.borderColor}60`,
                                borderLeft: `5px solid ${alertInfo.borderColor}`,
                                color: '#0B2B26'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#235347', letterSpacing: 0.4 }}>LOCATION {siteNumber}</span>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 2px', color: '#0B2B26' }}>{wl.locationName}</h3>
                                    <p style={{ fontSize: 12, color: '#235347', margin: 0 }}>{wl.district} District</p>
                                    {(wl.reporterName || wl.updatedByName || wl.officerName) && (
                                        <p style={{ fontSize: 12, color: '#235347', margin: '4px 0 0', fontWeight: 600 }}>
                                            Reported by : {wl.reporterName || wl.updatedByName || wl.officerName}
                                        </p>
                                    )}
                                </div>
                                <span style={{
                                    fontSize: 12,
                                    color: alertInfo.badgeText,
                                    background: alertInfo.badgeBg,
                                    padding: '5px 14px',
                                    borderRadius: 20,
                                    fontWeight: 800,
                                    letterSpacing: 0.4,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                }}>
                                    {alertInfo.badgeLabel}
                                </span>
                            </div>

                            {/* Alert Callout Box if in Alert (Yellow), Minor (Orange), or Major (Red) */}
                            {alertInfo.status !== 'NORMAL' && (
                                <div style={{
                                    background: alertInfo.bgTint,
                                    border: `1.5px solid ${alertInfo.borderColor}`,
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    marginBottom: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10
                                }}>
                                    <span style={{ fontSize: 20 }}>{alertInfo.icon}</span>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: alertInfo.textColor }}>
                                        <strong>{alertInfo.title}:</strong> Current water level ({wl.currentLevel} m) has reached {alertInfo.label} threshold!
                                    </div>
                                </div>
                            )}

                            {/* Metrics Row: Current Level, Major (Red), Minor (Orange), Alert (Yellow), Trend */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 12 }}>
                                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 8, border: '1px solid #8EB69B' }}>
                                    <div style={{ fontSize: 11, color: '#235347', fontWeight: 600 }}>Current Level</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0B2B26', marginTop: 2 }}>{wl.currentLevel} m</div>
                                </div>
                                <div style={{ background: '#fee2e2', padding: '10px 12px', borderRadius: 8, border: '1px solid #ef9a9a' }}>
                                    <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 700 }}>Major Flood </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{majorLevelVal} m</div>
                                </div>
                                <div style={{ background: '#FFF9D2', padding: '10px 12px', borderRadius: 8, border: '1px solid #FFCE1B' }}>
                                    <div style={{ fontSize: 11, color: '#714B00', fontWeight: 700 }}>Minor Flood</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#714B00', marginTop: 2 }}>{minorLevelVal} m</div>
                                </div>
                                <div style={{ background: '#E8EEF9', padding: '10px 12px', borderRadius: 8, border: '1px solid #00008B' }}>
                                    <div style={{ fontSize: 11, color: '#00008B', fontWeight: 700 }}>Alert Level</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#00008B', marginTop: 2 }}>{alertLevelVal} m</div>
                                </div>
                                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: 8, border: '1px solid #8EB69B' }}>
                                    <div style={{ fontSize: 11, color: '#235347', fontWeight: 600 }}>Trend</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0B2B26', marginTop: 2 }}>{wl.trend || 'STABLE'}</div>
                                </div>
                            </div>

                            <div style={{ background: '#8EB69B', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: alertInfo.borderColor, borderRadius: 4, transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 12, color: '#235347' }}>
                                {pct}% of Major Flood Level ({majorLevelVal} m)
                            </span>

                            {wl.officerNotes && (
                                <p style={{ fontSize: 12, color: '#235347', marginTop: 8, borderTop: '1px solid #8EB69B', paddingTop: 8 }}>
                                    Note: {wl.officerNotes}
                                </p>
                            )}

                            {/* 1-Week Water Level Graphical Graph for this Station */}
                            <div style={{ marginTop: 14 }}>
                                <WaterLevelChart
                                    station={wl}
                                    height={240}
                                    showSummary={false}
                                    titleOverride={`${wl.locationName} — 7-Day Water Level Trend`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            </div>
        </div>
    );
}
