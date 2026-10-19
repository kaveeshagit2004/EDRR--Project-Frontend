import React, { useState } from 'react';
import PublicPageShell from '../components/PublicPageShell';
import { addCitizenFeedback } from '../utils/feedbackStore';

export default function FeedbackPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', type: 'General Feedback', message: '' });
  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = e => {
    e.preventDefault();
    addCitizenFeedback(form);
    setSent(true);
    setForm({ name: '', email: '', type: 'General Feedback', message: '' });
  };
  return <PublicPageShell eyebrow="COMMUNITY FEEDBACK" title="Feedback" description="Share feedback about the environmental reporting and recovery platform.">
    <div className="feedback-layout"><form className="feedback-form card-surface" onSubmit={handleSubmit}>
      {sent && <div className="form-message success">✓ Thank you. Your feedback has been recorded in this interface.</div>}
      <label>Name<input name="name" value={form.name} onChange={handleChange} placeholder="Your name" /></label><label>Email<input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Your email" /></label><label>Feedback Type<select name="type" value={form.type} onChange={handleChange}><option>General Feedback</option><option>Reporting Experience</option><option>Flood Monitoring</option><option>Accessibility</option><option>Other</option></select></label><label>Message<textarea name="message" rows="6" required value={form.message} onChange={handleChange} placeholder="Tell us about your experience..." /></label><button className="primary-action-button" type="submit">Submit Feedback</button>
    </form><aside className="feedback-note card-surface"><span className="page-eyebrow">WHY FEEDBACK MATTERS</span><h2>Help improve the service</h2><p>Protect LK is intended to improve transparency, public participation and communication between citizens and authorities. Feedback can help identify usability issues and missing information.</p></aside></div>
  </PublicPageShell>;
}

