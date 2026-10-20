import React from 'react';
import PublicPageShell from '../components/PublicPageShell';
import { EMERGENCY_CONTACTS } from '../utils/emergencyContacts';

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow="EMERGENCY & AUTHORITY DIRECTORY"
      title="Contact"
      description="Direct contact hotlines and emergency authorities for rapid disaster response, medical care, and public safety in Matara district."
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {EMERGENCY_CONTACTS.map((contact) => (
          <article
            key={contact.name}
            style={{
              background: '#ffffff',
              border: '1.5px solid #235347',
              borderRadius: 12,
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(11,43,38,0.08)'
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
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(35,83,71,0.18)'
                }}
              >
                Call Hotline
              </a>
            </div>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
