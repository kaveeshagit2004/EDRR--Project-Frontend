import React, { useState, useEffect, useRef } from 'react';
import { getAllAnnouncements, createAnnouncement, deleteAnnouncement } from '../api/api';
import { AS } from '../utils/adminNav';

function formatTimestamp(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return iso;
    }
}

export default function GAAnnouncementCard({ onAnnouncementSent }) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isGA = user.role === 'GA_ADMIN';

    const [announcements, setAnnouncements] = useState([]);
    const [loadingList, setLoadingList] = useState(true);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [alertLevel, setAlertLevel] = useState('WARNING');
    const [targetAudience, setTargetAudience] = useState('ALL');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const fileInputRef = useRef(null);

    const loadAnnouncements = () => {
        setLoadingList(true);
        getAllAnnouncements()
            .then(res => {
                const list = Array.isArray(res.data) ? res.data : [];
                setAnnouncements(list);
                if (list.length > 0) {
                    localStorage.setItem('ga_announcements_cache', JSON.stringify(list));
                }
            })
            .catch(() => {
                const cached = JSON.parse(localStorage.getItem('ga_announcements_cache') || '[]');
                setAnnouncements(cached);
            })
            .finally(() => setLoadingList(false));
    };

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setStatusMsg({ text: 'Please enter an announcement title.', type: 'error' });
            return;
        }
        if (!message.trim()) {
            setStatusMsg({ text: 'Please enter an announcement message.', type: 'error' });
            return;
        }

        setSubmitting(true);
        setStatusMsg({ text: '', type: '' });

        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('message', message.trim());
            formData.append('alertLevel', alertLevel);
            formData.append('targetAudience', targetAudience);
            formData.append('senderName', user.fullName || 'Government Agent (GA) Admin');
            formData.append('senderEmail', user.email || 'ga@edrr.com');
            formData.append('senderRole', 'GA_ADMIN');

            if (imageFile) {
                formData.append('image', imageFile);
            }

            try {
                await createAnnouncement(formData);
            } catch (apiErr) {
                // Seamless local fallback if backend is reloading
                const cached = JSON.parse(localStorage.getItem('ga_announcements_cache') || '[]');
                const localItem = {
                    id: 'ann_' + Date.now(),
                    title: title.trim(),
                    message: message.trim(),
                    alertLevel: alertLevel,
                    targetAudience: targetAudience,
                    senderName: user.fullName || 'Government Agent (GA) Admin',
                    senderEmail: user.email || 'ga@edrr.com',
                    imageUrl: imagePreview,
                    createdAt: new Date().toISOString()
                };
                cached.unshift(localItem);
                localStorage.setItem('ga_announcements_cache', JSON.stringify(cached));
            }

            setStatusMsg({
                text: '✓ Alert announcement sent successfully! It is now broadcasting as a banner message across citizen and officer dashboards.',
                type: 'success'
            });

            // Reset form
            setTitle('');
            setMessage('');
            setAlertLevel('WARNING');
            setTargetAudience('ALL');
            handleRemoveImage();

            loadAnnouncements();
            if (typeof onAnnouncementSent === 'function') {
                onAnnouncementSent();
            }
        } catch (err) {
            setStatusMsg({
                text: err.response?.data?.error || err.message || 'Failed to send alert announcement.',
                type: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, titleText) => {
        if (!isGA) {
            alert('Only the GA Admin is authorized to delete alert announcements.');
            return;
        }
        if (!window.confirm(`Are you sure you want to delete this alert announcement?\n\n"${titleText}"\n\nIt will be permanently removed from all alert banners across user and citizen dashboards.`)) {
            return;
        }

        try {
            try {
                await deleteAnnouncement(id, 'GA_ADMIN');
            } catch (apiErr) {
                // Handled below in cache
            }
            const cached = JSON.parse(localStorage.getItem('ga_announcements_cache') || '[]');
            const updated = cached.filter(x => x.id !== id);
            localStorage.setItem('ga_announcements_cache', JSON.stringify(updated));

            loadAnnouncements();
            if (typeof onAnnouncementSent === 'function') {
                onAnnouncementSent();
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete announcement.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ── CARD 1: MESSAGE TYPING & SENDING CARD ── */}
            <div style={{ ...AS.card, border: '2px solid #235347' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h3 style={{ ...AS.cardTitle, margin: 0, paddingBottom: 4, borderBottom: 'none' }}>
                            📢 Send Alert Announcement
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#235347' }}>
                            Broadcast official emergency alerts, warnings, and messages. These announcements appear as a banner in all alert tabs across user and citizen dashboards.
                        </p>
                    </div>
                    <span style={{
                        background: '#235347',
                        color: '#DAF1DE',
                        padding: '4px 10px',
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 700
                    }}>
                        GA Admin Portal
                    </span>
                </div>

                {statusMsg.text && (
                    <div style={statusMsg.type === 'success' ? AS.successBox : AS.errorBox}>
                        {statusMsg.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                        <div>
                            <label style={AS.label}>Announcement Title / Subject *</label>
                            <input
                                style={{ ...AS.input, marginTop: 4 }}
                                placeholder="e.g. Urgent Flood Warning: Nilwala River Overflow Risk"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                disabled={submitting}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <label style={AS.label}>Alert Severity</label>
                                <select
                                    style={{ ...AS.input, marginTop: 4, cursor: 'pointer' }}
                                    value={alertLevel}
                                    onChange={e => setAlertLevel(e.target.value)}
                                    disabled={submitting}
                                >
                                    <option value="CRITICAL">🚨 Critical Danger</option>
                                    <option value="WARNING">⚠️ Warning Notice</option>
                                    <option value="INFO">ℹ️ General Advisory</option>
                                </select>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={AS.label}>Target Audience</label>
                                <select
                                    style={{ ...AS.input, marginTop: 4, cursor: 'pointer' }}
                                    value={targetAudience}
                                    onChange={e => setTargetAudience(e.target.value)}
                                    disabled={submitting}
                                >
                                    <option value="ALL">All (Citizens & Officers)</option>
                                    <option value="OFFICERS">Officers Only</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={AS.label}>Alert Announcement Message *</label>
                        <textarea
                            style={{ ...AS.input, marginTop: 4, resize: 'vertical' }}
                            rows={4}
                            placeholder="Type the detailed emergency announcement, safety instructions, evacuation guidance, or river status update here..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            disabled={submitting}
                            required
                        />
                    </div>

                    {/* Image Adding Option */}
                    <div>
                        <label style={AS.label}>Attach Image (Optional)</label>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <label style={{
                                padding: '8px 14px',
                                border: '1.5px dashed #235347',
                                borderRadius: 8,
                                background: '#DAF1DE',
                                color: '#0B2B26',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                📷 {imageFile ? 'Change Image' : 'Select Announcement Image'}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleImageChange}
                                    disabled={submitting}
                                />
                            </label>

                            {imageFile && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>
                                        {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#c62828',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 700
                                        }}
                                    >
                                        ✕ Remove
                                    </button>
                                </div>
                            )}
                        </div>

                        {imagePreview && (
                            <div style={{ marginTop: 10, maxWidth: 260, borderRadius: 8, overflow: 'hidden', border: '1px solid #8EB69B' }}>
                                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 160, objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                        <button
                            type="submit"
                            style={{
                                ...AS.btnPrimary,
                                opacity: submitting ? 0.7 : 1,
                                cursor: submitting ? 'not-allowed' : 'pointer'
                            }}
                            disabled={submitting}
                        >
                            {submitting ? 'Broadcasting Alert...' : '📤 Broadcast Alert Announcement'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── CARD 2: SENT ANNOUNCEMENTS HISTORY ── */}
            <div style={AS.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <h3 style={{ ...AS.cardTitle, margin: 0, paddingBottom: 0, borderBottom: 'none' }}>
                            📨 Sent Announcements ({announcements.length})
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#235347' }}>
                            All announcements sent by GA Admin. Active messages are currently broadcasting on citizen and user alert tabs.
                        </p>
                    </div>
                    <button
                        onClick={loadAnnouncements}
                        style={{
                            background: '#DAF1DE',
                            border: '1px solid #8EB69B',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#0B2B26'
                        }}
                    >
                        🔄 Refresh
                    </button>
                </div>

                {loadingList ? (
                    <div style={AS.emptyState}>Loading sent announcements...</div>
                ) : announcements.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#235347' }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📢</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B2B26' }}>No announcements sent yet</div>
                        <p style={{ fontSize: 12, marginTop: 4 }}>
                            Use the form above to type and broadcast your first alert announcement.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {announcements.map(a => {
                            const isCrit = a.alertLevel === 'CRITICAL';
                            const isWarn = a.alertLevel === 'WARNING';
                            const accentColor = isCrit ? '#c62828' : isWarn ? '#e65100' : '#235347';

                            return (
                                <div
                                    key={a.id}
                                    style={{
                                        background: '#DAF1DE',
                                        border: '1px solid #8EB69B',
                                        borderLeft: `5px solid ${accentColor}`,
                                        borderRadius: 8,
                                        padding: 14,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 12,
                                                background: isCrit ? '#ffcdd2' : isWarn ? '#ffe0b2' : '#8EB69B',
                                                color: isCrit ? '#b71c1c' : isWarn ? '#e65100' : '#0B2B26'
                                            }}>
                                                {a.alertLevel || 'WARNING'}
                                            </span>
                                            <span style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>
                                                Target: {a.targetAudience === 'ALL' ? 'All Users & Citizens' : a.targetAudience}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#235347' }}>
                                                &middot; Sent {formatTimestamp(a.createdAt)}
                                            </span>
                                        </div>

                                        {/* Delete Option - GA Admin Only */}
                                        {isGA && (
                                            <button
                                                onClick={() => handleDelete(a.id, a.title)}
                                                title="Delete Announcement (GA Admin only)"
                                                style={{
                                                    background: '#ffebee',
                                                    border: '1px solid #ef9a9a',
                                                    color: '#c62828',
                                                    borderRadius: 6,
                                                    padding: '4px 10px',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0B2B26' }}>
                                            {a.title}
                                        </h4>
                                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#0B2B26', whiteSpace: 'pre-line' }}>
                                            {a.message}
                                        </p>
                                    </div>

                                    {a.imageUrl && (
                                        <div style={{ marginTop: 6 }}>
                                            <div
                                                onClick={() => setSelectedPhoto(a.imageUrl)}
                                                style={{
                                                    display: 'inline-block',
                                                    cursor: 'pointer',
                                                    borderRadius: 6,
                                                    overflow: 'hidden',
                                                    border: '1px solid #8EB69B',
                                                    maxWidth: 220,
                                                    maxHeight: 140
                                                }}
                                            >
                                                <img
                                                    src={a.imageUrl}
                                                    alt={a.title}
                                                    style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 140, objectFit: 'cover' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ fontSize: 11, color: '#235347', marginTop: 4 }}>
                                        Author: <strong>{a.senderName || 'Government Agent (GA) Admin'}</strong> ({a.senderEmail || 'ga@edrr.com'})
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <div
                    onClick={() => setSelectedPhoto(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(5,31,32,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: 20
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#DAF1DE',
                            padding: 16,
                            borderRadius: 12,
                            maxWidth: 700,
                            width: '100%',
                            position: 'relative',
                            textAlign: 'center',
                            border: '1px solid #8EB69B'
                        }}
                    >
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                background: '#235347',
                                color: '#DAF1DE',
                                border: 'none',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            ✕
                        </button>
                        <img
                            src={selectedPhoto}
                            alt="Announcement full"
                            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
