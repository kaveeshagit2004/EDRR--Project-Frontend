import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import govLogo from '../assets/gov-logo.png';

const links = [
  { to: '/citizen', label: 'Home' },
  { to: '/citizen/reports', label: 'Situation Reports' },
  { to: '/citizen/report-damage', label: 'Report Damage' },
  { to: '/citizen/water', label: 'Flood Monitor' },
  { to: '/citizen/map', label: 'Map' },
  { to: '/citizen/alerts', label: 'Alerts' },
  { to: '/citizen/feedback', label: 'Feedback' },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.clear();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="public-navbar">
      <div className="public-navbar-inner">
        <Link to="/citizen" className="public-brand" onClick={() => setOpen(false)}>
          <img src={govLogo} alt="Sri Lanka National Emblem" />
          <div>
            <strong>Protect LK</strong>
            <span>Environmental Response System</span>
          </div>
        </Link>

        <nav className={`public-nav-links ${open ? 'open' : ''}`}>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={location.pathname === link.to ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/citizen/contact" onClick={() => setOpen(false)} className={location.pathname === '/citizen/contact' ? 'active' : ''}>Contact</Link>
        </nav>

        <div className="public-nav-actions">
          {token ? (
            <>
              <button className="nav-outline-button" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <Link className="nav-primary-button" to="/login">Officer Login</Link>
          )}
          <button className="nav-menu-button" type="button" onClick={() => setOpen(v => !v)} aria-label="Toggle navigation">☰</button>
        </div>
      </div>
    </header>
  );
}
