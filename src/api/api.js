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

// ── DAMAGE REPORTS ────────────────────────────────────
export const getAllReports       = ()           => api.get('/reports');
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

// ── WATER LEVELS ──────────────────────────────────────
export const getAllWaterLevels    = ()           => api.get('/water-levels');
export const updateWaterLevel    = (id, data)   => api.put(`/water-levels/${id}`, data);
export const getCriticalWaterLevels = ()        => api.get('/water-levels/critical');

// ── USER MANAGEMENT ───────────────────────────────────
export const getOfficers   = ()     => api.get('/users/officers');
export const addOfficer    = (data) => api.post('/users/officers', data);
export const deleteOfficer = (id)   => api.delete(`/users/officers/${id}`);

export default api;