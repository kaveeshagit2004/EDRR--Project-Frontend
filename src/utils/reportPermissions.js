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
// Only Rural Division Officers, GA Admins, RDA Admins, and Irrigation Officers.
// The system administrator (admin@edrr.com) and citizens do not have delete access.
export function canDeletePublicReports(user = {}) {
    if (!user || user.email === SYSTEM_ADMIN_EMAIL) return false;
    return (
        user.role === 'RURAL_OFFICER' ||
        user.role === 'GA_ADMIN' ||
        user.role === 'RDA_ADMIN' ||
        user.role === 'IRRIGATION_OFFICER'
    );
}

