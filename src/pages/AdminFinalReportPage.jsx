import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import {
    getAllReports,
    getAllFinalReports,
    getDeletedFinalReports,
    uploadFinalReport,
    deleteFinalReport,
    restoreFinalReport,
    permanentlyDeleteFinalReport
} from '../api/api';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';
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

    // Recycle bin reports
    const [deletedReportsList, setDeletedReportsList] = useState([]);
    const [loadingDeletedReports, setLoadingDeletedReports] = useState(true);
    const [sideTab, setSideTab] = useState('active'); // 'active' | 'bin'

    // Delete Reason Modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deletingAction, setDeletingAction] = useState(false);
    const [actionBusyId, setActionBusyId] = useState(null);
    const [announcementTrigger, setAnnouncementTrigger] = useState(0);

    // Upload state (for RDA Admin)
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadNotes, setUploadNotes] = useState('');
    const [uploadMsg, setUploadMsg] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadResolvedReports();
        loadFinalReports();
        loadDeletedFinalReports();

        // Request browser push notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
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

    const loadDeletedFinalReports = async () => {
        setLoadingDeletedReports(true);
        try {
            const res = await getDeletedFinalReports();
            setDeletedReportsList(res.data || []);
        } catch (err) {
            console.error('Failed to load deleted final reports from MongoDB:', err);
        } finally {
            setLoadingDeletedReports(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploadMsg('');
        if (!uploadTitle.trim()) { setUploadMsg('error:Please enter the title of final report.'); return; }
        if (!uploadFile) { setUploadMsg('error:Choose a file to upload.'); return; }
        if (uploadFile.size > 15 * 1024 * 1024) { setUploadMsg('error:File is too large (max 15MB).'); return; }

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', uploadFile);
            fd.append('damageType', uploadTitle.trim());
            fd.append('title', uploadTitle.trim());
            fd.append('notes', uploadNotes);
            fd.append('uploadedBy', user.fullName || user.name || 'RDA Officer');
            fd.append('uploadedByRole', user.role || 'RDA_ADMIN');

            await uploadFinalReport(fd);
            setUploadFile(null);
            setUploadTitle('');
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

    // Open deletion modal with mandatory reason prompt
    const openDeleteModal = (doc) => {
        setReportToDelete(doc);
        setDeleteReason('');
        setDeleteError('');
        setDeleteModalOpen(true);
    };

    // Submit soft delete with reason, triggers push notification to RDA/DMC officers
    const handleConfirmDelete = async (e) => {
        if (e) e.preventDefault();
        if (!deleteReason.trim()) {
            setDeleteError('Please provide a reason: why are you deleting this report?');
            return;
        }

        setDeletingAction(true);
        setDeleteError('');
        try {
            await deleteFinalReport(reportToDelete.id, deleteReason.trim(), {
                deletedBy: user.email || 'ga@edrr.com',
                deletedByName: user.fullName || user.name || 'Government Agent (GA)'
            });



            setDeleteModalOpen(false);
            setReportToDelete(null);
            setDeleteReason('');
            await Promise.all([loadFinalReports(), loadDeletedFinalReports()]);
            setAnnouncementTrigger(prev => prev + 1);
        } catch (err) {
            setDeleteError(err.response?.data?.error || err.message || 'Failed to move report to recycle bin.');
        } finally {
            setDeletingAction(false);
        }
    };

    // Restore final report from recycle bin
    const handleRestoreDoc = async (id, fileName) => {
        setActionBusyId(id);
        try {
            await restoreFinalReport(id);
            await Promise.all([loadFinalReports(), loadDeletedFinalReports()]);
        } catch (err) {
            alert('Failed to restore final report: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionBusyId(null);
        }
    };

    // Permanently delete final report from MongoDB and disk
    const handlePermanentDeleteDoc = async (id, fileName) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${fileName}"?\nThis action cannot be undone and will erase the file from disk.`)) {
            return;
        }
        setActionBusyId(id);
        try {
            await permanentlyDeleteFinalReport(id);
            await loadDeletedFinalReports();
        } catch (err) {
            alert('Failed to permanently delete final report: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionBusyId(null);
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

                    {/* Official GA Alert Announcement Banner & Notifications */}
                    <AlertAnnouncementBanner refreshTrigger={announcementTrigger} />

                    <div className="final-report-layout">
                        {/* Sidebar: Uploaded Final Reports from RDA / Recycle Bin */}
                        <aside className="final-report-side">
                            <div style={{ ...AS.card, marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                                    <h3 style={AS.cardTitle}>
                                        {sideTab === 'active' ? `Final Reports (${finalReportsList.length})` : `Recycle Bin (${deletedReportsList.length})`}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => { loadFinalReports(); loadDeletedFinalReports(); }}
                                        title="Refresh final reports list"
                                        style={{ background: 'transparent', border: 'none', color: '#235347', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                                    >
                                        ↻ Refresh
                                    </button>
                                </div>

                                {/* Tab Toggle: Active vs Recycle Bin */}
                                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                    <button
                                        type="button"
                                        onClick={() => setSideTab('active')}
                                        style={{
                                            flex: 1,
                                            padding: '7px 8px',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            borderRadius: 7,
                                            border: sideTab === 'active' ? '2px solid #235347' : '1px solid #8EB69B',
                                            background: sideTab === 'active' ? '#235347' : '#DAF1DE',
                                            color: sideTab === 'active' ? '#FFFFFF' : '#0B2B26',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Active ({finalReportsList.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSideTab('bin')}
                                        style={{
                                            flex: 1,
                                            padding: '7px 8px',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            borderRadius: 7,
                                            border: sideTab === 'bin' ? '2px solid #C0392B' : '1px solid #8EB69B',
                                            background: sideTab === 'bin' ? '#C0392B' : '#DAF1DE',
                                            color: sideTab === 'bin' ? '#FFFFFF' : '#8B0000',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🗑 Bin ({deletedReportsList.length})
                                    </button>
                                </div>

                                {isGA && sideTab === 'active' && (
                                    <div style={{ background: '#E8F5E9', border: '1px solid #8EB69B', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#1B5E20', marginBottom: 12, lineHeight: 1.4 }}>
                                        <strong>GA View:</strong> Final closure reports submitted by the RDA Office are listed below. Click Delete to specify a removal reason and notify RDA officers.
                                    </div>
                                )}

                                {sideTab === 'bin' && (
                                    <div style={{ background: '#FFF3CD', border: '1px solid #FFEEBA', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#856404', marginBottom: 12, lineHeight: 1.4 }}>
                                        <strong>Recycle Bin:</strong> Deleted reports are safely stored here with their deletion reasons. You can restore or permanently delete them.
                                    </div>
                                )}

                                {sideTab === 'active' ? (
                                    loadingFinalReports ? (
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
                                                                {doc.title || DAMAGE_TYPE_LABEL[doc.damageType] || (doc.damageType || 'FINAL REPORT').replace('_', ' ')}
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
                                                                    onClick={() => openDeleteModal(doc)}
                                                                    title="Delete this final report (move to recycle bin with reason)"
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
                                    )
                                ) : (
                                    /* Recycle Bin List */
                                    loadingDeletedReports ? (
                                        <p style={{ fontSize: 12, color: '#235347' }}>Loading recycle bin from server...</p>
                                    ) : deletedReportsList.length === 0 ? (
                                        <div style={{ padding: '16px 10px', textAlign: 'center', background: '#FFF5F5', borderRadius: 8, border: '1px dashed #E57373' }}>
                                            <p style={{ fontSize: 13, color: '#C0392B', fontWeight: 600, margin: '0 0 4px' }}>Recycle Bin is empty.</p>
                                            <p style={{ fontSize: 11, color: '#795548', margin: 0 }}>
                                                When a report is deleted by GA Admin, it moves here with the deletion reason and can be restored or permanently removed.
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {deletedReportsList.map(doc => {
                                                const downloadEndpoint = `http://localhost:8080/api/final-reports/download/${doc.id}`;
                                                return (
                                                    <div
                                                        key={doc.id}
                                                        style={{
                                                            background: '#FFF5F5',
                                                            border: '1.5px solid #E57373',
                                                            borderRadius: 9,
                                                            padding: '12px 14px',
                                                            boxShadow: '0 2px 6px rgba(192,57,43,0.08)'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                                            <span style={{ ...AS.badge, background: '#C0392B', color: '#FFFFFF' }}>
                                                                🗑 In Recycle Bin
                                                            </span>
                                                            {doc.deletedAt && (
                                                                <span style={{ fontSize: 11, color: '#C0392B', fontWeight: 600 }}>
                                                                    {formatDate(doc.deletedAt)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0B2B26', marginTop: 8, wordBreak: 'break-word' }}>
                                                            📄 {doc.fileName}
                                                        </div>

                                                        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                                                            Deleted by: <strong>{doc.deletedByName || doc.deletedBy || 'GA Admin'}</strong>
                                                        </div>

                                                        {doc.deleteReason && (
                                                            <div style={{
                                                                background: '#FFF8E1',
                                                                borderRadius: 6,
                                                                padding: '8px 10px',
                                                                marginTop: 8,
                                                                fontSize: 12,
                                                                color: '#8D6E63',
                                                                border: '1px solid #FFE082',
                                                                lineHeight: 1.4
                                                            }}>
                                                                <strong style={{ color: '#D84315' }}>GA Admin Reason: </strong>
                                                                <div style={{ marginTop: 2, fontStyle: 'italic', color: '#3E2723' }}>
                                                                    &ldquo;GA admin remove your uploaded final report on this &quot;{doc.deleteReason}&quot;. check the report and submit it again&rdquo;
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <a
                                                                href={downloadEndpoint}
                                                                download={doc.fileName}
                                                                style={{
                                                                    ...AS.btnPrimary,
                                                                    padding: '6px 12px',
                                                                    fontSize: 11,
                                                                    fontWeight: 700,
                                                                    textDecoration: 'none',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4
                                                                }}
                                                            >
                                                                <span>📥 Download</span>
                                                            </a>

                                                            {(isGA || isRDA) && (
                                                                <button
                                                                    type="button"
                                                                    disabled={actionBusyId === doc.id}
                                                                    onClick={() => handleRestoreDoc(doc.id, doc.fileName)}
                                                                    title="Restore this report back to active reports list"
                                                                    style={{
                                                                        background: '#235347',
                                                                        border: '1px solid #235347',
                                                                        color: '#DAF1DE',
                                                                        borderRadius: 7,
                                                                        padding: '6px 12px',
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {actionBusyId === doc.id ? 'Restoring...' : '↺ Restore'}
                                                                </button>
                                                            )}

                                                            {isGA && (
                                                                <button
                                                                    type="button"
                                                                    disabled={actionBusyId === doc.id}
                                                                    onClick={() => handlePermanentDeleteDoc(doc.id, doc.fileName)}
                                                                    title="Permanently erase this report from database and server disk"
                                                                    style={{
                                                                        background: 'transparent',
                                                                        border: '1px solid #C0392B',
                                                                        color: '#C0392B',
                                                                        borderRadius: 7,
                                                                        padding: '6px 10px',
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Delete Permanently
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                )}
                            </div>
                        </aside>

                        {/* Main Panel */}
                        <div className="final-report-main">
                            {/* RDA Notice if reports were removed by GA Admin */}
                            {isRDA && deletedReportsList.length > 0 && (
                                <div style={{
                                    background: '#FFF3CD',
                                    border: '1.5px solid #FFEEBA',
                                    color: '#856404',
                                    borderRadius: 8,
                                    padding: '12px 16px',
                                    marginBottom: 16,
                                    fontSize: 13,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 12,
                                    flexWrap: 'wrap'
                                }}>
                                    <div>
                                        <strong style={{ fontSize: 14 }}>⚠️ GA Admin Notice on Final Report:</strong>
                                        <p style={{ margin: '4px 0 0', lineHeight: 1.4 }}>
                                            GA admin remove your uploaded final report on this &ldquo;<strong>{deletedReportsList[0].deleteReason || 'Revision requested'}</strong>&rdquo;. check the report and submit it again.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSideTab('bin')}
                                        style={{
                                            background: '#856404',
                                            color: '#FFF3CD',
                                            border: 'none',
                                            borderRadius: 6,
                                            padding: '6px 12px',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        View in Recycle Bin ({deletedReportsList.length}) →
                                    </button>
                                </div>
                            )}
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
                                            <label style={{ ...AS.label, display: 'block', marginBottom: 6 }}>Title of final report *</label>
                                            <input
                                                type="text"
                                                style={AS.input}
                                                placeholder="Enter title of final report..."
                                                value={uploadTitle}
                                                onChange={e => setUploadTitle(e.target.value)}
                                            />
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
                                <div
                                    style={{ ...S.statCard, cursor: 'pointer', border: sideTab === 'active' ? '2px solid #235347' : '1px solid #8EB69B' }}
                                    onClick={() => setSideTab('active')}
                                    title="View active final reports"
                                >
                                    <div style={S.statNum}>{finalReportsList.length}</div>
                                    <div style={S.statLabel}>Final Reports Active</div>
                                </div>
                                <div
                                    style={{
                                        ...S.statCard,
                                        cursor: 'pointer',
                                        border: sideTab === 'bin' ? '2px solid #C0392B' : '1px solid #8EB69B',
                                        background: sideTab === 'bin' ? '#FFEBEE' : '#DAF1DE'
                                    }}
                                    onClick={() => setSideTab('bin')}
                                    title="View final reports in Recycle Bin"
                                >
                                    <div style={{ ...S.statNum, color: '#C0392B' }}>{deletedReportsList.length}</div>
                                    <div style={{ ...S.statLabel, color: '#C0392B' }}>🗑 In Recycle Bin</div>
                                </div>
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

            {/* Delete Reason Modal for GA Admin */}
            {deleteModalOpen && reportToDelete && (
                <div style={S.modalOverlay} onClick={() => !deletingAction && setDeleteModalOpen(false)}>
                    <div style={{ ...S.modalContent, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <button
                            style={S.modalClose}
                            disabled={deletingAction}
                            onClick={() => setDeleteModalOpen(false)}
                        >
                            ✕
                        </button>
                        <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#C0392B', fontWeight: 800 }}>
                            🗑 Move Final Report to Recycle Bin
                        </h3>
                        <p style={{ fontSize: 13, color: '#235347', margin: '0 0 14px', lineHeight: 1.4 }}>
                            Are you sure you want to remove <strong>&ldquo;{reportToDelete.fileName}&rdquo;</strong>? It will be moved to the Recycle Bin and RDA/DMC officers will be notified to review and submit it again.
                        </p>

                        <form onSubmit={handleConfirmDelete}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0B2B26', marginBottom: 6 }}>
                                Why are you deleting this report? *
                            </label>
                            <textarea
                                style={{ ...AS.input, height: 90, resize: 'vertical', border: deleteError ? '2px solid #C0392B' : undefined }}
                                placeholder="e.g. Incomplete damage outcome documentation, missing photographs, or incorrect financial expenditure details..."
                                value={deleteReason}
                                onChange={e => { setDeleteReason(e.target.value); setDeleteError(''); }}
                                autoFocus
                                required
                            />
                            {deleteError && (
                                <div style={{ color: '#C0392B', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                                    {deleteError}
                                </div>
                            )}

                            <div style={{
                                background: '#FFF8E1',
                                border: '1px solid #FFE082',
                                borderRadius: 6,
                                padding: '8px 10px',
                                margin: '12px 0 16px',
                                fontSize: 12,
                                color: '#795548',
                                lineHeight: 1.4
                            }}>
                                <strong>Push notification to RDA/DMC officers:</strong>
                                <div style={{ fontStyle: 'italic', marginTop: 3, color: '#3E2723' }}>
                                    &ldquo;GA admin remove your uploaded final report on this &quot;{deleteReason || '...'}&quot;. check the report and submit it again&rdquo;
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button
                                    type="button"
                                    disabled={deletingAction}
                                    onClick={() => setDeleteModalOpen(false)}
                                    style={{
                                        background: '#DAF1DE',
                                        border: '1px solid #8EB69B',
                                        color: '#0B2B26',
                                        borderRadius: 7,
                                        padding: '8px 16px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deletingAction}
                                    style={{
                                        background: '#C0392B',
                                        border: 'none',
                                        color: '#FFFFFF',
                                        borderRadius: 7,
                                        padding: '8px 18px',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {deletingAction ? 'Removing...' : 'Confirm & Move to Recycle Bin'}
                                </button>
                            </div>
                        </form>
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
