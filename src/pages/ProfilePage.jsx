import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageShell from '../components/PublicPageShell';

export default function ProfilePage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const staffRoles = ['GA_ADMIN', 'RDA_ADMIN', 'RURAL_OFFICER', 'IRRIGATION_OFFICER'];
  const displayRole = staffRoles.includes(user.role) ? (user.role || '').replaceAll('_', ' ') : 'GENERAL PUBLIC';
  const token = localStorage.getItem('token');
  if (!token) return <PublicPageShell eyebrow="ACCOUNT" title="Profile" description="Sign in to view your account information."><div className="empty-card card-surface"><h3>No signed-in account</h3><p>Public information remains available without signing in.</p><Link className="primary-action-button inline" to="/login">Sign In</Link></div></PublicPageShell>;
  return <PublicPageShell eyebrow="ACCOUNT" title="Profile" description="Your Protect LK account information.">
    <div className="profile-card card-surface"><div className="profile-avatar-large">{user.fullName?.[0]?.toUpperCase() || 'U'}</div><div className="profile-details"><span className="page-eyebrow">SIGNED IN USER</span><h2>{user.fullName || 'User'}</h2><div className="profile-data-grid"><div><span>Email</span><strong>{user.email || '-'}</strong></div><div><span>Role</span><strong>{displayRole}</strong></div><div><span>User ID</span><strong>{user.id || '-'}</strong></div></div></div></div>
  </PublicPageShell>;
}
