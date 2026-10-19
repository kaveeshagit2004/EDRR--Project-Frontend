import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, getAllFinalReports, uploadFinalReport, deleteFinalReport } from '../api/api';
import RecoveryProgressBar from '../components/RecoveryProgressBar';
import { resolveSidebarNav, AS } from '../utils/adminNav';

const REPORT_TYPES = [
    { value: 'ALL', label: 'All Types' },
    { value: 'FLOOD', label: 'Flood' },
    { value: 'ROAD_DAMAGE', label: 'Road Damage' },
    { value: 'BRIDGE_DAMAGE', label: 'Bridge Damage' },
    { value: 'BUILDING', label: 'Building' },
    { value: 'WATER_POLLUTION', label: 'Water Pollution' },
    { value: 'OTHER', label: 'Other' },
];

const DAMAGE_TYPE_OPTIONS = [
    { value: 'ROAD_DAMAGE', label: 'Road Damage' },
    { value: 'BRIDGE_DAMAGE', label: 'Bridge Damage' },
    { value: 'FLOOD', label: 'Flood' },
    { value: 'BUILDING', label: 'Building' },
    { value: 'WATER_POLLUTION', label: 'Water Pollution' },
    { value: 'OTHER', label: 'Other' },
];

function formatDate(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const DAMAGE_TYPE_LABEL = DAMAGE_TYPE_OPTIONS.reduce((acc, t) => ({ ...acc, [t.value]: t.label }), {});

export default function AdminFinalReportPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const isRDA = user.role === 'RDA_ADMIN';
    const isGA = user.role === 'GA_ADMIN';

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [damageType, setDamageType] = useState('ALL');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [photoIndex, setPhotoIndex] = useState(0);

    // Final reports stored in MongoDB
    const [finalReportsList, setFinalReportsList] = useState([]);
    const [loadingFinalReports, setLoadingFinalReports] = useState(true);

    // Upload state (for RDA Admin)
    const [uploadDamageType, setUploadDamageType] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadNotes, setUploadNotes] = useState('');
    const [uploadMsg, setUploadMsg] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadResolvedReports();
        loadFinalReports();
    }, []);

    const loadResolvedReports = () => {
        getAllReports()
            .then(r => setReports((r.data || []).filter(x => x.status === 'RESOLVED')))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const loadFinalReports = async () => {
        setLoadingFinalReports(true);
        try {
            const res = await getAllFinalReports();
            setFinalReportsList(res.data || []);
        } catch (err) {
            console.error('Failed to load final reports from MongoDB:', err);
        } finally {
            setLoadingFinalReports(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploadMsg('');
        if (!uploadDamageType) { setUploadMsg('error:Select a damage type.'); return; }
        if (!uploadFile) { setUploadMsg('error:Choose a file to upload.'); return; }
        if (uploadFile.size > 15 * 1024 * 1024) { setUploadMsg('error:File is too large (max 15MB).'); return; }

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', uploadFile);
            fd.append('damageType', uploadDamageType);
            fd.append('notes', uploadNotes);
            fd.append('uploadedBy', user.fullName || user.name || 'RDA Officer');
            fd.append('uploadedByRole', user.role || 'RDA_ADMIN');

            await uploadFinalReport(fd);
            setUploadFile(null);
            setUploadDamageType('');
            setUploadNotes('');
            setUploadMsg('success:Final report uploaded successfully to database.');
            await loadFinalReports();
            setTimeout(() => setUploadMsg(''), 4500);
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message || 'Could not upload the file. Please try again.';
            setUploadMsg('error:' + errMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (id, fileName) => {
        if (!window.confirm(`Are you sure you want to delete the final report "${fileName}"?`)) {
            return;
        }
        try {
            await deleteFinalReport(id);
            await loadFinalReports();
        } catch (err) {
            alert('Failed to delete final report: ' + (err.response?.data?.error || err.message));
        }
    };

    const typesCovered = useMemo(() => new Set(reports.map(r => r.damageType).filter(Boolean)).size, [reports]);

    const filtered = useMemo(() => reports.filter(r => {
        const matchesType = damageType === 'ALL' || r.damageType === damageType;
        const haystack = `${r.reportNumber || ''} ${r.title || ''} ${r.location || ''} ${r.reporterName || ''}`.toLowerCase();
        return matchesType && haystack.includes(query.toLowerCase());
    }), [reports, damageType, query]);

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar">
                <div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                    <div style={{ marginBottom: 20 }}>
                        <h2 style={AS.title}>Final Report</h2>
                        <p style={AS.subtitle}>
                            Closure summary and official completion documentation of disaster damage recovery projects in Matara District.
                        </p>
                    </div>

                    <div className="final-report-layout">
                        {/* Sidebar: Uploaded Final Reports from RDA */}
                        <aside className="final-report-side">
                            <div style={{ ...AS.card, marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                                    <h3 style={AS.cardTitle}>
                                        Uploaded Final Reports ({finalReportsList.length})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={loadFinalReports}
                                        title="Refresh final reports list"
                                        style={{ background: 'transparent', border: 'none', color: '#235347', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                                    >
                                        ↻ Refresh
                                    </button>
                                </div>

                                {isGA && (
                                    <div style={{ background: '#E8F5E9', border: '1px solid #8EB69B', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#1B5E20', marginBottom: 12, lineHeight: 1.4 }}>
                                        <strong>GA View:</strong> Final closure reports submitted by the RDA Office are listed below for verification and archive download.
                                    </div>
                                )}

                                {loadingFinalReports ? (
                                    <p style={{ fontSize: 12, color: '#235347' }}>Loading final reports from server...</p>
                                ) : finalReportsList.length === 0 ? (
                                    <div style={{ padding: '16px 10px', textAlign: 'center', background: '#DAF1DE', borderRadius: 8, border: '1px dashed #8EB69B' }}>
                                        <p style={{ fontSize: 13, color: '#0B2B26', fontWeight: 600, margin: '0 0 4px' }}>No final reports uploaded yet.</p>
                                        <p style={{ fontSize: 11, color: '#235347', margin: 0 }}>
                                            When an RDA Officer adds a final completion report, it will be saved to MongoDB and appear here immediately for GA Admin review and download.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {finalReportsList.map(doc => {
                                            const downloadEndpoint = `http://localhost:8080/api/final-reports/download/${doc.id}`;
                                            return (
                                                <div
                                                    key={doc.id}
                                                    style={{
                                                        background: '#DAF1DE',
                                                        border: '1px solid #8EB69B',
                                                        borderRadius: 9,
                                                        padding: '12px 14px',
                                                        boxShadow: '0 2px 6px rgba(11,43,38,0.06)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                                        <span style={AS.badge}>
                                                            {DAMAGE_TYPE_LABEL[doc.damageType] || (doc.damageType || 'OTHER').replace('_', ' ')}
                                                        </span>
                                                        {doc.uploadedAt && (
                                                            <span style={{ fontSize: 11, color: '#235347', fontWeight: 500 }}>
                                                                {formatDate(doc.uploadedAt)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0B2B26', marginTop: 8, wordBreak: 'break-word' }}>
                                                        📄 {doc.fileName}
                                                    </div>

                                                    <div style={{ fontSize: 11, color: '#235347', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span>Uploaded by: <strong>{doc.uploadedBy || 'RDA Officer'}</strong></span>
                                                        {doc.fileSize ? <span>&bull; {formatFileSize(doc.fileSize)}</span> : null}
                                                    </div>

                                                    {doc.notes && (
                                                        <div style={{ background: '#FFFFFF', borderRadius: 6, padding: '6px 8px', marginTop: 8, fontSize: 12, color: '#235347', border: '1px solid #8EB69B', lineHeight: 1.4 }}>
                                                            <strong style={{ color: '#0B2B26' }}>Summary: </strong>{doc.notes}
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <a
                                                            href={downloadEndpoint}
                                                            download={doc.fileName}
                                                            style={{
                                                                ...AS.btnPrimary,
                                                                padding: '7px 16px',
                                                                fontSize: 12,
                                                                fontWeight: 700,
                                                                textDecoration: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 6
                                                            }}
                                                        >
                                                            <span>📥 Download File</span>
                                                        </a>

                                                        {(isRDA || isGA) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                                                                title="Delete this final report"
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: '1px solid #C0392B',
                                                                    color: '#C0392B',
                                                                    borderRadius: 7,
                                                                    padding: '6px 10px',
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </aside>

                        {/* Main Panel */}
                        <div className="final-report-main">
                            {isRDA && (
                                <div style={{ ...AS.card }}>
                                    <h3 style={AS.cardTitle}>Upload Final Report</h3>
                                    <p style={{ fontSize: 12, color: '#235347', margin: '0 0 12px' }}>
                                        Upload completed recovery and reconstruction documentation. These files are stored in MongoDB and are immediately accessible by the GA Admin.
                                    </p>
                                    {uploadMsg && (
                                        <div style={uploadMsg.startsWith('success') ? AS.successBox : AS.errorBox}>
                                            {uploadMsg.split(':').slice(1).join(':')}
                                        </div>
                                    )}
                                    <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div>
                                            <label style={{ ...AS.label, display: 'block', marginBottom: 6 }}>Damage Type *</label>
                                            <select style={AS.input} value={uploadDamageType} onChange={e => setUploadDamageType(e.target.value)}>
                                                <option value="">Select a damage type...</option>
                                                {DAMAGE_TYPE_OPTIONS.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ ...AS.label, display: 'block', marginBottom: 6 }}>Final Report File * (PDF, Word, Excel, max 15MB)</label>
                                            <input
                                                style={AS.input}
                                                type="file"
                                                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ ...AS.label, display: 'block', marginBottom: 6 }}>Closure Summary (optional)</label>
                                            <textarea
                                                style={{ ...AS.input, height: 70, resize: 'vertical' }}
                                                placeholder="Brief summary of the recovery works and outcome..."
                                                value={uploadNotes}
                                                onChange={e => setUploadNotes(e.target.value)}
                                            />
                                        </div>
                                        <button type="submit" style={{ ...AS.btnPrimary, alignSelf: 'flex-start' }} disabled={uploading}>
                                            {uploading ? 'Uploading to Server...' : 'Upload Final Report'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            <div style={S.statsRow}>
                                <div style={S.statCard}><div style={S.statNum}>{reports.length}</div><div style={S.statLabel}>Cases Closed</div></div>
                                <div style={S.statCard}><div style={S.statNum}>{typesCovered}</div><div style={S.statLabel}>Damage Types Covered</div></div>
                                <div style={S.statCard}><div style={S.statNum}>{finalReportsList.length}</div><div style={S.statLabel}>Final Reports Archived</div></div>
                            </div>

                            <div style={{ ...AS.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <input
                                    style={AS.input}
                                    placeholder="Search report number, title, location or officer..."
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

                            {loading ? <div style={AS.emptyState}>Loading resolved damage reports...</div> : (
                                filtered.length === 0 ? (
                                    <div style={{ ...AS.card, textAlign: 'center' }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B2B26', margin: 0 }}>No closed cases found</h3>
                                        <p style={{ fontSize: 12, color: '#235347', marginTop: 4 }}>
                                            {reports.length === 0 ? 'No damage reports have been marked resolved yet.' : 'Try changing your search or damage type filter.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                                        {filtered.map(r => (
                                            <article key={r.id} style={AS.card}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
                                                    <span style={{ fontSize: 12, color: '#235347', fontFamily: 'monospace' }}>{r.reportNumber || `Report ${r.id}`}</span>
                                                    <span style={{ background: '#0B2B26', color: '#DAF1DE', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>RESOLVED</span>
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
                                                    {r.reportedAt && <span style={{ fontSize: 12, color: '#235347' }}>&middot; {formatDate(r.reportedAt)}</span>}
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
                                                {r.adminNotes && (
                                                    <div style={{ background: '#DAF1DE', border: '1px solid #8EB69B', borderRadius: 7, padding: '8px 10px', fontSize: 12, color: '#235347', marginBottom: 10 }}>
                                                        <strong style={{ color: '#0B2B26' }}>Closure Notes: </strong>{r.adminNotes}
                                                    </div>
                                                )}
                                                <RecoveryProgressBar status={r.status || 'RESOLVED'} recoveryProgress={r.recoveryProgress || 100} />
                                            </article>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
