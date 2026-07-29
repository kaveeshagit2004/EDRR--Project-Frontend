import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/api';
import govLogo from '../assets/gov-logo.png';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div style={S.topNav}>
        <Link to="/" style={S.backToPublicBtn}>
          ← Back to Public View
        </Link>
      </div>

      {/* ── HEADER BANNER ── */}
      <div style={S.banner}>
        <h1 style={S.bannerTitle}>Environmental Damage</h1>
        <h2 style={S.bannerSub}>Reporting &amp; Recovery</h2>
        <span style={S.bannerBadge}>Matara District, Sri Lanka</span>
      </div>

      {/* ── CARD ── */}
      <div style={S.card}>
        <div style={{ textAlign: 'center' }}>
          <img src={govLogo} alt="Sri Lanka National Emblem" style={S.logo} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={S.label}>Password</label>
              <Link to="/forgot-password" style={S.forgotLink}>Forgot Password?</Link>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                style={{ ...S.input, paddingRight: 42, width: '100%' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your Password"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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
    background: 'linear-gradient(135deg, #06402B 0%, #084c33 50%, #15794a 85%, #80EF80 100%)',
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
  bannerTitle: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' },
  bannerSub: { fontSize: 20, fontWeight: 400, marginTop: 4, opacity: 0.9, textShadow: '0 2px 4px rgba(0,0,0,0.5)' },
  bannerBadge: {
    display: 'inline-block',
    marginTop: 10,
    background: 'rgba(240, 248, 240, 0.85)',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    color: '#1a3c1a',
    fontSize: 12,
    padding: '4px 16px',
    borderRadius: 20,
    fontWeight: 700,
  },
  card: {
    background: 'rgba(240, 248, 240, 0.92)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(74, 222, 128, 0.35)',
    borderRadius: 16,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  cardTitle: { fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0, textAlign: 'center' },
  cardDesc: { fontSize: 13, color: '#64748b', margin: '4px 0 0', textAlign: 'center' },
  logo: {
    width: 100,
    height: 'auto',
    display: 'block',
    margin: '0 auto 16px',
  },

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
  forgotLink: {
    fontSize: 12,
    color: GREEN,
    textDecoration: 'none',
    fontWeight: 600,
    cursor: 'pointer',
  },
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
    background: 'linear-gradient(135deg, #2d5a27 0%, #1a3c1a 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'opacity 0.2s',
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

  topNav: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  backToPublicBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    color: 'white',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  footer: {
    color: 'rgba(255,255,255,0.7)',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    fontSize: 11,
    marginTop: 24,
    textAlign: 'center',
  },
};