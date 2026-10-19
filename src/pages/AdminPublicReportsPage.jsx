import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import {
    getAllPublicReports,
    updatePublicReportStatus,
    updatePublicReportProgress,
    deletePublicReport
} from '../api/api';
import { resolveSidebarNav, AS } from '../utils/adminNav';
import { canDeletePublicReports } from '../utils/reportPermissions';
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
    { value: 'ALL', label: 'All Stages' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' },
];

function formatDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    } catch {
        return iso;
    }
}

export default function AdminPublicReportsPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [damageType, setDamageType] = useState('ALL');
    const [divisionFilter, setDivisionFilter] = useState('ALL');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [photoIndex, setPhotoIndex] = useState(0);

    const isRuralOfficer = user.role === 'RURAL_OFFICER';
    const officerDivision = (user.divisionName || '').trim();

    const load = () => {
        setLoading(true);
        getAllPublicReports()
            .then(res => setReports(res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    // Scoped reports: Rural Division Officers only see damage reports for their assigned division
    const baseReports = useMemo(() => {
        if (isRuralOfficer && officerDivision) {
            return reports.filter(r => (r.divisionName || '').trim().toLowerCase() === officerDivision.toLowerCase());
        }
        return reports;
    }, [reports, isRuralOfficer, officerDivision]);

    // Available divisions across all reports for admin filtering
    const availableDivisions = useMemo(() => {
        return Array.from(new Set(reports.map(r => (r.divisionName || '').trim()).filter(Boolean))).sort();
    }, [reports]);

    const stats = useMemo(() => {
        const total = baseReports.length;
        const pending = baseReports.filter(r => (r.status || 'PENDING') === 'PENDING').length;
        const inProgress = baseReports.filter(r => r.status === 'IN_PROGRESS').length;
        const resolved = baseReports.filter(r => r.status === 'RESOLVED').length;
        return { total, pending, inProgress, resolved };
    }, [baseReports]);

    const filtered = useMemo(() => baseReports.filter(r => {
        const status = (r.status || 'PENDING').toUpperCase();
        const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
        const matchesType = damageType === 'ALL' || r.damageType === damageType;
        const matchesDivision = isRuralOfficer || divisionFilter === 'ALL' ||
            (r.divisionName || '').trim().toLowerCase() === divisionFilter.toLowerCase();
        const haystack = `${r.reportNumber || ''} ${r.title || ''} ${r.location || ''} ${r.divisionName || ''} ${r.reporterName || ''} ${r.reporterNic || ''} ${r.reporterPhone || ''} ${r.reporterEmail || ''}`.toLowerCase();
        return matchesStatus && matchesType && matchesDivision && haystack.includes(query.toLowerCase());
    }), [baseReports, statusFilter, damageType, divisionFilter, isRuralOfficer, query]);

    const handleStageChange = async (id, newStatus) => {
        let notes = '';
        if (newStatus === 'RESOLVED') {
            notes = prompt('Notes for marking as resolved (optional):') || '';
        }
        try {
            await updatePublicReportStatus(id, newStatus, notes);
            if (newStatus === 'RESOLVED') {
                await updatePublicReportProgress(id, 100);
            } else if (newStatus === 'PENDING') {
                await updatePublicReportProgress(id, 0);
            } else if (newStatus === 'IN_PROGRESS') {
                await updatePublicReportProgress(id, 60);
            }
            load();
        } catch {
            alert('Failed to update stage');
        }
    };

    // Public reports delete access: only Rural Division Officer, GA Admin, RDA Admin, and Irrigation Officer
    const canDelete = canDeletePublicReports(user);

    const handleDelete = async (r) => {
        const reportTitle = r.title || r.reportNumber || `#${r.id}`;
        if (!window.confirm(`Are you sure you want to delete public report "${reportTitle}"?`)) return;
        try {
            await deletePublicReport(r.id);
            load();
        } catch {
            alert('Failed to delete report');
        }
    };

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar">
                <div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h2 style={AS.title}>Public Damage Reports</h2>
                            <span style={S.publicBadge}>Citizen Submissions</span>
                        </div>
                        <p style={AS.subtitle}>
                            Review and manage damage reports submitted by citizens via the public damage report portal.
                        </p>

                        {/* GA Admin Official Alert Announcement Banner (Displayed under main heading and sub heading) */}
                        <div style={{ marginTop: 14 }}>
                            <AlertAnnouncementBanner />
                        </div>

                        {/* Division Scope Banner for Rural Officers */}
                        {isRuralOfficer && officerDivision && (
                            <div style={{
                                background: '#DAF1DE',
                                border: '1.5px solid #235347',
                                borderRadius: 10,
                                padding: '12px 18px',
                                marginTop: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 16 }}>🏛️</span>
                                        <strong style={{ color: '#0B2B26', fontSize: 14 }}>Rural Officer Division: {officerDivision}</strong>
                                    </div>
                                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#235347' }}>
                                        Only public damage reports submitted for your assigned division are displayed in this view.
                                    </p>
                                </div>
                                <span style={{
                                    background: '#235347',
                                    color: '#DAF1DE',
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                }}>
                                    {baseReports.length} Division Report{baseReports.length === 1 ? '' : 's'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div style={S.statsRow}>
                        <div style={S.statCard}>
                            <div style={S.statNum}>{stats.total}</div>
                            <div style={S.statLabel}>Total Public Reports</div>
                        </div>
                        <div style={S.statCard}>
                            <div style={{ ...S.statNum, color: '#235347' }}>{stats.pending}</div>
                            <div style={S.statLabel}>Stage 1: Pending Review</div>
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

                    {/* Search & Filter Card */}
                    <div style={{ ...AS.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                            style={AS.input}
                            placeholder="Search report number, title, location, division, citizen name, NIC, phone, or email..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />

                        {/* Stage Filter Chips */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0B2B26' }}>Stage:</span>
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

                        {/* Rural Officer Division Filter Chips (for Staff/Admins) */}
                        {!isRuralOfficer && availableDivisions.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0B2B26' }}>Division:</span>
                                <button
                                    style={divisionFilter === 'ALL' ? AS.chipActive : AS.chip}
                                    onClick={() => setDivisionFilter('ALL')}
                                >
                                    All Divisions
                                </button>
                                {availableDivisions.map(div => (
                                    <button
                                        key={div}
                                        style={divisionFilter === div ? AS.chipActive : AS.chip}
                                        onClick={() => setDivisionFilter(div)}
                                    >
                                        {div}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reports List */}
                    {loading ? (
                        <div style={AS.emptyState}>Loading public damage reports...</div>
                    ) : (
                        filtered.length === 0 ? (
                            <div style={{ ...AS.card, textAlign: 'center', padding: '40px 20px' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B2B26', margin: 0 }}>
                                    No public damage reports found
                                </h3>
                                <p style={{ fontSize: 13, color: '#235347', marginTop: 6 }}>
                                    {reports.length === 0
                                        ? 'No citizen damage reports have been submitted yet.'
                                        : 'Try adjusting your search query, stage, or damage type filters.'}
                                </p>
                            </div>
                        ) : (
                            filtered.map(r => (
                                <div key={r.id} style={AS.card}>
                                    {/* Report Header Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 13, color: '#235347', fontFamily: 'monospace', fontWeight: 700 }}>
                                                {r.reportNumber || `PUB-${r.id}`}
                                            </span>
                                            <span style={S.publicBadge}>Citizen Submission</span>
                                        </div>
                                        <span style={{
                                            ...AS.badge,
                                            background: r.status === 'RESOLVED' ? '#235347' : r.status === 'IN_PROGRESS' ? '#8EB69B' : '#DAF1DE',
                                            color: r.status === 'RESOLVED' ? '#DAF1DE' : '#0B2B26',
                                            border: '1px solid #8EB69B',
                                            fontWeight: 700
                                        }}>
                                            {r.status || 'PENDING'}
                                        </span>
                                    </div>

                                    {/* Title & Location */}
                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0B2B26' }}>{r.title}</h3>
                                    <p style={{ fontSize: 13, color: '#235347', margin: '0 0 10px' }}>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: '#235347', fontWeight: 600 }}
                                        >
                                            📍 {r.location} <span style={{ fontSize: 11, marginLeft: 4 }}>(View on Map &middot; {r.latitude}, {r.longitude})</span>
                                        </a>
                                    </p>

                                    {/* Badges */}
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
                                        {r.divisionName ? (
                                            <span style={{
                                                ...AS.badge,
                                                background: '#235347',
                                                color: '#DAF1DE',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5
                                            }}>
                                                🏛️ Division: {r.divisionName}
                                            </span>
                                        ) : (
                                            <span style={{
                                                ...AS.badge,
                                                background: '#DAF1DE',
                                                color: '#235347',
                                                border: '1px dashed #8EB69B',
                                                fontWeight: 600
                                            }}>
                                                🏛️ Division: Unassigned
                                            </span>
                                        )}
                                        <span style={AS.badge}>{(r.damageType || 'OTHER').replace('_', ' ')}</span>
                                        <span style={{
                                            ...AS.badge,
                                            background: r.severity === 'CRITICAL' ? '#f00909' : r.severity === 'HIGH' ? '#fa5508' : '#8EB69B',
                                            color: (r.severity === 'CRITICAL' || r.severity === 'HIGH') ? '#fff' : '#0B2B26',
                                            fontWeight: 700
                                        }}>
                                            {r.severity || 'MEDIUM'}
                                        </span>
                                        {r.affectedArea && (
                                            <span style={{ fontSize: 12, color: '#235347' }}>
                                                Affected Area: <strong>{r.affectedArea}</strong>
                                            </span>
                                        )}
                                        {r.reportedAt && (
                                            <span style={{ fontSize: 12, color: '#235347' }}>
                                                &middot; Submitted: {formatDate(r.reportedAt)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Citizen Submitter Details Box */}
                                    <div style={S.citizenInfoBox}>
                                        <div style={S.citizenInfoTitle}>Citizen Submitter &amp; Routing Details</div>
                                        <div style={S.citizenInfoGrid}>
                                            <div>
                                                <span style={S.infoLabel}>Name:</span>
                                                <strong style={S.infoValue}>{r.reporterName || 'N/A'}</strong>
                                            </div>
                                            <div>
                                                <span style={S.infoLabel}>NIC Number:</span>
                                                <strong style={S.infoValue}>{r.reporterNic || 'N/A'}</strong>
                                            </div>
                                            <div>
                                                <span style={S.infoLabel}>Phone:</span>
                                                {r.reporterPhone ? (
                                                    <a href={`tel:${r.reporterPhone}`} style={S.contactLink}>{r.reporterPhone}</a>
                                                ) : <span style={S.infoValue}>N/A</span>}
                                            </div>
                                            <div>
                                                <span style={S.infoLabel}>Email:</span>
                                                {r.reporterEmail ? (
                                                    <a href={`mailto:${r.reporterEmail}`} style={S.contactLink}>{r.reporterEmail}</a>
                                                ) : <span style={S.infoValue}>N/A</span>}
                                            </div>
                                            <div>
                                                <span style={S.infoLabel}>Rural Officer Division:</span>
                                                <strong style={{ ...S.infoValue, color: '#0B2B26' }}>{r.divisionName || 'Unassigned / General'}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {r.description && (
                                        <p style={{ fontSize: 13, color: '#235347', margin: '0 0 12px', lineHeight: 1.55 }}>
                                            {r.description}
                                        </p>
                                    )}

                                    {/* Photos */}
                                    {r.photoUrls && r.photoUrls.length > 0 && (
                                        <div
                                            style={{ marginBottom: 12, cursor: 'pointer', position: 'relative' }}
                                            onClick={() => { setSelectedPhotos(r.photoUrls); setPhotoIndex(0); }}
                                        >
                                            <img
                                                src={r.photoUrls[0]}
                                                alt={r.title}
                                                style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8 }}
                                            />
                                            {r.photoUrls.length > 1 && (
                                                <div style={S.photoCounter}>
                                                    +{r.photoUrls.length - 1} More Photo{r.photoUrls.length > 2 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Admin Notes */}
                                    {r.adminNotes && (
                                        <div style={S.notesBox}>
                                            <strong style={{ color: '#0B2B26' }}>Staff Notes: </strong>
                                            {r.adminNotes}
                                        </div>
                                    )}

                                    {/* 3-Stage Progress Bar ("Pending", "In Progress", "Resolved") */}
                                    <RecoveryProgressBar
                                        status={r.status}
                                        recoveryProgress={r.recoveryProgress}
                                        onStageChange={(newStatus) => handleStageChange(r.id, newStatus)}
                                    />

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center', justifyContent: canDelete ? 'space-between' : 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {(r.status || 'PENDING') === 'PENDING' && (
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

                                        {canDelete && (
                                            <button style={S.btnDelete} onClick={() => handleDelete(r)}>
                                                Delete Report
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Photo Modal */}
            {selectedPhotos && (
                <div style={S.modalOverlay} onClick={() => setSelectedPhotos(null)}>
                    <div style={S.modalContent} onClick={e => e.stopPropagation()}>
                        <button style={S.modalClose} onClick={() => setSelectedPhotos(null)}>✕</button>
                        <div style={S.sliderContainer}>
                            {selectedPhotos.length > 1 && (
                                <button style={S.navBtnLeft} onClick={() => setPhotoIndex((photoIndex - 1 + selectedPhotos.length) % selectedPhotos.length)}>◀</button>
                            )}
                            <img src={selectedPhotos[photoIndex]} alt="Public report detail" style={S.sliderImg} />
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
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 16
    },
    statCard: {
        background: '#DAF1DE',
        borderRadius: 10,
        padding: 14,
        boxShadow: '0 2px 10px rgba(11,43,38,0.10)',
        textAlign: 'center',
        border: '1px solid #8EB69B'
    },
    statNum: { fontSize: 24, fontWeight: 800, color: '#0B2B26' },
    statLabel: { fontSize: 12, color: '#235347', marginTop: 2, fontWeight: 600 },
    publicBadge: {
        fontSize: 11,
        fontWeight: 700,
        background: '#0B2B26',
        color: '#DAF1DE',
        padding: '3px 9px',
        borderRadius: 14,
        display: 'inline-block'
    },
    citizenInfoBox: {
        background: '#c5e8cb',
        border: '1px solid #8EB69B',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 12
    },
    citizenInfoTitle: {
        fontSize: 11,
        fontWeight: 800,
        color: '#0B2B26',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6
    },
    citizenInfoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 8,
        fontSize: 12
    },
    infoLabel: {
        color: '#235347',
        marginRight: 6
    },
    infoValue: {
        color: '#0B2B26'
    },
    contactLink: {
        color: '#0B2B26',
        fontWeight: 700,
        textDecoration: 'underline'
    },
    notesBox: {
        background: '#DAF1DE',
        border: '1px solid #8EB69B',
        borderRadius: 7,
        padding: '8px 10px',
        fontSize: 12,
        color: '#235347',
        marginBottom: 10
    },
    photoCounter: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        background: 'rgba(5,31,32,0.85)',
        color: '#DAF1DE',
        padding: '3px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600
    },
    btn: {
        padding: '6px 14px',
        border: '1px solid #235347',
        borderRadius: 9,
        background: '#235347',
        color: '#DAF1DE',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer'
    },
    btnGhost: {
        padding: '6px 14px',
        border: '1px solid #8EB69B',
        borderRadius: 9,
        background: '#DAF1DE',
        color: '#235347',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer'
    },
    btnDelete: {
        padding: '6px 14px',
        border: '1px solid #c62828',
        borderRadius: 9,
        background: 'transparent',
        color: '#c62828',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(5,31,32,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
    },
    modalContent: {
        background: '#DAF1DE',
        borderRadius: 12,
        padding: '30px 20px 20px',
        maxWidth: 600,
        width: '100%',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(11,43,38,0.16)',
        color: '#0B2B26',
        border: '1px solid #8EB69B'
    },
    modalClose: {
        position: 'absolute',
        top: 12, right: 12,
        background: '#DAF1DE',
        border: '1px solid #8EB69B',
        borderRadius: '50%',
        width: 28, height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: '#0B2B26',
        zIndex: 10
    },
    sliderContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: 250,
        background: '#8EB69B',
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: 10
    },
    sliderImg: { maxWidth: '100%', maxHeight: 400, objectFit: 'contain' },
    navBtnLeft: {
        position: 'absolute',
        left: 10,
        background: '#DAF1DE',
        color: '#0B2B26',
        border: '1px solid #8EB69B',
        borderRadius: '50%',
        width: 36, height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(11,43,38,0.16)',
        fontWeight: 'bold',
        zIndex: 10
    },
    navBtnRight: {
        position: 'absolute',
        right: 10,
        background: '#DAF1DE',
        color: '#0B2B26',
        border: '1px solid #8EB69B',
        borderRadius: '50%',
        width: 36, height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(11,43,38,0.16)',
        fontWeight: 'bold',
        zIndex: 10
    },
    sliderDots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 },
    sliderDot: { width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s' },
};
