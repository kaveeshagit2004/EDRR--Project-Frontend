// Lightweight, front-end-only persistence for citizen feedback submissions.
// The platform has no backend endpoint for feedback yet, so submissions from the
// public Feedback page are stored here (browser localStorage) and read by the
// GA Admin's "Citizen Feedback" page. If a backend feedback API is added later,
// swap the two functions below for real API calls without touching either page.

const STORAGE_KEY = 'protectlk_citizen_feedback';

export function getCitizenFeedback() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

export function addCitizenFeedback(entry) {
    try {
        const list = getCitizenFeedback();
        list.unshift({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            submittedAt: new Date().toISOString(),
            ...entry,
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        // Storage unavailable (e.g. private browsing) - fail silently, submission still shows as sent.
    }
}
