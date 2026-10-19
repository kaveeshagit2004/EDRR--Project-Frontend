import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { resolveSidebarNav, AS } from '../utils/adminNav';

export default function AdminFeedbackPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const isSystemAdmin = user.email === 'admin@edrr.com';
    const [sent, setSent] = useState(false);
    const [form, setForm] = useState({
        name: user.fullName || '',
        email: user.email || '',
        type: isSystemAdmin ? 'Registry / Officer Accounts' : 'Reporting Experience',
        message: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSent(true);
        setForm(prev => ({ ...prev, message: '' }));
    };

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Feedback</h2>
                    <p style={AS.subtitle}>{isSystemAdmin ? 'Report issues or suggest improvements for the User Admin console and user controller.' : 'Report issues or suggest improvements for the officer reporting tools.'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16 }}>
                    <div style={AS.card}>
                        {sent && <div style={AS.successBox}>Thank you. Your feedback has been recorded.</div>}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={AS.label}>Name</label>
                                <input style={{ ...AS.input, marginTop: 4 }} name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
                            </div>
                            <div>
                                <label style={AS.label}>Email</label>
                                <input style={{ ...AS.input, marginTop: 4 }} type="email" name="email" value={form.email} onChange={handleChange} placeholder="Your email" />
                            </div>
                            <div>
                                <label style={AS.label}>Feedback Type</label>
                                <select style={{ ...AS.input, marginTop: 4, cursor: 'pointer' }} name="type" value={form.type} onChange={handleChange}>
                                    {isSystemAdmin && <option>Registry / Officer Accounts</option>}
                                    <option>Map &amp; Alerts</option>
                                    <option>Reporting Experience</option>
                                    <option>Accessibility</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={AS.label}>Message</label>
                                <textarea style={{ ...AS.input, marginTop: 4, height: 120, resize: 'vertical' }} name="message" rows="6" required value={form.message} onChange={handleChange} placeholder="Describe the issue or suggestion..." />
                            </div>
                            <button type="submit" style={{ ...AS.btnPrimary, alignSelf: 'flex-start' }}>Submit Feedback</button>
                        </form>
                    </div>

                    <aside style={AS.card}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#235347', letterSpacing: 0.4 }}>WHY FEEDBACK MATTERS</span>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B2B26', margin: '6px 0 8px' }}>Help improve the platform</h3>
                        <p style={{ fontSize: 13, color: '#235347', margin: 0, lineHeight: 1.6 }}>
                            {isSystemAdmin
                                ? 'Your feedback as the system administrator helps identify usability issues and missing information in the user controller and administration tools.'
                                : 'Your feedback as a field officer helps identify usability issues and missing information in the reporting tools.'}
                        </p>
                    </aside>
                </div>
            </div></div>
        </div>
    );
}
