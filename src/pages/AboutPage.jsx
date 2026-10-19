import React from 'react';
import PublicPageShell from '../components/PublicPageShell';

export default function AboutPage() {
  return <PublicPageShell eyebrow="ABOUT PROTECT LK" title="Environmental Damage Reporting & Recovery System" description="A centralized platform for environmental damage reporting, flood monitoring and recovery tracking.">
    <div className="about-hero card-surface"><div><span className="page-eyebrow">OUR PURPOSE</span><h2>Faster reporting. Better visibility. Safer communities.</h2><p>The system brings together geo-tagged environmental damage reports, evidence, public report tracking, water-level monitoring and alerts so citizens and authorities can work from one shared source of information.</p></div><div className="about-badge">Protect LK<br/><small>2026</small></div></div>
    <div className="info-card-grid three"><article className="info-card card-surface"><div className="info-icon">1</div><h3>View Reports</h3><p>View damage information submitted by authorized rural officers, including location and available evidence.</p></article><article className="info-card card-surface"><div className="info-icon">2</div><h3>Monitor</h3><p>View real-time water levels and flood-risk indicators from monitoring data.</p></article><article className="info-card card-surface"><div className="info-icon">3</div><h3>Recover</h3><p>Track the progress of recovery work and final resolution status.</p></article></div>
  </PublicPageShell>;
}
