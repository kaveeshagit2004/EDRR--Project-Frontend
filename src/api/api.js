import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── AUTH ──────────────────────────────────────────────
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser    = (data) => api.post('/auth/login', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);

// ── DAMAGE REPORTS ────────────────────────────────────
export const getAllReports       = ()           => api.get('/reports').then(res => {
    if (res.data && Array.isArray(res.data)) {
        res.data.sort((a, b) => {
            const dateA = a.reportedAt ? new Date(a.reportedAt) : 0;
            const dateB = b.reportedAt ? new Date(b.reportedAt) : 0;
            return dateB - dateA;
        });
    }
    return res;
});
export const createReport        = (data)       => {
    if (data instanceof FormData) {
        return api.post('/reports', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return api.post('/reports', data);
};
export const updateReportStatus  = (id, s, n)   => api.put(`/reports/${id}/status`, { status: s, adminNotes: n });
export const updateReportProgress = (id, p)     => api.put(`/reports/${id}/progress`, { progress: p });
export const getReportStats      = ()           => api.get('/reports/stats');

// Recycle bin (soft delete). Only RURAL_OFFICER and GA_ADMIN may call these - the backend must enforce that too.
export const deleteReport            = (id) => api.delete(`/reports/${id}`);              // moves the report to the recycle bin
export const getDeletedReports       = ()   => api.get('/reports/recycle-bin');           // reports currently in the recycle bin
export const restoreReport           = (id) => api.put(`/reports/${id}/restore`);         // recycle bin -> back to active reports
export const permanentlyDeleteReport = (id) => api.delete(`/reports/${id}/permanent`);    // removes the report for good

// ── PUBLIC DAMAGE REPORTS (CITIZEN SUBMISSIONS) ──────
export const getAllPublicReports        = ()           => api.get('/public-reports').then(res => {
    if (res.data && Array.isArray(res.data)) {
        res.data.sort((a, b) => {
            const dateA = a.reportedAt ? new Date(a.reportedAt) : 0;
            const dateB = b.reportedAt ? new Date(b.reportedAt) : 0;
            return dateB - dateA;
        });
    }
    return res;
});
export const getPublicReportById        = (id)         => api.get(`/public-reports/${id}`);
export const createPublicReport         = (data)       => {
    if (data instanceof FormData) {
        return api.post('/public-reports', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return api.post('/public-reports', data);
};
export const updatePublicReportStatus   = (id, s, n)   => api.put(`/public-reports/${id}/status`, { status: s, adminNotes: n });
export const updatePublicReportProgress = (id, p)     => api.put(`/public-reports/${id}/progress`, { progress: p });
export const deletePublicReport         = (id, userEmail) => api.delete(`/public-reports/${id}`, { params: { userEmail } });
export const restorePublicReport        = (id)         => api.put(`/public-reports/${id}/restore`);
export const permanentlyDeletePublicReport = (id)      => api.delete(`/public-reports/${id}/permanent`);
export const getPublicReportStats       = ()           => api.get('/public-reports/stats');
export const markPublicReportViewed     = (id, viewed = true) => api.put(`/public-reports/${id}/view`, { viewed });
export const getDamageReportingStatus   = ()           => api.get('/public-reports/reporting-status');
export const setDamageReportingStatus   = (open)       => api.put('/public-reports/reporting-status', { open });

// ── WATER LEVELS ──────────────────────────────────────
export const getAllWaterLevels    = ()           => api.get('/water-levels');
export const createWaterLevel    = (data)       => api.post('/water-levels', data);
export const updateWaterLevel    = (id, data)   => api.put(`/water-levels/${id}`, data);
export const deleteWaterLevel    = (id)         => api.delete(`/water-levels/${id}`);
export const getCriticalWaterLevels = ()        => api.get('/water-levels/critical');

// ── USER MANAGEMENT & RECYCLE BIN ─────────────────────
export const getOfficers               = ()           => api.get('/users/officers');
export const getRuralDivisions         = ()           => api.get('/users/rural-divisions');
export const getWaterStations          = ()           => api.get('/users/water-stations');
export const addOfficer                = (data)       => {
    if (data instanceof FormData) {
        return api.post('/users/officers', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return api.post('/users/officers', data);
};
export const deleteOfficer             = (id, reason) => api.delete(`/users/officers/${id}`, { data: { reason }, params: { reason } });
export const getDeletedOfficers        = ()           => api.get('/users/recycle-bin');
export const restoreOfficer            = (id)         => api.put(`/users/officers/${id}/restore`);
export const permanentlyDeleteOfficer  = (id)         => api.delete(`/users/officers/${id}/permanent`);
export const updateProfilePhoto        = (data)       => {
    if (data instanceof FormData) {
        return api.post('/users/profile-photo', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return api.post('/users/profile-photo', data);
};

// ── FINAL REPORTS ─────────────────────────────────────
export const getAllFinalReports          = ()     => api.get('/final-reports');
export const getDeletedFinalReports     = ()     => api.get('/final-reports/recycle-bin');
export const getRdaFinalReportNotifications = () => api.get('/final-reports/rda-notifications');
export const uploadFinalReport           = (data) => api.post('/final-reports', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteFinalReport           = (id, reason, meta = {}) => api.delete(`/final-reports/${id}`, {
    params: { reason, ...meta }
});
export const restoreFinalReport         = (id)   => api.put(`/final-reports/${id}/restore`);
export const permanentlyDeleteFinalReport = (id) => api.delete(`/final-reports/${id}/permanent`);

// ── ALERT ANNOUNCEMENTS (GA ADMIN BROADCASTS) ─────────
export const getAllAnnouncements   = ()     => api.get('/announcements');
export const getActiveAnnouncements = ()    => api.get('/announcements/active');
export const createAnnouncement    = (data) => {
    if (data instanceof FormData) {
        return api.post('/announcements', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return api.post('/announcements', data);
};
export const deleteAnnouncement    = (id, role = 'GA_ADMIN') => api.delete(`/announcements/${id}?userRole=${encodeURIComponent(role)}`);

// ── NOTIFICATIONS (CITIZEN REPORTS & TARGETED ALERTS) ──
export const getDashboardNotifications = (params) => api.get('/notifications/dashboard', { params });
export const markNotificationRead       = (id, userId) => api.put(`/notifications/${id}/read`, null, { params: { userId } });
export const dismissNotification       = (id) => api.put(`/notifications/${id}/dismiss`);

export default api;
