import React from 'react';
import Sidebar from '../components/Sidebar';
import { resolveSidebarNav, AS } from '../utils/adminNav';

const CHANNELS_ADMIN = [
    {
        icon: '⌂',
        title: 'Local Administration',
        text: 'Municipal Councils, Urban Councils, Pradeshiya Sabhas and District Secretariat Offices coordinate local environmental and infrastructure response for officers under your registry.'
    },
    {
        icon: '!',
        title: 'Emergency Escalation',
        text: 'For an immediate threat to life or safety reported by an officer, escalate directly to the relevant emergency authority rather than waiting for a status update in this system.'
    },
    {
        icon: '?',
        title: 'Platform / Technical Support',
        text: 'Use the Feedback page to log issues with officer accounts, the registry, or the Protect LK administration console.'
    },
    {
        icon: '☎',
        title: 'GA / RDA Administrators',
        text: 'Coordinate directly with Government Agent (GA) and RDA/DMC administrators for questions about report progress and recovery approvals.'
    },
];

const CHANNELS_OFFICER = [
    {
        icon: '⌂',
        title: 'Local Administration',
        text: 'Municipal Councils, Urban Councils, Pradeshiya Sabhas and District Secretariat Offices coordinate local environmental and infrastructure response in your division.'
    },
    {
        icon: '!',
        title: 'Emergency Situations',
        text: 'For an immediate threat to life or safety, contact the relevant emergency authority directly rather than waiting for a report status update.'
    },
    {
        icon: '?',
        title: 'Platform / Technical Support',
        text: 'Use the Feedback page to log issues with your officer account or the Protect LK reporting tools.'
    },
    {
        icon: '☎',
        title: 'GA / RDA Administrators',
        text: 'Coordinate directly with your Government Agent (GA) and RDA/DMC administrators for questions about report progress and recovery approvals.'
    },
];

export default function AdminContactPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const isSystemAdmin = user.email === 'admin@edrr.com';
    const channels = isSystemAdmin ? CHANNELS_ADMIN : CHANNELS_OFFICER;

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Contact</h2>
                    <p style={AS.subtitle}>{isSystemAdmin ? 'Support and escalation channels for the user controller and administration console.' : 'Support and escalation channels for officers in the field.'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                    {channels.map(c => (
                        <div key={c.title} style={AS.card}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#8EB69B', color: '#0B2B26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{c.icon}</div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B2B26', margin: '0 0 8px' }}>{c.title}</h3>
                            <p style={{ fontSize: 13, color: '#235347', margin: 0, lineHeight: 1.6 }}>{c.text}</p>
                        </div>
                    ))}
                </div>
            </div></div>
        </div>
    );
}
