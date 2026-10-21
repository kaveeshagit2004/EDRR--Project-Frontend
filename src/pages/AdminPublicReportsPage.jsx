import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import {
    getAllPublicReports,
    markPublicReportViewed,
    deletePublicReport
} from '../api/api';
import { resolveSidebarNav, AS } from '../utils/adminNav';
import { canDeletePublicReports } from '../utils/reportPermissions';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';

const STATUS_FILTERS = [
    { value: 'ALL', label: 'All Reports' },
    { value: 'PENDING', label: 'Pending RDA Review' },
    { value: 'VIEWED', label: 'Viewed by RDA / DMC' },
];

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isWithinOneWeek(iso) {
    if (!iso) return true;
    const t = new Date(iso).getTime();
    return !isNaN(t) && (Date.now() - t) <= ONE_WEEK_MS;
}

function getRemainingTimeText(iso) {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (isNaN(t)) return null;
    const diff = ONE_WEEK_MS - (Date.now() - t);
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
}

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

    // Scoped reports: filter out reports older than 1 week (7 days) and apply division scoping for Rural Officers
    const baseReports = useMemo(() => {
        const activeWithinWeek = reports.filter(r => isWithinOneWeek(r.reportedAt));
        if (isRuralOfficer && officerDivision) {
            return activeWithinWeek.filter(r => (r.divisionName || '').trim().toLowerCase() === officerDivision.toLowerCase());
        }
        return activeWithinWeek;
    }, [reports, isRuralOfficer, officerDivision]);

    // Available divisions across all reports for admin filtering
    const availableDivisions = useMemo(() => {
        return Array.from(new Set(reports.map(r => (r.divisionName || '').trim()).filter(Boolean))).sort();
    }, [reports]);

    const isRdaAdmin = user.role === 'RDA_ADMIN';

    const stats = useMemo(() => {
        const total = baseReports.length;
        const viewed = baseReports.filter(r => Boolean(r.viewedByRda || r.status === 'VIEWED_BY_RDA' || r.status === 'VIEWED')).length;
        const pending = total - viewed;
        return { total, viewed, pending };
    }, [baseReports]);

    const filtered = useMemo(() => baseReports.filter(r => {
        const isViewed = Boolean(r.viewedByRda || r.status === 'VIEWED_BY_RDA' || r.status === 'VIEWED');
        let matchesStatus = true;
        if (statusFilter === 'VIEWED') matchesStatus = isViewed;
        else if (statusFilter === 'PENDING') matchesStatus = !isViewed;

        const matchesDivision = isRuralOfficer || divisionFilter === 'ALL' ||
            (r.divisionName || '').trim().toLowerCase() === divisionFilter.toLowerCase();
        const haystack = `${r.reportNumber || ''} ${r.title || ''} ${r.location || ''} ${r.divisionName || ''} ${r.reporterName || ''} ${r.reporterNic || ''} ${r.reporterPhone || ''} ${r.reporterEmail || ''}`.toLowerCase();
        return matchesStatus && matchesDivision && haystack.includes(query.toLowerCase());
    }), [baseReports, statusFilter, divisionFilter, isRuralOfficer, query]);

    const handleMarkViewed = async (reportId, viewed = true) => {
        if (!isRdaAdmin) {
            alert('Only RDA Admin is authorized to mark public damage reports as viewed.');
            return;
        }
        try {
            await markPublicReportViewed(reportId, viewed);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update report status');
        }
    };

    // Public reports delete access: ONLY Rural Division Officer (RDA Officers & others cannot delete)
    const canDelete = canDeletePublicReports(user);

    const handleDelete = async (r) => {
        if (!canDeletePublicReports(user, r)) {
            alert('Permission Denied: Rural Division Officers cannot delete citizen reports until an RDA/DMC officer has reviewed and marked them as viewed.');
            return;
        }
        const reportTitle = r.title || r.reportNumber || `#${r.id}`;
        if (!window.confirm(`Are you sure you want to delete public report "${reportTitle}"?`)) return;
        try {
            await deletePublicReport(r.id, user.email);
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete report');
        }
    };

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar">
                <div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h2 style={AS.title}>Public Damage Reports</h2>
                            <span style={S.publicBadge}>Citizen Submissions</span>
                            <span style={S.expiryPill}>⏱️ Auto-Disappears After 1 Week (7 Days)</span>
                        </div>
                        <p style={AS.subtitle}>
                            Review and manage damage reports submitted by citizens via the public damage report portal. Public damage reports automatically disappear across the system within 7 days. Only Rural Division Officers can delete reports.
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
                                        Only public damage reports submitted for your assigned division are displayed in this view. Citizen reports can only be deleted after they are reviewed and marked as viewed by an RDA/DMC officer.
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
                            <div style={{ ...S.statNum, color: '#d97706' }}>{stats.pending}</div>
                            <div style={S.statLabel}>Pending RDA Review</div>
                        </div>
                        <div style={S.statCard}>
                            <div style={{ ...S.statNum, color: '#235347' }}>{stats.viewed}</div>
                            <div style={S.statLabel}>Viewed by RDA / DMC</div>
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

                        {/* Status Filter Chips */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0B2B26' }}>Status:</span>
                            {STATUS_FILTERS.map(s => (
                                <button
                                    key={s.value}
                                    style={statusFilter === s.value ? AS.chipActive : AS.chip}
                                    onClick={() => setStatusFilter(s.value)}
                                >
                                    {s.label}
                                    {s.value === 'PENDING' && ` (${stats.pending})`}
                                    {s.value === 'VIEWED' && ` (${stats.viewed})`}
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
                                        {(() => {
                                            const isViewed = Boolean(r.viewedByRda || r.status === 'VIEWED_BY_RDA' || r.status === 'VIEWED');
                                            return (
                                                <span style={{
                                                    ...AS.badge,
                                                    background: isViewed ? '#235347' : '#fef3c7',
                                                    color: isViewed ? '#DAF1DE' : '#92400e',
                                                    border: `1.5px solid ${isViewed ? '#235347' : '#f59e0b'}`,
                                                    fontWeight: 800,
                                                    padding: '4px 12px',
                                                    borderRadius: 20
                                                }}>
                                                    {isViewed ? '✓ Viewed by RDA/DMC Admin' : '⏳ Pending RDA Review'}
                                                </span>
                                            );
                                        })()}
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
                                        {r.affectedArea && (
                                            <span style={{ fontSize: 12, color: '#235347' }}>
                                                Affected Area: <strong>{r.affectedArea}</strong>
                                            </span>
                                        )}
                                        {r.reportedAt && (
                                            <>
                                                <span style={{ fontSize: 12, color: '#235347' }}>
                                                    &middot; Submitted: {formatDate(r.reportedAt)}
                                                </span>
                                                {(() => {
                                                    const rem = getRemainingTimeText(r.reportedAt);
                                                    return rem ? (
                                                        <span style={{
                                                            fontSize: 11,
                                                            color: '#0B2B26',
                                                            background: '#DAF1DE',
                                                            padding: '2px 8px',
                                                            borderRadius: 12,
                                                            border: '1px solid #8EB69B',
                                                            fontWeight: 600,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 3
                                                        }}>
                                                            ⏱️ {rem}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </>
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

                                    {/* Action Buttons (Progress bar removed - only RDA admin can mark as viewed) */}
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center', justifyContent: canDelete ? 'space-between' : 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {(() => {
                                                const isViewed = Boolean(r.viewedByRda || r.status === 'VIEWED_BY_RDA' || r.status === 'VIEWED');
                                                if (isRdaAdmin) {
                                                    return !isViewed ? (
                                                        <button
                                                            style={{
                                                                ...S.btn,
                                                                background: '#235347',
                                                                color: '#ffffff',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                fontWeight: 700
                                                            }}
                                                            onClick={() => handleMarkViewed(r.id, true)}
                                                        >
                                                            ✓ Mark as Viewed by RDA / DMC
                                                        </button>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{
                                                                fontSize: 13,
                                                                color: '#235347',
                                                                fontWeight: 700,
                                                                background: '#DAF1DE',
                                                                padding: '6px 12px',
                                                                borderRadius: 8,
                                                                border: '1px solid #8EB69B'
                                                            }}>
                                                                ✓ Marked as Viewed by RDA Admin {r.viewedByName ? `(${r.viewedByName})` : ''}
                                                            </span>

                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <span style={{
                                                            fontSize: 12,
                                                            color: isViewed ? '#235347' : '#92400e',
                                                            fontWeight: 600
                                                        }}>
                                                            {isViewed
                                                                ? `✓ Viewed by RDA/DMC Admin ${r.viewedByName ? `(${r.viewedByName})` : ''}`
                                                                : '⏳ Awaiting review by RDA Admin'}
                                                        </span>
                                                    );
                                                }
                                            })()}
                                        </div>

                                        {canDelete && (() => {
                                            const isViewedByRda = canDeletePublicReports(user, r);
                                            if (isViewedByRda) {
                                                return (
                                                    <button
                                                        style={S.btnDelete}
                                                        onClick={() => handleDelete(r)}
                                                        title="Delete this citizen report (Move to recycle bin)"
                                                    >
                                                        Delete Report
                                                    </button>
                                                );
                                            }
                                            return (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <button
                                                        style={{
                                                            ...S.btnDelete,
                                                            background: '#F1F5F9',
                                                            color: '#94A3B8',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'not-allowed',
                                                            opacity: 0.9,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                        disabled={true}
                                                        title="Rural Division Officers cannot delete citizen reports until an RDA/DMC officer reviews and marks them as viewed"
                                                    >
                                                        <span>🔒 Delete Locked</span>
                                                    </button>
                                                    <span style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic', fontWeight: 500 }}>
                                                        (Awaiting RDA/DMC review before deletion)
                                                    </span>
                                                </div>
                                            );
                                        })()}
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
    expiryPill: {
        fontSize: 11,
        fontWeight: 700,
        background: '#DAF1DE',
        color: '#0B2B26',
        border: '1.5px solid #235347',
        padding: '3px 10px',
        borderRadius: 14,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
    },
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
