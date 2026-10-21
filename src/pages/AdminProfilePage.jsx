import React, { useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { resolveSidebarNav, AS } from '../utils/adminNav';
import { updateProfilePhoto } from '../api/api';

export default function AdminProfilePage() {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select a valid image file (PNG, JPG, JPEG).' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image size must be less than 5MB.' });
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setMessage({ type: '', text: '' });
    };

    const handleCancelPreview = () => {
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSavePhoto = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('photo', selectedFile);
            if (user.id || user._id) {
                formData.append('userId', user.id || user._id);
            }
            if (user.email) {
                formData.append('email', user.email);
            }

            const res = await updateProfilePhoto(formData);
            const newPhotoUrl = res.data?.profilePhotoUrl;

            const updatedUser = {
                ...user,
                profilePhotoUrl: newPhotoUrl || user.profilePhotoUrl
            };

            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setSelectedFile(null);
            setPreviewUrl(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.error || err.message || 'Failed to update profile photo.'
            });
        } finally {
            setUploading(false);
        }
    };

    const displayPhoto = previewUrl || user.profilePhotoUrl;

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar">
                <div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                    <div style={{ marginBottom: 20 }}>
                        <h2 style={AS.title}>Profile</h2>
                        <p style={AS.subtitle}>Your Protect LK account information.</p>
                    </div>

                    <div style={{
                        ...AS.card,
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: 32,
                        alignItems: 'start',
                        padding: 32
                    }}>
                        {/* Profile Photo with Change Photo Control */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                            <div style={{ position: 'relative', width: 104, height: 104 }}>
                                {displayPhoto ? (
                                    <img
                                        src={displayPhoto}
                                        alt={user.fullName || 'Profile'}
                                        style={{
                                            width: 104,
                                            height: 104,
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '3px solid #235347',
                                            boxShadow: '0 4px 12px rgba(11,43,38,0.18)'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 104,
                                        height: 104,
                                        borderRadius: '50%',
                                        background: '#8EB69B',
                                        color: '#0B2B26',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 40,
                                        fontWeight: 800,
                                        border: '3px solid #235347',
                                        boxShadow: '0 4px 12px rgba(11,43,38,0.18)'
                                    }}>
                                        {user.fullName?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Choose new profile photo"
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        background: '#235347',
                                        color: '#FFFFFF',
                                        border: '2.5px solid #FFFFFF',
                                        borderRadius: '50%',
                                        width: 34,
                                        height: 34,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: 15,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                                    }}
                                >
                                    📷
                                </button>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />

                            {!previewUrl ? (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        background: '#DAF1DE',
                                        border: '1.5px solid #8EB69B',
                                        color: '#0B2B26',
                                        padding: '7px 14px',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <span>Change Photo</span>
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        onClick={handleSavePhoto}
                                        style={{
                                            background: '#235347',
                                            border: 'none',
                                            color: '#FFFFFF',
                                            padding: '7px 14px',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: uploading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {uploading ? 'Saving...' : '✓ Save Photo'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={uploading}
                                        onClick={handleCancelPreview}
                                        style={{
                                            background: '#F1F5F9',
                                            border: '1px solid #CBD5E1',
                                            color: '#475569',
                                            padding: '7px 12px',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕ Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* User Details: Only Name, E-mail, Role */}
                        <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#235347', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                                SIGNED IN USER
                            </span>
                            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0B2B26', margin: '4px 0 16px' }}>
                                {user.fullName || user.name || sidebarRole}
                            </h3>

                            {message.text && (
                                <div style={{
                                    padding: '10px 16px',
                                    borderRadius: 8,
                                    marginBottom: 18,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                                    color: message.type === 'success' ? '#065F46' : '#991B1B',
                                    border: message.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                <div style={{ padding: 14, borderRadius: 9, background: '#DAF1DE', border: '1px solid #8EB69B' }}>
                                    <span style={{ fontSize: 11, color: '#235347', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                        Name
                                    </span>
                                    <strong style={{ fontSize: 14, color: '#0B2B26' }}>
                                        {user.fullName || user.name || '-'}
                                    </strong>
                                </div>
                                <div style={{ padding: 14, borderRadius: 9, background: '#DAF1DE', border: '1px solid #8EB69B' }}>
                                    <span style={{ fontSize: 11, color: '#235347', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                        E-mail
                                    </span>
                                    <strong style={{ fontSize: 14, color: '#0B2B26', wordBreak: 'break-all' }}>
                                        {user.email || '-'}
                                    </strong>
                                </div>
                                <div style={{ padding: 14, borderRadius: 9, background: '#DAF1DE', border: '1px solid #8EB69B' }}>
                                    <span style={{ fontSize: 11, color: '#235347', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                                        Role
                                    </span>
                                    <strong style={{ fontSize: 14, color: '#0B2B26' }}>
                                        {sidebarRole}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
