import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, updateReportStatus, updateReportProgress } from '../api/api';
import { resolveSidebarNav, AS } from '../utils/adminNav';
import RecoveryProgressBar from '../components/RecoveryProgressBar';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';

const REPORT_TYPES = [
    { value: 'ALL', label: 'All Types' },
    { value: 'FLOOD', label: 'Flood' },
    { value: 'ROAD_DAMAGE', label: 'Road Damage' },
    { value: 'LANDSLIDE', label: 'Landslide' },
    { value: 'BRIDGE_DAMAGE', label: 'Bridge Damage' },
    { value: 'BUILDING', label: 'Building' },
    { value: 'WATER_POLLUTION', label: 'Water Pollution' },
    { value: 'OTHER', label: 'Other' },
];

const STATUS_FILTERS = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' },
];

function formatDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
        return iso;
    }
}

function getStageDetails(report) {
    const status = (report.status || 'PENDING').toUpperCase();
    if (status === 'RESOLVED') {
        return {
            stepIndex: 2, // 0: Pending, 1: In Progress, 2: Resolved
            label: 'Resolved',
            percent: 100,
            showPercent: true,
            badgeBg: '#235347',
            badgeColor: '#DAF1DE',
        };
    }
    if (status === 'IN_PROGRESS') {
        return {
            stepIndex: 1,
            label: 'In Progress',
            percent: 60,
            showPercent: true,
            badgeBg: '#8EB69B',
            badgeColor: '#0B2B26',
        };
    }
    // PENDING (New damage report)
    return {
        stepIndex: 0,
        label: 'Pending',
        percent: 0,
        showPercent: false,
        badgeBg: '#DAF1DE',
        badgeColor: '#0B2B26',
    };
}

