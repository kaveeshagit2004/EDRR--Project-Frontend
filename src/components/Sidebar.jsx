import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ role, links }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [open, setOpen] = useState(false);

    const handleManageOfficers = () => {
        navigate('/login?redirectTo=/admin/officers');
        setOpen(false);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const GREEN = '#2d5a27';
    const GREEN_DARK = '#1a3c1a';

    return (
        <>
            {/* Mobile top bar */}
            <div style={{ display: 'flex', alignItems: 'center', background: GREEN_DARK, padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
                <button onClick={() => setOpen(!open)}
                        style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, marginRight: 12 }}>
                    ☰
                </button>
                {/* <span style={{ color: 'white', fontWeight: 700, fontSize: 16, flex: 1 }}>🌿 EDRR</span>
                <button onClick={handleLogout}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 12 }}>
                    Logout
                </button>
                */}

                <span style={{ color: 'white', fontWeight: 700, fontSize: 16, flex: 1 }}>🌿 EDRR</span>
                <button
                   style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 12 }}
                   onClick={handleManageOfficers}>
                  Manage Officers
                </button>
            </div>

            {/* Sidebar drawer */}
            {open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: 260, height: '100vh', background: GREEN_DARK, zIndex: 200, display: 'flex', flexDirection: 'column', padding: '20px 0', boxShadow: '4px 0 20px rgba(0,0,0,0.3)' }}>
                    {/* Header */}
                    <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>🌿 EDRR</span>
                            <button onClick={() => setOpen(false)}
                                    style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>
                        {/* User avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700 }}>
                                {user.fullName?.[0] || 'U'}
                            </div>
                            <div>
                                <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{user.fullName}</div>
                                <div style={{ color: '#86efac', fontSize: 11 }}>{role}</div>
                            </div>
                        </div>
                    </div>

                    {/* Nav links */}
                    <nav style={{ flex: 1, padding: '16px 0' }}>
                        {links
                            .filter(link => link.path !== '/admin/officers' || user.email === 'admin@edrr.com')
                            .map(link => {
                                const isActive = location.pathname === link.path;
                                const isManageOfficers = link.path === '/admin/officers';
                                return (
                                    <button key={link.path}
                                            onClick={() => {
                                                if (isManageOfficers) {
                                                    handleManageOfficers();
                                                    return;
                                                }

                                                navigate(link.path);
                                                setOpen(false);
                                            }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: isActive ? 'rgba(255,255,255,0.15)' : 'none', border: 'none', color: isActive ? 'white' : 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'left', borderLeft: isActive ? '3px solid #4ade80' : '3px solid transparent' }}>
                                        <span style={{ fontSize: 18 }}>{link.icon}</span>
                                        {link.label}
                                    </button>
                                );
                        })}
                    </nav>

                    {/* Logout */}
                    <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <button onClick={handleLogout}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', color: '#fca5a5', fontSize: 14 }}>
                            <span style={{ fontSize: 18 }}>🚪</span> Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Overlay */}
            {open && <div onClick={() => setOpen(false)}
                          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} />}
        </>
    );
}