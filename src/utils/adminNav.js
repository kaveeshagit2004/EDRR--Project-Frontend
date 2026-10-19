// Sidebar navigation + role label shared across roles that reuse the same set of
// Map / Alert / Contact / Feedback / Profile pages. Keeping this in one place ensures
// the sidebar is identical everywhere those pages are used.

export const NAV_USER_ADMIN = [
    { path: '/admin/officers', icon: '', label: 'Overview' },
    { path: '/admin/officers/map', icon: '', label: 'Map' },
    { path: '/admin/officers/alerts', icon: '', label: 'Alert' },
    { path: '/admin/officers/contact', icon: '', label: 'Contact' },
    { path: '/admin/officers/report-damage', icon: '', label: 'Report Damage' },
    { path: '/admin/officers/public-reports', icon: '', label: 'Public Reports' },
    { path: '/admin/officers/profile', icon: '', label: 'Profile' },
];

export const USER_ADMIN_ROLE_LABEL = 'System Administrator';

export const NAV_RURAL_OFFICER = [
    { path: '/officer', icon: '', label: 'Overview' },
    { path: '/officer/map', icon: '', label: 'Map' },
    { path: '/officer/alerts', icon: '', label: 'Alert' },
    { path: '/officer/contact', icon: '', label: 'Contact' },
    { path: '/officer/report-damage', icon: '', label: 'Report Damage' },
    { path: '/officer/public-reports', icon: '', label: 'Public Reports' },
    { path: '/officer/profile', icon: '', label: 'Profile' },
];

export const RURAL_OFFICER_ROLE_LABEL = 'Rural Division Officer';

export const NAV_GA_ADMIN = [
    { path: '/admin-ga', icon: '', label: 'Overview' },
    { path: '/admin-ga/map', icon: '', label: 'Map' },
    { path: '/admin-ga/alerts', icon: '', label: 'Alert' },
    { path: '/admin-ga/public-reports', icon: '', label: 'Public Reports' },
    { path: '/admin-ga/final', icon: '', label: 'Final Report' },
    { path: '/admin-ga/feedback', icon: '', label: 'Citizen Feedback' },
    { path: '/admin-ga/profile', icon: '', label: 'Profile' },
];

export const GA_ADMIN_ROLE_LABEL = 'GA Admin';

export const NAV_RDA_ADMIN = [
    { path: '/admin-rda', icon: '', label: 'Overview' },
    { path: '/admin-rda/alerts', icon: '', label: 'Alert' },
    { path: '/admin-rda/recovery', icon: '', label: 'Recovery Progress' },
    { path: '/admin-rda/public-reports', icon: '', label: 'Public Reports' },
    { path: '/admin-rda/final', icon: '', label: 'Final Report' },
    { path: '/admin-rda/profile', icon: '', label: 'Profile' },
];

export const RDA_ADMIN_ROLE_LABEL = 'RDA Admin';

// Irrigation officer sidebar: Overview + Water Level Monitor stay on the dedicated
// WaterLevelPage (built separately); Map/Alert/Profile reuse the same shared pages
// the other staff roles use above, per the Environmental Damage Reporting and Flood
// Monitoring proposal (Flood Monitoring & Early Warning, Map Visualization, and
// Alert Notification modules).
export const NAV_IRRIGATION_OFFICER = [
    { path: '/water', icon: '', label: 'Water Station' },
    { path: '/water/map', icon: '', label: 'Map' },
    { path: '/water/alerts', icon: '', label: 'Alerts' },
    { path: '/water/public-reports', icon: '', label: 'Public Reports' },
    { path: '/water/profile', icon: '', label: 'Profile' },
];

export const IRRIGATION_OFFICER_ROLE_LABEL = 'Irrigation Officer';

// Resolves which sidebar (role label + links) a shared page should render, based on
// the signed-in user. Add a new branch here whenever another role starts reusing
// these pages instead of duplicating them.
export function resolveSidebarNav(user = {}) {
    if (user.email === 'admin@edrr.com') {
        return { role: USER_ADMIN_ROLE_LABEL, links: NAV_USER_ADMIN };
    }
    if (user.role === 'RURAL_OFFICER') {
        return { role: RURAL_OFFICER_ROLE_LABEL, links: NAV_RURAL_OFFICER };
    }
    if (user.role === 'GA_ADMIN') {
        return { role: GA_ADMIN_ROLE_LABEL, links: NAV_GA_ADMIN };
    }
    if (user.role === 'RDA_ADMIN') {
        return { role: RDA_ADMIN_ROLE_LABEL, links: NAV_RDA_ADMIN };
    }
    if (user.role === 'IRRIGATION_OFFICER') {
        return { role: IRRIGATION_OFFICER_ROLE_LABEL, links: NAV_IRRIGATION_OFFICER };
    }
    return { role: USER_ADMIN_ROLE_LABEL, links: NAV_USER_ADMIN };
}

// Shared style tokens, copied from OfficerManagementPage/OfficerDashboard so every
// User Admin page shares identical fonts, sizes and colors.
export const AS = {
    title: { fontSize: 24, fontWeight: 800, margin: 0, color: '#0B2B26', textShadow: 'none' },
    subtitle: { fontSize: 13, color: '#235347', marginTop: 2 },
    card: { background: '#DAF1DE', borderRadius: 12, padding: 18, marginBottom: 14, border: '1px solid #8EB69B', boxShadow: '0 2px 10px rgba(11,43,38,0.10)', color: '#0B2B26' },
    cardTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#0B2B26', borderBottom: '1px solid #8EB69B', paddingBottom: 10 },
    label: { fontSize: 12, fontWeight: 600, color: '#235347' },
    input: { width: '100%', padding: '9px 12px', border: '1.5px solid #8EB69B', borderRadius: 8, fontSize: 13, outline: 'none', background: '#DAF1DE', color: '#0B2B26', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' },
    btnPrimary: { padding: '10px 20px', background: '#235347', color: '#DAF1DE', border: '1px solid #235347', borderRadius: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 8px 24px rgba(11,43,38,0.16)', transition: 'all 0.3s ease' },
    chip: { padding: '7px 14px', border: '1px solid #8EB69B', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#DAF1DE', color: '#235347', transition: 'all 0.2s' },
    chipActive: { padding: '7px 14px', border: '1px solid #235347', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#235347', color: '#DAF1DE', transition: 'all 0.2s' },
    badge: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '3px 8px', borderRadius: 12, display: 'inline-block' },
    successBox: { background: '#DAF1DE', borderLeft: '4px solid #235347', color: '#0B2B26', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 },
    errorBox: { background: '#DAF1DE', borderLeft: '4px solid #0B2B26', color: '#0B2B26', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 },
    emptyState: { padding: 40, textAlign: 'center', color: '#235347', fontSize: 13 },
};
