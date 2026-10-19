import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, getAllWaterLevels } from '../api/api';
import { resolveSidebarNav, AS } from '../utils/adminNav';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';
import { getRecordAlertInfo } from '../utils/waterAlerts';

export default function AdminAlertsPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
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
        const interval = setInterval(loadAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const waterAlerts = levels.filter(w => {
        const info = getRecordAlertInfo(w);
        return info.status !== 'NORMAL';
    });
    const criticalReports = reports.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').slice(0, 10);

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Alerts &amp; Warnings</h2>
                    <p style={AS.subtitle}>Flood-risk monitoring and high-priority environmental damage reports across all divisions.</p>
                </div>

                {/* GA Admin Official Alert Announcement Banner (Displayed under main heading and sub heading) */}
                <AlertAnnouncementBanner />

                {loading ? <div style={AS.emptyState}>Loading alerts...</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B2B26', margin: 0 }}>Water Level Alerts</h3>
                                <span style={AS.badge}>{waterAlerts.length}</span>
                            </div>
                            {waterAlerts.length === 0 ? (
                                <div style={{ ...AS.card, textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0B2B26' }}>No active flood warnings</div>
                                    <p style={{ fontSize: 12, color: '#235347', marginTop: 4 }}>All monitoring stations are currently within normal levels.</p>
                                </div>
                            ) : waterAlerts.map(w => {
                                const alertInfo = getRecordAlertInfo(w);
                                return (
                                    <div key={w.id} style={{ ...AS.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderLeft: `5px solid ${alertInfo.borderColor}` }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    background: alertInfo.badgeBg,
                                                    color: alertInfo.badgeText
                                                }}>
                                                    {alertInfo.badgeLabel}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#235347', fontWeight: 600 }}>
                                                    {w.district} District
                                                </span>
                                            </div>
                                            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '2px 0 4px', color: '#0B2B26' }}>{w.locationName}</h4>
                                            <p style={{ fontSize: 12, color: '#235347', margin: 0 }}>
                                                Current level: <strong>{w.currentLevel} m</strong> &middot; Major: {w.majorFloodLevel || w.maximumLimit || 5.0} m &middot; Minor: {w.minorFloodLevel || 4.0} m &middot; Alert: {w.alertWaterLevel || 3.0} m
                                                {(w.reporterName || w.updatedByName || w.officerName) && ` · Reported by : ${w.reporterName || w.updatedByName || w.officerName}`}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: alertInfo.borderColor }}>{w.currentLevel} m</div>
                                            <div style={{ fontSize: 11, color: '#235347', fontWeight: 600 }}>{w.trend || 'Live'}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </section>

                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B2B26', margin: 0 }}>High-Priority Damage Notices</h3>
                                <span style={AS.badge}>{criticalReports.length}</span>
                            </div>
                            {criticalReports.length === 0 ? (
                                <div style={{ ...AS.card, textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0B2B26' }}>No high-priority damage notices</div>
                                    <p style={{ fontSize: 12, color: '#235347', marginTop: 4 }}>New high-priority reports will appear here as they are submitted.</p>
                                </div>
                            ) : criticalReports.map(r => (
                                <div key={r.id} style={{ ...AS.card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#8EB69B', color: '#0B2B26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>!</div>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#235347', fontWeight: 600 }}>{r.reportNumber || `Report ${r.id}`} &middot; {r.severity}</span>
                                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 2px', color: '#0B2B26' }}>{r.title}</h4>
                                        <p style={{ fontSize: 12, color: '#235347', margin: 0 }}>
                                            {r.location}{r.status && r.status !== 'PENDING' ? ` · ${r.status.replace('_', ' ')}` : ''}
                                            {r.reporterName && ` · Reported by : ${r.reporterName}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </section>
                    </div>
                )}
            </div></div>
        </div>
    );
}
