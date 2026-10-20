import React from 'react';
import Sidebar from '../components/Sidebar';
import { resolveSidebarNav, AS } from '../utils/adminNav';
import { EMERGENCY_CONTACTS } from '../utils/emergencyContacts';

export default function AdminContactPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const isSystemAdmin = user.email === 'admin@edrr.com';

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar">
                <div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                    <div style={{ marginBottom: 20 }}>
                        <h2 style={AS.title}>Contact Directory</h2>
                        <p style={AS.subtitle}>
                            {isSystemAdmin
                                ? 'Direct emergency hotlines and district authority contact channels for system administration and emergency response.'
                                : 'Direct emergency hotlines and district authority contact channels for officers in the field.'}
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 16,
                        marginBottom: 28
                    }}>
                        {EMERGENCY_CONTACTS.map(contact => (
                            <div
                                key={contact.name}
                                style={{
                                    ...AS.card,
                                    marginBottom: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0B2B26', margin: '0 0 6px', lineHeight: 1.35 }}>
                                        {contact.name}
                                    </h3>
                                    <a
                                        href={`tel:${contact.tel}`}
                                        style={{
                                            display: 'inline-block',
                                            fontSize: 20,
                                            fontWeight: 800,
                                            color: '#235347',
                                            textDecoration: 'none',
                                            letterSpacing: '0.4px',
                                            marginBottom: 10
                                        }}
                                    >
                                        {contact.phone}
                                    </a>
                                    <p style={{ fontSize: 13, color: '#235347', margin: 0, lineHeight: 1.6 }}>
                                        {contact.description}
                                    </p>
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <a
                                        href={`tel:${contact.tel}`}
                                        style={{
                                            display: 'inline-block',
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            background: '#235347',
                                            color: '#DAF1DE',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            textDecoration: 'none'
                                        }}
                                    >
                                        Call Hotline
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
