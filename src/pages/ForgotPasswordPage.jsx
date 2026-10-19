import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/api';
import govLogo from '../assets/gov-logo.png';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '', nic: '', newPassword: '', confirmPassword: ''
  });

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await forgotPassword({
        email: formData.email,
        nic: formData.nic,
        newPassword: formData.newPassword
      });
      setSuccess(res.data.message || 'Password reset successfully!');
      setFormData({ email: '', nic: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modern-page">
      <section className="auth-brand-panel">
        <Link to="/citizen" className="auth-back-link">← Back to Public View</Link>
        <div className="auth-brand-copy"><div className="auth-system-label">ACCOUNT RECOVERY</div><h1>Environmental Damage<br/><span>Reporting &amp; Recovery</span></h1><p>Recover access to your Protect LK account using the credentials already supported by the system.</p><div className="auth-location-badge">Matara District, Sri Lanka</div></div>
        
      </section>

      <section className="auth-form-panel">
        <div className="auth-modern-card reset-card">
          <div className="auth-card-brand"><img src={govLogo} alt="Sri Lanka National Emblem" /><div><strong>Protect LK</strong><span>Environmental Response System</span></div></div>
          <div className="auth-heading-modern"><h2>Reset Password</h2><p>Enter your credentials to recover your account</p></div>

          {error && <div className="form-message error">⚠ {error}</div>}
          {success && <div className="form-message success">✓ {success}</div>}

          <form onSubmit={handleReset} className="auth-form-modern">
            <label>Email Address<div className="auth-input-wrap"><span>✉</span><input type="email" placeholder="example@gmail.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div></label>
            <label>NIC Number<div className="auth-input-wrap"><span>⌁</span><input type="text" placeholder="Enter your NIC (e.g. 199912345678 or 991234567V)" value={formData.nic} onChange={e => setFormData({ ...formData, nic: e.target.value })} required /></div></label>
            <label>New Password<div className="auth-input-wrap"><span>⌑</span><input type={showNewPassword ? 'text' : 'password'} placeholder="Enter new password" value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} required /><button type="button" className="password-eye" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? '●' : '○'}</button></div></label>
            <label>Confirm New Password<div className="auth-input-wrap"><span>⌑</span><input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required /><button type="button" className="password-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? '●' : '○'}</button></div></label>
            <button className="auth-submit-modern" type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
          <div className="auth-back-login"><Link to="/login">← Back to Login</Link></div>
        </div>
        <p className="auth-footer-modern">Protect LK Environmental Damage Reporting &amp; Recovery System | 2026</p>
      </section>
    </div>
  );
}
