// Who may delete damage reports (and therefore see the delete button).
// Only Rural Division Officers and GA Admins. Every other account - RDA admins,
// irrigation officers, the system administrator, citizens/public viewers - never gets it.
// This only controls what the UI shows; the backend must enforce the same rule.

const SYSTEM_ADMIN_EMAIL = 'admin@edrr.com';

export function canDeleteReports(user = {}) {
    if (!user || user.email === SYSTEM_ADMIN_EMAIL) return false;
    return user.role === 'RURAL_OFFICER' || user.role === 'GA_ADMIN';
}

// Who may delete public damage reports:
// ONLY Rural Division Officers (RURAL_OFFICER), AND ONLY AFTER the report has been viewed/marked by RDA/DMC.
// RDA Officers, GA Admins, Irrigation Officers, the system administrator (admin@edrr.com),
// and citizens do NOT have delete access.
export function canDeletePublicReports(user = {}, report = null) {
    if (!user || user.email === SYSTEM_ADMIN_EMAIL) return false;
    if (user.role !== 'RURAL_OFFICER') return false;
    if (!report) return true; // General role capability check
    // Per-report permission: report must be viewed and marked by RDA/DMC officer first
    return Boolean(report.viewedByRda || report.status === 'VIEWED_BY_RDA' || report.status === 'VIEWED');
}

