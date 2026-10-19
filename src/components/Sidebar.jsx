import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import govLogo from '../assets/gov-logo.png';

export default function Sidebar({ role, links }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [open, setOpen] = useState(false);


  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const navigation = (
    <>
      <div className="side-brand">
        <img src={govLogo} alt="Sri Lanka National Emblem" />
        <div><strong>Protect LK</strong><span>Government Portal</span></div>
      </div>

      <div className="side-user-card">
        <div className="side-avatar">{user.fullName?.[0]?.toUpperCase() || 'U'}</div>
        <div><strong>{user.fullName || 'Protect LK User'}</strong><span>{role}</span></div>
      </div>

      <nav className="side-navigation">
        {links.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <button key={link.path} className={isActive ? 'side-nav-item active' : 'side-nav-item'} onClick={() => {
                navigate(link.path); setOpen(false);
              }}>
                <span>{link.label}</span>
              </button>
            );
          })}
      </nav>

      <div className="side-footer">
        <button className="side-signout" onClick={handleLogout}>Sign Out</button>
      </div>
    </>
  );

  return (
    <>
      <aside className="desktop-sidebar">{navigation}</aside>
      <div className="mobile-dashboard-bar">
        <button className="mobile-dashboard-menu" onClick={() => setOpen(true)}>☰</button>
        <div className="mobile-dashboard-brand"><img src={govLogo} alt=""/><div><strong>Protect LK</strong><span>{role}</span></div></div>
        <button className="mobile-signout" onClick={handleLogout}>Sign Out</button>
      </div>
      {open && <><div className="mobile-side-drawer">{navigation}</div><div className="sidebar-overlay" onClick={() => setOpen(false)} /></>}
    </>
  );
}
