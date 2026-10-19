// Lightweight, front-end-only persistence for uploaded Final Report documents.
// The platform has no backend endpoint for final-report file uploads yet, so files
// attached from the RDA Admin's "Final Report" page are stored here (browser
// localStorage, one entry per damage report) and read by the Final Report page for
// every role that can view it. If a backend upload API is added later, swap the
// functions below for real API calls without touching the page itself.

const STORAGE_KEY = 'protectlk_final_reports';

export function getFinalReports() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const map = raw ? JSON.parse(raw) : {};
        return map && typeof map === 'object' ? map : {};
    } catch {
        return {};
    }
}

export function getFinalReportFor(reportId) {
    const map = getFinalReports();
    return map[reportId] || null;
}

export function saveFinalReport(reportId, entry) {
    try {
        const map = getFinalReports();
        map[reportId] = {
            uploadedAt: new Date().toISOString(),
            ...entry,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        return map[reportId];
    } catch {
        // Storage unavailable (e.g. private browsing, or file too large) - caller shows an error.
        return null;
    }
}

export function removeFinalReport(reportId) {
    try {
        const map = getFinalReports();
        delete map[reportId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // ignore
    }
}
