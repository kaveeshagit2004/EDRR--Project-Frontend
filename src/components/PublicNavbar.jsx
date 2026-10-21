import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import govLogo from '../assets/gov-logo.png';
import { getDamageReportingStatus } from '../api/api';

const baseLinks = [
  { to: '/citizen', label: 'Home' },
  { to: '/citizen/reports', label: 'Situation Reports' },
  { to: '/citizen/report-damage', label: 'Citizen Reports', requiresOpen: true },
  { to: '/citizen/water', label: 'Flood Monitor' },
  { to: '/citizen/map', label: 'Map' },
  { to: '/citizen/alerts', label: 'Alerts' },
  { to: '/citizen/feedback', label: 'Feedback' },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [reportingOpen, setReportingOpen] = useState(() => {
    return localStorage.getItem('edrr_damage_reporting_open') === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    let mounted = true;
    const checkStatus = () => {
      getDamageReportingStatus()
        .then(res => {
          if (mounted && res.data) {
            const isOpen = Boolean(res.data.open);
            setReportingOpen(isOpen);
            localStorage.setItem('edrr_damage_reporting_open', isOpen);
          }
        })
        .catch(() => {});
    };

    checkStatus();
    const interval = setInterval(checkStatus, 8000);
    const onFocus = () => checkStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const activeLinks = baseLinks.filter(l => !l.requiresOpen || reportingOpen);

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
          {activeLinks.map(link => (
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
