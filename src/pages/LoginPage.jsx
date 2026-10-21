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
      const staffRoles = ['GA_ADMIN', 'RDA_ADMIN', 'RURAL_OFFICER', 'IRRIGATION_OFFICER'];
      const isSystemAdmin = user.email === 'admin@edrr.com';

      // Citizens/general users use the public viewer and do not need to sign in.
      if (!isSystemAdmin && !staffRoles.includes(user.role)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setError('Public users do not need to sign in. Please use the public Protect LK viewer.');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (isSystemAdmin) {
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

  return (
    <div className="auth-modern-page">
      <section className="auth-brand-panel">
        <Link to="/citizen" className="auth-back-link">← Back to Public View</Link>
        <div className="auth-brand-copy">
          <div className="auth-system-label">OFFICIAL ENVIRONMENTAL RESPONSE PLATFORM</div>
          <h1>PROTECT LK.</h1>
          <p>A unified web portal for environmental reporting, flood monitoring and recovery coordination.</p>
          <div className="auth-location-badge">Matara District, Sri Lanka</div>
        </div>
        
      </section>

      <section className="auth-form-panel">
        <div className="auth-modern-card">
          <div className="auth-card-brand">
            <img src={govLogo} alt="Sri Lanka National Emblem" />
            <div><strong>Protect LK</strong><span>Environmental Response System</span></div>
          </div>
          <div className="auth-heading-modern"><h2>Officer Login</h2><p>Authorized officers and administrators only</p></div>

          {error && <div className="form-message error">⚠ {error}</div>}
          {success && <div className="form-message success">✓ {success}</div>}

          <form onSubmit={handleLogin} className="auth-form-modern">
            <label>Email Address<div className="auth-input-wrap"><span>✉</span><input type="email" placeholder="example@gmail.com" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} required /></div></label>
            <label>
              <div className="auth-label-row"><span>Password</span><Link to="/forgot-password">Forgot Password?</Link></div>
              <div className="auth-input-wrap"><span>⌑</span><input type={showPassword ? 'text' : 'password'} placeholder="Enter your Password" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} required /><button type="button" className="password-eye" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? '●' : '○'}</button></div>
            </label>
            <button className="auth-submit-modern" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
          <p className="auth-security-note">Your login is protected by the existing Protect LK authentication service.</p>
        </div>
        <p className="auth-footer-modern">Protect LK Environmental Damage Reporting &amp; Recovery System | 2026</p>
      </section>
    </div>
  );
}
