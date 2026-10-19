import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, deleteReport } from '../api/api';
import { canDeleteReports } from '../utils/reportPermissions';
import RecoveryProgressBar from '../components/RecoveryProgressBar';
import { resolveSidebarNav, AS } from '../utils/adminNav';

const STATUS_LABEL = {
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected',
};

function StatusPill({ status }) {
    if (status === 'PENDING') return null;
    const style = {
        IN_PROGRESS: { background: '#235347', color: '#DAF1DE' },
        RESOLVED: { background: '#0B2B26', color: '#DAF1DE' },
        REJECTED: { background: '#DAF1DE', color: '#0B2B26', border: '1px solid #0B2B26' },
    }[status] || { background: '#8EB69B', color: '#0B2B26' };
    return (
        <span style={{ ...style, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            {STATUS_LABEL[status] || (status || 'UNKNOWN').replace('_', ' ')}
        </span>
    );
}

export default function AdminReportDamagePage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const isSystemAdmin = user.email === 'admin@edrr.com';
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [photoIndex, setPhotoIndex] = useState(0);

    const load = () => getAllReports()
        .then(r => setReports(r.data || []))
        .catch(console.error)
        .finally(() => setLoading(false));

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Delete is shown to Rural Officers only - the System Administrator's view stays read-only.
    const canDelete = canDeleteReports(user);
    const handleDelete = async (r) => {
        if (!window.confirm(`Delete "${r.title}" (${r.reportNumber || `#${r.id}`})?\nIt will be moved to the recycle bin, where the GA can restore or permanently delete it.`)) return;
        try { await deleteReport(r.id); await load(); }
        catch { alert('Failed to delete the report'); }
    };

    const baseReports = useMemo(() => {
        if (user.role === 'RURAL_OFFICER') {
            const currentUserId = user.id || user._id;
            return (reports || []).filter(r => {
                if (!r) return false;
                if (currentUserId && r.reportedBy) {
                    return String(r.reportedBy) === String(currentUserId);
                }
                if (user.email && r.reportedBy) {
                    return String(r.reportedBy).toLowerCase() === String(user.email).toLowerCase();
                }
                if (!r.reportedBy && user.fullName && r.reporterName) {
                    return String(r.reporterName).trim().toLowerCase() === String(user.fullName).trim().toLowerCase();
                }
                return false;
            });
        }
        return reports || [];
    }, [reports, user]);

    const filtered = useMemo(() => baseReports.filter(r => {
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const haystack = `${r.reportNumber || ''} ${r.title || ''} ${r.location || ''} ${r.reporterName || ''}`.toLowerCase();
        return matchesStatus && haystack.includes(query.toLowerCase());
    }), [baseReports, statusFilter, query]);

    const counts = useMemo(() => ({
        total: baseReports.length,
        inProgress: baseReports.filter(r => r.status === 'IN_PROGRESS').length,
        resolved: baseReports.filter(r => r.status === 'RESOLVED').length,
    }), [baseReports]);

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Report Damage</h2>
                    <p style={AS.subtitle}>
                        {isSystemAdmin
                            ? 'Read-only view of damage reports submitted by Rural and Irrigation Officers. System Administrator accounts do not have permission to submit new reports.'
                            : 'All damage reports submitted across the system so far. To submit a new report, use the Report Damage tab on your Home dashboard.'}
                    </p>
                </div>

                <div style={S.statsGrid}>
                    <div style={S.statCard}><div style={S.statNum}>{counts.total}</div><div style={S.statLabel}>Total Reports</div></div>
                    <div style={S.statCard}><div style={S.statNum}>{counts.inProgress}</div><div style={S.statLabel}>In Progress</div></div>
                    <div style={S.statCard}><div style={S.statNum}>{counts.resolved}</div><div style={S.statLabel}>Resolved</div></div>
                </div>

                <div style={S.filterRow}>
                    <input
                        style={S.searchInput}
                        placeholder="Search report number, title, location or officer..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <select style={S.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="ALL">All Status</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                {loading ? <div style={AS.emptyState}>Loading damage reports...</div> : (
                    filtered.length === 0 ? (
                        <div style={{ ...AS.card, textAlign: 'center' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B2B26', margin: 0 }}>No reports found</h3>
                            <p style={{ fontSize: 12, color: '#235347', marginTop: 4 }}>Try changing your search or status filter.</p>
                        </div>
                    ) : (
                        <div style={S.grid}>
                            {filtered.map(r => (
                                <article key={r.id} style={AS.card}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
                                        <span style={{ fontSize: 12, color: '#235347', fontFamily: 'monospace' }}>{r.reportNumber || `Report ${r.id}`}</span>
                                        <StatusPill status={r.status} />
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
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                                        <span style={AS.badge}>{(r.damageType || 'OTHER').replace('_', ' ')}</span>
                                        <span style={AS.badge}>{r.severity || 'N/A'}</span>
                                        {r.reporterName && <span style={{ fontSize: 12, color: '#235347' }}>Reported by : {r.reporterName}</span>}
                                    </div>
                                    {r.description && <p style={{ fontSize: 13, color: '#235347', margin: '0 0 10px', lineHeight: 1.5 }}>{r.description}</p>}
                                    {r.photoUrls && r.photoUrls.length > 0 && (
                                        <div style={{ marginBottom: 12, cursor: 'pointer', position: 'relative' }} onClick={() => { setSelectedPhotos(r.photoUrls); setPhotoIndex(0); }}>
                                            <img src={r.photoUrls[0]} alt={r.title} style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 8 }} />
                                            {r.photoUrls.length > 1 && (
                                                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(5,31,32,0.82)', color: '#DAF1DE', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                                    +{r.photoUrls.length - 1} More Photo{r.photoUrls.length > 2 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <RecoveryProgressBar status={r.status} recoveryProgress={r.recoveryProgress} />
                                        {canDelete && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                                                <button style={S.btnDelete} onClick={() => handleDelete(r)}>Delete</button>
                                            </div>
                                        )}
                                    </article>
                                ))}
                        </div>
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
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 },
    statCard: { background: '#DAF1DE', borderRadius: 10, padding: 14, boxShadow: '0 2px 10px rgba(11,43,38,0.10)', textAlign: 'center', border: '1px solid #8EB69B' },
    statNum: { fontSize: 24, fontWeight: 800, color: '#0B2B26' },
    statLabel: { fontSize: 12, color: '#235347', marginTop: 2, fontWeight: 600 },

    filterRow: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: 220, padding: '10px 14px', border: '1.5px solid #8EB69B', borderRadius: 8, fontSize: 13, outline: 'none', background: '#DAF1DE', color: '#0B2B26' },
    filterSelect: { padding: '10px 14px', border: '1.5px solid #8EB69B', borderRadius: 8, fontSize: 13, background: '#DAF1DE', color: '#0B2B26', cursor: 'pointer' },

    btnDelete: { padding: '6px 14px', border: '1px solid #0B2B26', borderRadius: 9, background: '#DAF1DE', color: '#0B2B26', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 },

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