export default function AdminRecoveryProgressPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [damageType, setDamageType] = useState('ALL');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [photoIndex, setPhotoIndex] = useState(0);

    const load = () => getAllReports()
        .then(r => setReports((r.data || []).filter(x => x.status !== 'REJECTED')))
        .catch(console.error)
        .finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const stats = useMemo(() => {
        const total = reports.length;
        const pending = reports.filter(r => r.status === 'PENDING').length;
        const inProgress = reports.filter(r => r.status === 'IN_PROGRESS').length;
        const resolved = reports.filter(r => r.status === 'RESOLVED').length;
        return { total, pending, inProgress, resolved };
    }, [reports]);

    const filtered = useMemo(() => reports.filter(r => {
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesType = damageType === 'ALL' || r.damageType === damageType;
        const haystack = `${r.reportNumber || ''} ${r.title || ''} ${r.location || ''} ${r.reporterName || ''}`.toLowerCase();
        return matchesStatus && matchesType && haystack.includes(query.toLowerCase());
    }), [reports, statusFilter, damageType, query]);

    const handleStageChange = async (id, newStatus) => {
        let notes = '';
        if (newStatus === 'RESOLVED') {
            notes = prompt('Notes for marking as resolved (optional):') || '';
        }
        try {
            await updateReportStatus(id, newStatus, notes);
            if (newStatus === 'RESOLVED') {
                await updateReportProgress(id, 100);
            } else if (newStatus === 'PENDING') {
                await updateReportProgress(id, 0);
            } else if (newStatus === 'IN_PROGRESS') {
                await updateReportProgress(id, 60);
            }
            load();
        } catch {
            alert('Failed to update stage');
        }
    };

    const handleProgress = async (id, value) => {
        try { await updateReportProgress(id, value); load(); }
        catch { alert('Failed to update progress'); }
    };

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Recovery Progress</h2>
                    <p style={AS.subtitle}>Track and update the progress of damage reports across all recovery stages.</p>
                </div>

                {/* GA Admin Official Alert Announcement Banner (Displayed under main heading and sub heading) */}
                <AlertAnnouncementBanner />

                <div style={S.statsRow}>
                    <div style={S.statCard}>
                        <div style={S.statNum}>{stats.total}</div>
                        <div style={S.statLabel}>Total Reports</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ ...S.statNum, color: '#235347' }}>{stats.pending}</div>
                        <div style={S.statLabel}>Stage 1: Pending</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ ...S.statNum, color: '#235347' }}>{stats.inProgress}</div>
                        <div style={S.statLabel}>Stage 2: In Progress</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ ...S.statNum, color: '#0B2B26' }}>{stats.resolved}</div>
                        <div style={S.statLabel}>Stage 3: Resolved</div>
                    </div>
                </div>

                <div style={{ ...AS.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                        style={AS.input}
                        placeholder="Search report number, title, location or officer..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    
                    {/* Status Filter Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0B2B26' }}>Stage Filter:</span>
                        {STATUS_FILTERS.map(s => (
                            <button
                                key={s.value}
                                style={statusFilter === s.value ? AS.chipActive : AS.chip}
                                onClick={() => setStatusFilter(s.value)}
                            >
                                {s.label}
                                {s.value === 'PENDING' && ` (${stats.pending})`}
                                {s.value === 'IN_PROGRESS' && ` (${stats.inProgress})`}
                                {s.value === 'RESOLVED' && ` (${stats.resolved})`}
                            </button>
                        ))}
                    </div>

                    {/* Damage Type Filter Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0B2B26' }}>Damage Type:</span>
                        {REPORT_TYPES.map(t => (
                            <button
                                key={t.value}
                                style={damageType === t.value ? AS.chipActive : AS.chip}
                                onClick={() => setDamageType(t.value)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <div style={AS.emptyState}>Loading recovery progress...</div> : (
                    filtered.length === 0 ? (
                        <div style={{ ...AS.card, textAlign: 'center' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B2B26', margin: 0 }}>No damage reports found</h3>
                            <p style={{ fontSize: 12, color: '#235347', marginTop: 4 }}>
                                {reports.length === 0 ? 'No damage reports have been registered yet.' : 'Try changing your search, stage, or damage type filter.'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(r => {
                            const stageInfo = getStageDetails(r);

                            return (
                                <div key={r.id} style={AS.card}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
                                        <span style={{ fontSize: 12, color: '#235347', fontFamily: 'monospace' }}>{r.reportNumber || `Report ${r.id}`}</span>
                                        <span style={{
                                            ...AS.badge,
                                            background: stageInfo.badgeBg,
                                            color: stageInfo.badgeColor,
                                            fontWeight: 700
                                        }}>
                                            {stageInfo.label}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', color: '#0B2B26' }}>{r.title}</h3>
                                    <p style={{ fontSize: 12, color: '#235347', margin: '0 0 8px' }}>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: '#235347', fontWeight: 500 }}
                                        >
                                            {r.location} <span style={{ fontSize: 11, marginLeft: 4 }}>(View Map)</span>
                                        </a>
                                    </p>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                                        <span style={AS.badge}>{(r.damageType || 'OTHER').replace('_', ' ')}</span>
                                        <span style={AS.badge}>{r.severity || 'N/A'}</span>
                                        {r.reporterName && <span style={{ fontSize: 12, color: '#235347' }}>Reported by : {r.reporterName}</span>}
                                        {r.reportedAt && <span style={{ fontSize: 12, color: '#235347' }}>&middot; {formatDate(r.reportedAt)}</span>}
                                    </div>
                                    {r.description && <p style={{ fontSize: 13, color: '#235347', margin: '0 0 10px', lineHeight: 1.5 }}>{r.description}</p>}
                                    {r.photoUrls && r.photoUrls.length > 0 && (
                                        <div style={{ marginBottom: 12, cursor: 'pointer', position: 'relative' }} onClick={() => { setSelectedPhotos(r.photoUrls); setPhotoIndex(0); }}>
                                            <img src={r.photoUrls[0]} alt={r.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
                                            {r.photoUrls.length > 1 && (
                                                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(5,31,32,0.82)', color: '#DAF1DE', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                                    +{r.photoUrls.length - 1} More Photo{r.photoUrls.length > 2 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {r.adminNotes && (
                                        <div style={{ background: '#DAF1DE', border: '1px solid #8EB69B', borderRadius: 7, padding: '8px 10px', fontSize: 12, color: '#235347', marginBottom: 10 }}>
                                            {r.adminNotes}
                                        </div>
                                    )}

                                    <RecoveryProgressBar
                                        status={r.status}
                                        recoveryProgress={r.recoveryProgress}
                                        onStageChange={(newStatus) => handleStageChange(r.id, newStatus)}
                                    />

                                    {/* Quick Actions */}
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                                        {r.status === 'PENDING' && (
                                            <button style={S.btn} onClick={() => handleStageChange(r.id, 'IN_PROGRESS')}>
                                                Start Recovery (In Progress) →
                                            </button>
                                        )}
                                        {r.status === 'IN_PROGRESS' && (
                                            <>
                                                <button style={S.btn} onClick={() => handleStageChange(r.id, 'RESOLVED')}>
                                                    Mark Resolved ✓
                                                </button>
                                                <button style={S.btnGhost} onClick={() => handleStageChange(r.id, 'PENDING')}>
                                                    ← Move Back to Pending
                                                </button>
                                            </>
                                        )}
                                        {r.status === 'RESOLVED' && (
                                            <button style={S.btnGhost} onClick={() => handleStageChange(r.id, 'IN_PROGRESS')}>
                                                Reopen Recovery
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div></div>

            {selectedPhotos && (
                <div style={S.modalOverlay} onClick={() => setSelectedPhotos(null)}>
                    <div style={S.modalContent} onClick={e => e.stopPropagation()}>
                        <button style={S.modalClose} onClick={() => setSelectedPhotos(null)}>✕</button>
                        <div style={S.sliderContainer}>
                            {selectedPhotos.length > 1 && (
                                <button style={S.navBtnLeft} onClick={() => setPhotoIndex((photoIndex - 1 + selectedPhotos.length) % selectedPhotos.length)}>◀</button>
                            )}
                            <img src={selectedPhotos[photoIndex]} alt="Report detail" style={S.sliderImg} />
                            {selectedPhotos.length > 1 && (
                                <button style={S.navBtnRight} onClick={() => setPhotoIndex((photoIndex + 1) % selectedPhotos.length)}>▶</button>
                            )}
                        </div>
                        {selectedPhotos.length > 1 && (
                            <div style={S.sliderDots}>
                                {selectedPhotos.map((_, idx) => (
                                    <span key={idx} style={{ ...S.sliderDot, background: idx === photoIndex ? '#235347' : '#8EB69B' }} onClick={() => setPhotoIndex(idx)} />
                                ))}
                            </div>
                        )}
                        <div style={{ textAlign: 'center', marginTop: 8, color: '#235347', fontSize: 12, fontWeight: 600 }}>
                            {photoIndex + 1} / {selectedPhotos.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const S = {
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 },
    statCard: { background: '#DAF1DE', borderRadius: 10, padding: 14, boxShadow: '0 2px 10px rgba(11,43,38,0.10)', textAlign: 'center', border: '1px solid #8EB69B' },
    statNum: { fontSize: 24, fontWeight: 800, color: '#0B2B26' },
    statLabel: { fontSize: 12, color: '#235347', marginTop: 2, fontWeight: 600 },
    btn: { padding: '6px 14px', border: '1px solid #235347', borderRadius: 9, background: '#235347', color: '#DAF1DE', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    btnGhost: { padding: '6px 14px', border: '1px solid #8EB69B', borderRadius: 9, background: '#DAF1DE', color: '#235347', fontSize: 12, fontWeight: 700, cursor: 'pointer' },

    progressSection: {
        background: '#DAF1DE',
        borderRadius: 10,
        padding: 12,
        border: '1px solid #8EB69B',
        marginTop: 10,
        marginBottom: 10,
    },
    track: {
        height: 10,
        borderRadius: 999,
        background: '#8EB69B',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 10,
    },
    trackFill: {
        height: '100%',
        background: '#235347',
        borderRadius: 999,
        transition: 'width 0.35s ease',
    },
    stagesContainer: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
    },

    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,31,32,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    modalContent: { background: '#DAF1DE', borderRadius: 12, padding: '30px 20px 20px', maxWidth: 600, width: '100%', position: 'relative', boxShadow: '0 4px 20px rgba(11,43,38,0.16)', color: '#0B2B26', border: '1px solid #8EB69B' },
    modalClose: { position: 'absolute', top: 12, right: 12, background: '#DAF1DE', border: '1px solid #8EB69B', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', color: '#0B2B26', zIndex: 10 },
    sliderContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 250, background: '#8EB69B', borderRadius: 8, overflow: 'hidden', marginTop: 10 },
    sliderImg: { maxWidth: '100%', maxHeight: 400, objectFit: 'contain' },
    navBtnLeft: { position: 'absolute', left: 10, background: '#DAF1DE', color: '#0B2B26', border: '1px solid #8EB69B', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(11,43,38,0.16)', fontWeight: 'bold', zIndex: 10 },
    navBtnRight: { position: 'absolute', right: 10, background: '#DAF1DE', color: '#0B2B26', border: '1px solid #8EB69B', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(11,43,38,0.16)', fontWeight: 'bold', zIndex: 10 },
    sliderDots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 },
    sliderDot: { width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s' },
};
