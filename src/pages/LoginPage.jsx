import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/api';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const query = new URLSearchParams(window.location.search);
  const redirectTo = query.get('redirectTo') || '';

  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await loginUser(loginData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (user.email === 'admin@edrr.com') {
        navigate(redirectTo || '/admin/officers');
      } else {
        if (user.role === 'GA_ADMIN') navigate('/admin-ga');
        else if (user.role === 'RDA_ADMIN') navigate('/admin-rda');
        else if (user.role === 'RURAL_OFFICER') navigate('/officer')
        else if (user.role === 'IRRIGATION_OFFICER') navigate('/water');
        else navigate('/citizen');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const S = styles;

  return (
    <div style={S.page}>
      {/* ── HEADER BANNER ── */}
      <div style={S.banner}>
        <h1 style={S.bannerTitle}>Environmental Damage</h1>
        <h2 style={S.bannerSub}>Reporting &amp; Recovery</h2>
        <span style={S.bannerBadge}>Matara District, Sri Lanka</span>
      </div>

      {/* ── CARD ── */}
      <div style={S.card}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={S.cardTitle}>Welcome Back</h2>
          <p style={S.cardDesc}>Sign in to continue protecting Sri Lanka</p>
        </div>

        {/* Alerts */}
        {error && <div style={S.errorBox}>⚠️ {error}</div>}
        {success && <div style={S.successBox}>✅ {success}</div>}

        {/* ── LOGIN FORM ── */}
        <form onSubmit={handleLogin} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Email Address</label>
            <input
              style={S.input}
              type="email"
              placeholder="example@gmail.com"
              value={loginData.email}
              onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              required
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input
              style={S.input}
              type="password"
              placeholder="Enter your Password"
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              required
            />
          </div>
          <button style={S.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
      <p style={S.footer}>EDRR Environmental Damage Reporting &amp; Recovery System | 2026</p>
    </div>
  );
}

const GREEN = '#2d5a27';
const GREEN_DARK = '#1a3c1a';

const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: 'inherit',
  },
  banner: {
    width: '100%',
    maxWidth: 460,
    textAlign: 'center',
    color: 'white',
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0 },
  bannerSub: { fontSize: 20, fontWeight: 400, marginTop: 4, opacity: 0.9 },
  bannerBadge: {
    display: 'inline-block',
    marginTop: 10,
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    color: '#a5d6a7',
    fontSize: 12,
    padding: '4px 16px',
    borderRadius: 20,
    fontWeight: 600,
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  cardTitle: { fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0, textAlign: 'center' },
  cardDesc: { fontSize: 13, color: '#64748b', margin: '4px 0 0', textAlign: 'center' },

  // Forms
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  label: { fontSize: 13, color: '#475569', fontWeight: 600 },
  input: {
    padding: '11px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: '#f8fafc',
    transition: 'all 0.2s',
  },
  select: {
    padding: '11px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: '#f8fafc',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: 13,
    background: GREEN,
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'background 0.2s',
  },

  // Notifications
  errorBox: {
    background: '#fef2f2',
    borderLeft: '4px solid #ef4444',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  successBox: {
    background: '#f0fdf4',
    borderLeft: '4px solid #22c55e',
    color: '#15803d',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },

  footer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 24,
    textAlign: 'center',
  },
};