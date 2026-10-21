import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import PublicPageShell from '../components/PublicPageShell';
import { updateProfilePhoto } from '../api/api';

export default function ProfilePage() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const staffRoles = ['GA_ADMIN', 'RDA_ADMIN', 'RURAL_OFFICER', 'IRRIGATION_OFFICER'];
  const displayRole = staffRoles.includes(user.role) ? (user.role || '').replaceAll('_', ' ') : 'GENERAL PUBLIC';
  const token = localStorage.getItem('token');

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file.' });
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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      if (user.id || user._id) formData.append('userId', user.id || user._id);
      if (user.email) formData.append('email', user.email);

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
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to update photo.'
      });
    } finally {
      setUploading(false);
    }
  };

  if (!token) {
    return (
      <PublicPageShell eyebrow="ACCOUNT" title="Profile" description="Sign in to view your account information.">
        <div className="empty-card card-surface">
          <h3>No signed-in account</h3>
          <p>Public information remains available without signing in.</p>
          <Link className="primary-action-button inline" to="/login">Sign In</Link>
        </div>
      </PublicPageShell>
    );
  }

  const displayPhoto = previewUrl || user.profilePhotoUrl;

  return (
    <PublicPageShell eyebrow="ACCOUNT" title="Profile" description="Your Protect LK account information.">
      <div className="profile-card card-surface" style={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={user.fullName || 'User'}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #235347'
                }}
              />
            ) : (
              <div className="profile-avatar-large" style={{ width: 96, height: 96, fontSize: 36 }}>
                {user.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

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
                  border: '1px solid #8EB69B',
                  color: '#0B2B26',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Change Photo
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleSavePhoto}
                  style={{
                    background: '#235347',
                    border: 'none',
                    color: '#FFF',
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: uploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleCancelPreview}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    padding: '5px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="profile-details" style={{ flex: 1 }}>
            <span className="page-eyebrow">SIGNED IN USER</span>
            <h2 style={{ margin: '4px 0 14px' }}>{user.fullName || user.name || 'User'}</h2>

            {message.text && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 14,
                fontSize: 12,
                fontWeight: 600,
                background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: message.type === 'success' ? '#065F46' : '#991B1B',
                border: message.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA'
              }}>
                {message.type === 'success' ? '✓ ' : '⚠️ '}{message.text}
              </div>
            )}

            <div className="profile-data-grid">
              <div>
                <span>Name</span>
                <strong>{user.fullName || user.name || '-'}</strong>
              </div>
              <div>
                <span>E-mail</span>
                <strong style={{ wordBreak: 'break-all' }}>{user.email || '-'}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{displayRole}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
}
