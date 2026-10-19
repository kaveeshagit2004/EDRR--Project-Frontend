import React, { useEffect, useState } from 'react';
import { getActiveAnnouncements } from '../api/api';

function formatTimestamp(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return iso;
    }
}

export default function AlertAnnouncementBanner({ refreshTrigger, hideForGA = false }) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isGaPortal = hideForGA || user.role === 'GA_ADMIN' || window.location.pathname.startsWith('/admin-ga') || user.email === 'ga@edrr.com';

    const [announcements, setAnnouncements] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [collapsed, setCollapsed] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const loadAnnouncements = () => {
        getActiveAnnouncements()
            .then(res => {
                const list = Array.isArray(res.data) && res.data.length > 0
                    ? res.data
                    : JSON.parse(localStorage.getItem('ga_announcements_cache') || '[]');
                setAnnouncements(list);
                if (Array.isArray(res.data) && res.data.length > 0) {
                    localStorage.setItem('ga_announcements_cache', JSON.stringify(res.data));
                }

                // If browser notifications are supported, notify for the latest critical/warning announcement
                if (list.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
                    const latest = list[0];
                    const lastSeenId = localStorage.getItem('last_seen_announcement_id');
                    if (lastSeenId !== latest.id) {
                        try {
                            new Notification(`EDRR Alert: ${latest.title}`, {
                                body: latest.message,
                                icon: '/favicon.ico'
                            });
                            localStorage.setItem('last_seen_announcement_id', latest.id);
                        } catch (err) {
                            // Ignored if browser restricts notifications
                        }
                    }
                }
            })
            .catch(() => {
                const cached = JSON.parse(localStorage.getItem('ga_announcements_cache') || '[]');
                setAnnouncements(cached);
            });
    };

    useEffect(() => {
        loadAnnouncements();
        const interval = setInterval(loadAnnouncements, 20000); // 20s polling
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    // Request notification permission once on initial user interaction if supported
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }, []);

    // Do NOT display as a banner message in GA Admin Portal (only viewed in "Sent Announcements" card)
    if (isGaPortal) {
        return null;
    }

    if (!announcements || announcements.length === 0) {
        return null;
    }

    const total = announcements.length;
    const activeIndex = Math.min(Math.max(0, currentIndex), total - 1);
    const current = announcements[activeIndex] || announcements[0];

    const isCritical = current.alertLevel === 'CRITICAL';
    const isWarning = current.alertLevel === 'WARNING';

    const borderColor = isCritical ? '#c62828' : isWarning ? '#e65100' : '#235347';
    const bannerBg = isCritical ? '#ffebee' : isWarning ? '#fff3e0' : '#DAF1DE';
    const textColor = isCritical ? '#b71c1c' : isWarning ? '#bf360c' : '#0B2B26';
    const badgeBg = isCritical ? '#c62828' : isWarning ? '#e65100' : '#235347';

    const handlePrev = (e) => {
        if (e) e.stopPropagation();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : total - 1));
    };

    const handleNext = (e) => {
        if (e) e.stopPropagation();
        setCurrentIndex(prev => (prev < total - 1 ? prev + 1 : 0));
    };

    return (
        <div style={{
            background: bannerBg,
            border: `2px solid ${borderColor}`,
            borderLeft: `8px solid ${borderColor}`,
            borderRadius: 12,
            padding: collapsed ? '10px 16px' : '16px 20px',
            marginBottom: 20,
            boxShadow: '0 4px 18px rgba(11,43,38,0.12)',
            transition: 'all 0.25s ease',
            color: '#0B2B26',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                        background: badgeBg,
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 0.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span>{isCritical ? '🚨' : '📢'}</span>
                        <span>OFFICIAL GA ALERT ANNOUNCEMENT</span>
                    </span>

                    <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: isCritical ? '#ffcdd2' : isWarning ? '#ffe0b2' : '#8EB69B',
                        color: isCritical ? '#b71c1c' : isWarning ? '#e65100' : '#0B2B26'
                    }}>
                        {current.alertLevel || 'WARNING'}
                    </span>

                    <span style={{ fontSize: 11, color: '#235347', fontWeight: 600 }}>
                        {current.targetAudience === 'ALL' ? 'Broadcast to All Users & Citizens' : `Target: ${current.targetAudience}`}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Arrow Navigation in Header when 2 or more announcements exist */}
                    {total > 1 && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: isCritical ? '#ffcdd2' : isWarning ? '#ffe0b2' : '#8EB69B',
                            padding: '2px 8px',
                            borderRadius: 20,
                            border: `1px solid ${borderColor}60`
                        }}>
                            <button
                                type="button"
                                onClick={handlePrev}
                                title="See previous announcement"
                                aria-label="Previous announcement"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: textColor,
                                    fontSize: 13,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1
                                }}
                            >
                                ◀
                            </button>
                            <span style={{ fontSize: 11, fontWeight: 700, color: textColor, padding: '0 4px', userSelect: 'none' }}>
                                {activeIndex + 1} of {total}
                            </span>
                            <button
                                type="button"
                                onClick={handleNext}
                                title="See next announcement"
                                aria-label="Next announcement"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: textColor,
                                    fontSize: 13,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1
                                }}
                            >
                                ▶
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            background: 'transparent',
                            border: `1px solid ${borderColor}`,
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: textColor,
                            cursor: 'pointer'
                        }}
                    >
                        {collapsed ? '▼ Expand Message' : '▲ Minimize'}
                    </button>
                </div>
            </div>

            {/* Announcement Title & Subtitle */}
            <div style={{ marginTop: 8 }}>
                <h3 style={{
                    margin: '4px 0 2px',
                    fontSize: 17,
                    fontWeight: 800,
                    color: textColor,
                    lineHeight: 1.3
                }}>
                    {current.title}
                </h3>
                <div style={{ fontSize: 12, color: '#235347', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>
                        Issued by <strong>{current.senderName || 'Government Agent (GA) Admin'}</strong> &middot; {formatTimestamp(current.createdAt)}
                    </span>
                    {total > 1 && (
                        <span style={{
                            background: `${borderColor}18`,
                            color: textColor,
                            padding: '1px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700
                        }}>
                            Announcement {activeIndex + 1} of {total}
                        </span>
                    )}
                </div>
            </div>

            {/* Message Body & Optional Image */}
            {!collapsed && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${borderColor}40`, paddingTop: 10 }}>
                    <p style={{
                        margin: '0 0 12px',
                        fontSize: 14,
                        lineHeight: 1.55,
                        color: '#0B2B26',
                        whiteSpace: 'pre-line'
                    }}>
                        {current.message}
                    </p>

                    {current.imageUrl && (
                        <div style={{ marginTop: 10, marginBottom: 8 }}>
                            <div
                                onClick={() => setSelectedPhoto(current.imageUrl)}
                                style={{
                                    display: 'inline-block',
                                    cursor: 'pointer',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    border: `1px solid ${borderColor}`,
                                    position: 'relative',
                                    maxWidth: 320,
                                    maxHeight: 200
                                }}
                            >
                                <img
                                    src={current.imageUrl}
                                    alt={current.title}
                                    style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 200, objectFit: 'cover' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(11,43,38,0.75)',
                                    color: '#DAF1DE',
                                    fontSize: 11,
                                    padding: '4px 8px',
                                    textAlign: 'center',
                                    fontWeight: 600
                                }}>
                                    🔍 Click to view full image
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Carousel Arrows & Dots when 2 or more announcements exist */}
                    {total > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 14,
                            paddingTop: 10,
                            borderTop: `1px solid ${borderColor}30`,
                            flexWrap: 'wrap',
                            gap: 10
                        }}>
                            <button
                                type="button"
                                onClick={handlePrev}
                                style={{
                                    background: bannerBg,
                                    border: `1.5px solid ${borderColor}`,
                                    borderRadius: 8,
                                    padding: '5px 12px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: textColor,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 1px 4px rgba(11,43,38,0.08)'
                                }}
                                title="See previous announcement"
                            >
                                <span>◀</span>
                                <span>Previous Announcement</span>
                            </button>

                            {/* Dot Indicators */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {announcements.map((_, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        title={`View announcement ${idx + 1} of ${total}`}
                                        style={{
                                            width: idx === activeIndex ? 20 : 8,
                                            height: 8,
                                            borderRadius: 4,
                                            background: idx === activeIndex ? borderColor : `${borderColor}55`,
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            transition: 'all 0.25s ease'
                                        }}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleNext}
                                style={{
                                    background: bannerBg,
                                    border: `1.5px solid ${borderColor}`,
                                    borderRadius: 8,
                                    padding: '5px 12px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: textColor,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 1px 4px rgba(11,43,38,0.08)'
                                }}
                                title="See next announcement"
                            >
                                <span>Next Announcement</span>
                                <span>▶</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox Modal for Announcement Image */}
            {selectedPhoto && (
                <div
                    onClick={() => setSelectedPhoto(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(5,31,32,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: 20
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#DAF1DE',
                            padding: 16,
                            borderRadius: 12,
                            maxWidth: 700,
                            width: '100%',
                            position: 'relative',
                            textAlign: 'center',
                            border: '1px solid #8EB69B'
                        }}
                    >
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                background: '#235347',
                                color: '#DAF1DE',
                                border: 'none',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            ✕
                        </button>
                        <h4 style={{ margin: '0 0 10px', color: '#0B2B26', fontSize: 15, fontWeight: 700 }}>
                            {current.title}
                        </h4>
                        <img
                            src={selectedPhoto}
                            alt="Announcement attachment"
                            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
