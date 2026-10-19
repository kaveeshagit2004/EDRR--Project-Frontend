import React from 'react';
import PublicPageShell from '../components/PublicPageShell';

export default function ContactPage() {
  return <PublicPageShell eyebrow="SUPPORT" title="Contact" description="Use the appropriate authority channel for questions about environmental reports and local recovery work.">
    <div className="info-card-grid three">
      <article className="info-card card-surface"><div className="info-icon">⌂</div><h3>Local Administration</h3><p>Municipal Councils, Urban Councils, Pradeshiya Sabhas and District Secretariat Offices coordinate local environmental and infrastructure response.</p></article>
      <article className="info-card card-surface"><div className="info-icon">!</div><h3>Emergency Situations</h3><p>For an immediate threat to life or safety, contact the relevant emergency authority directly rather than waiting for a web report update.</p></article>
      <article className="info-card card-surface"><div className="info-icon">?</div><h3>System Support</h3><p>Use the Feedback page to submit comments about the Protect LK web application and its reporting experience.</p></article>
    </div>
  </PublicPageShell>;
}
