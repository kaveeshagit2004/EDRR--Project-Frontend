import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getCitizenFeedback } from '../utils/feedbackStore';
import { resolveSidebarNav, AS } from '../utils/adminNav';

const TYPE_OPTIONS = ['ALL', 'General Feedback', 'Reporting Experience', 'Flood Monitoring', 'Accessibility', 'Other'];

function formatDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return iso;
    }
}

export default function AdminCitizenFeedbackPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const [feedback, setFeedback] = useState([]);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');

    useEffect(() => {
        setFeedback(getCitizenFeedback());
    }, []);

    const filtered = useMemo(() => feedback.filter(f => {
        const matchesType = typeFilter === 'ALL' || f.type === typeFilter;
        const haystack = `${f.name || ''} ${f.email || ''} ${f.message || ''}`.toLowerCase();
        return matchesType && haystack.includes(query.toLowerCase());
    }), [feedback, typeFilter, query]);

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Citizen Feedback</h2>
                    <p style={AS.subtitle}>Feedback submitted by citizens through the public Protect LK feedback form.</p>
                </div>

                <div style={{ ...AS.card, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input
                        style={{ ...AS.input, flex: 1, minWidth: 220 }}
                        placeholder="Search by name, email or message..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <select style={{ ...AS.input, width: 200 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                        {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
                    </select>
                </div>

                {filtered.length === 0 ? (
                    <div style={{ ...AS.card, textAlign: 'center', padding: 40 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B2B26', margin: 0 }}>No citizen feedback yet</h3>
                        <p style={{ fontSize: 12, color: '#235347', marginTop: 6 }}>
                            {feedback.length === 0
                                ? 'Submissions from the public Feedback page will appear here as citizens send them.'
                                : 'No feedback matches your search or filter.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                        {filtered.map(f => (
                            <div key={f.id} style={AS.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                    <span style={AS.badge}>{f.type || 'General Feedback'}</span>
                                    <span style={{ fontSize: 11, color: '#235347' }}>{formatDate(f.submittedAt)}</span>
                                </div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0B2B26', margin: '0 0 2px' }}>{f.name || 'Anonymous'}</h3>
                                {f.email && <p style={{ fontSize: 12, color: '#235347', margin: '0 0 10px', wordBreak: 'break-all' }}>{f.email}</p>}
                                <p style={{ fontSize: 13, color: '#235347', margin: 0, lineHeight: 1.6 }}>{f.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div></div>
        </div>
    );
}
