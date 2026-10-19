import React, { useEffect, useState } from 'react';
import { getDeletedReports, restoreReport, permanentlyDeleteReport } from '../api/api';

// Inline bin icon (the app has no icon library). `count` shows a small badge.
export function RecycleBinIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}

const fmt = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date) ? '' : date.toLocaleString();
};

// Lists reports that were deleted by a Rural Officer or the GA. The GA can restore each one
// or delete it permanently. `onChanged` lets the parent refresh its active list / bin count.
export default function RecycleBin({ onBack, onChanged }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busyId, setBusyId] = useState(null);

    const load = () => {
        setLoading(true);
        return getDeletedReports()
            .then(res => {
                const list = Array.isArray(res.data) ? [...res.data] : [];
                list.sort((a, b) => (b.deletedAt ? new Date(b.deletedAt) : 0) - (a.deletedAt ? new Date(a.deletedAt) : 0));
                setItems(list);
                setError('');
            })
            .catch(err => {
                console.error('Failed to load recycle bin:', err);
                setError('Could not load the recycle bin. Please try again.');
            })
            .finally(() => setLoading(false));
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, []);

    const handleRestore = async (r) => {
        setBusyId(r.id);
        setError('');
        setSuccess('');
        try {
            await restoreReport(r.id);
            setSuccess(`Successfully restored "${r.title}".`);
            await load();
            onChanged && onChanged();
        } catch (err) {
            console.error('Restore error:', err);
            setError(`Failed to restore ${r.reportNumber || 'the report'}.`);
        } finally {
            setBusyId(null);
        }
    };

    const handlePermanentDelete = async (r) => {
        if (!window.confirm(`Permanently delete "${r.title}" (${r.reportNumber || `#${r.id}`})? This cannot be undone.`)) return;
        setBusyId(r.id);
        setError('');
        setSuccess('');
        try {
            await permanentlyDeleteReport(r.id);
            setSuccess(`Permanently deleted "${r.title}".`);
            await load();
            onChanged && onChanged();
        } catch (err) {
            console.error('Permanent delete error:', err);
            setError(`Failed to permanently delete ${r.reportNumber || 'the report'}.`);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <div style={S.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#0B2B26', display: 'inline-flex' }}><RecycleBinIcon size={24} /></span>
                    <h2 style={S.title}>Recycle Bin ({items.length})</h2>
                </div>
                <button style={S.btnGhost} onClick={onBack}>← Back to Reports</button>
            </div>
            <p style={S.note}>
                Damage reports deleted by a Rural Officer or GA are kept here. Restore a report to return it to the
                active list, or delete it permanently.
            </p>

            {error && <div style={S.errorBox}>{error}</div>}
            {success && <div style={S.successBox}>{success}</div>}

            {loading ? (
                <div style={S.empty}>Loading recycle bin...</div>
            ) : items.length === 0 ? (
                <div style={S.empty}>The recycle bin is empty.</div>
            ) : items.map(r => (
                <div key={r.id} style={S.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#235347', fontFamily: 'monospace' }}>{r.reportNumber || `Report ${r.id}`}</span>
                        {r.severity && <span style={S.badge}>{r.severity}</span>}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{r.title}</h3>
                    <p style={{ fontSize: 12, color: '#235347', margin: '0 0 6px' }}>{r.location}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                        {r.damageType && <span style={S.type}>{r.damageType.replace('_', ' ')}</span>}
                        {r.status && <span style={S.type}>{r.status.replace('_', ' ')}</span>}
                        {r.reporterName && <span style={{ fontSize: 12, color: '#235347' }}>Reported by : {r.reporterName}</span>}
                    </div>
                    {r.photoUrls && r.photoUrls.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <img src={r.photoUrls[0]} alt={r.title} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #8EB69B' }} />
                        </div>
                    )}
                    {(r.deletedAt || r.deletedByName) && (
                        <div style={{ fontSize: 12, color: '#235347', marginBottom: 10 }}>
                            Deleted{r.deletedByName ? ` by ${r.deletedByName}` : ''}{r.deletedAt ? ` on ${fmt(r.deletedAt)}` : ''}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button style={S.btn} disabled={busyId === r.id} onClick={() => handleRestore(r)}>
                            {busyId === r.id ? 'Restoring...' : 'Restore'}
                        </button>
                        <button style={S.btnDanger} disabled={busyId === r.id} onClick={() => handlePermanentDelete(r)}>
                            {busyId === r.id ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

const S = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10, flexWrap: 'wrap' },
    title: { fontSize: 24, fontWeight: 800, margin: 0, color: '#0B2B26', textShadow: 'none' },
    note: { fontSize: 13, color: '#235347', margin: '0 0 16px' },
    card: { background: '#DAF1DE', borderRadius: 12, padding: 18, marginBottom: 10, border: '1px solid #8EB69B', boxShadow: '0 2px 10px rgba(11,43,38,0.10)', color: '#0B2B26' },
    badge: { fontSize: 12, color: '#0B2B26', padding: '3px 9px', borderRadius: 20, fontWeight: 600, background: '#8EB69B' },
    type: { fontSize: 12, color: '#235347', background: '#DAF1DE', padding: '2px 8px', borderRadius: 4, border: '1px solid #8EB69B' },
    btn: { padding: '6px 14px', border: '1px solid #235347', borderRadius: 9, background: '#235347', color: '#DAF1DE', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    btnDanger: { padding: '6px 14px', border: '1px solid #0B2B26', borderRadius: 9, background: '#DAF1DE', color: '#0B2B26', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    btnGhost: { padding: '8px 14px', border: '1px solid #8EB69B', borderRadius: 9, background: '#DAF1DE', color: '#235347', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    empty: { textAlign: 'center', color: '#235347', padding: 60, fontSize: 13 },
    errorBox: { background: '#DAF1DE', borderLeft: '4px solid #0B2B26', color: '#0B2B26', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 },
    successBox: { background: '#DAF1DE', borderLeft: '4px solid #235347', color: '#0B2B26', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 600 },
};
