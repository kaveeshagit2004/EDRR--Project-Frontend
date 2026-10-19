import React from 'react';
import Sidebar from '../components/Sidebar';
import { resolveSidebarNav, AS } from '../utils/adminNav';

export default function AdminProfilePage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Profile</h2>
                    <p style={AS.subtitle}>Your Protect LK account information.</p>
                </div>

                <div style={{ ...AS.card, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start', padding: 28 }}>
                    {user.profilePhotoUrl ? (
                        <img
                            src={user.profilePhotoUrl}
                            alt={user.fullName || 'Profile'}
                            style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '1px solid #8EB69B' }}
                        />
                    ) : (
                        <div style={{
                            width: 76, height: 76, borderRadius: '50%', background: '#8EB69B', color: '#0B2B26',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800
                        }}>
                            {user.fullName?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                    <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#235347', letterSpacing: 0.4 }}>SIGNED IN USER</span>
                        <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0B2B26', margin: '4px 0 16px' }}>{user.fullName || sidebarRole}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                            <div style={{ padding: 12, borderRadius: 9, background: '#DAF1DE', border: '1px solid #8EB69B' }}>
                                <span style={{ fontSize: 11, color: '#235347', display: 'block' }}>Email</span>
                                <strong style={{ fontSize: 13, color: '#0B2B26', wordBreak: 'break-all' }}>{user.email || '-'}</strong>
                            </div>
                            <div style={{ padding: 12, borderRadius: 9, background: '#DAF1DE', border: '1px solid #8EB69B' }}>
                                <span style={{ fontSize: 11, color: '#235347', display: 'block' }}>Role</span>
                                <strong style={{ fontSize: 13, color: '#0B2B26' }}>{sidebarRole}</strong>
                            </div>
                            <div style={{ padding: 12, borderRadius: 9, background: '#DAF1DE', border: '1px solid #8EB69B' }}>
                                <span style={{ fontSize: 11, color: '#235347', display: 'block' }}>User ID</span>
                                <strong style={{ fontSize: 13, color: '#0B2B26' }}>{user.id || '-'}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div></div>
        </div>
    );
}

