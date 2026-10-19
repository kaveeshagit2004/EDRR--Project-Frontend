import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, getAllWaterLevels } from '../api/api';
import { resolveSidebarNav, AS } from '../utils/adminNav';

export default function AdminMapPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const [reports, setReports] = useState([]);
    const [waterLevels, setWaterLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        const loadMapData = () => {
            Promise.all([getAllReports(), getAllWaterLevels()])
                .then(([r, w]) => {
                    setReports((r.data || []).filter(item => item.status !== 'REJECTED'));
                    setWaterLevels(w.data || []);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        };
        loadMapData();
        const interval = setInterval(loadMapData, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (loading || !mapRef.current) return;
        let cancelled = false;

        const initMap = () => {
            if (cancelled || !mapRef.current || mapInstanceRef.current) return;
            const map = window.L.map(mapRef.current).setView([6.05, 80.55], 9);
            mapInstanceRef.current = map;
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            const points = [];
            reports.forEach(r => {
                const lat = parseFloat(r.latitude);
                const lng = parseFloat(r.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                if (filter !== 'ALL' && r.status !== filter) return;
                const marker = window.L.circleMarker([lat, lng], {
                    radius: 8,
                    color: r.status === 'RESOLVED' ? '#22C55E' : '#F4C430',
                    fillColor: r.status === 'RESOLVED' ? '#22C55E' : '#F4C430',
                    fillOpacity: 0.9,
                    weight: 2
                }).addTo(map);
                const reporterInfo = r.reporterName ? `<br/>Reported by : ${r.reporterName}` : '';
                marker.bindPopup(`<strong>${r.title || 'Damage Report'}</strong><br/>${r.location || ''}${r.status && r.status !== 'PENDING' ? `<br/>Status: ${r.status.replace('_', ' ')}` : ''}${reporterInfo}`);
                points.push([lat, lng]);
            });

            waterLevels.forEach(w => {
                const lat = parseFloat(w.latitude);
                const lng = parseFloat(w.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                const color = (w.status === 'CRITICAL' || w.status === 'WARNING') ? '#DC2626' : '#2563EB';
                const marker = window.L.circleMarker([lat, lng], {
                    radius: 8,
                    color,
                    fillColor: color,
                    fillOpacity: 0.9,
                    weight: 2
                }).addTo(map);
                const reporterName = w.reporterName || w.updatedByName || w.officerName;
                const reporterInfo = reporterName ? `<br/>Reported by : ${reporterName}` : '';
                marker.bindPopup(`<strong>${w.locationName || 'Water Monitoring'}</strong><br/>${w.currentLevel ?? '-'} m<br/>Status: ${w.status || '-'}${reporterInfo}`);
                points.push([lat, lng]);
            });

            if (points.length > 1) map.fitBounds(points, { padding: [40, 40] });
            setTimeout(() => map.invalidateSize(), 100);
        };

        const loadLeaflet = () => {
            if (window.L) return initMap();
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }
            let script = document.getElementById('leaflet-script');
            if (!script) {
                script = document.createElement('script');
                script.id = 'leaflet-script';
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                document.body.appendChild(script);
            }
            script.addEventListener('load', initMap, { once: true });
        };

        loadLeaflet();
        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [loading, reports, waterLevels, filter]);

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>

                <div style={{ marginBottom: 20 }}>
                    <h2 style={AS.title}>Damage &amp; Hazard Map</h2>
                    <p style={AS.subtitle}>System-wide view of reported environmental damage and water monitoring stations.</p>
                </div>

                <div style={{ ...AS.card, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['ALL', 'IN_PROGRESS', 'RESOLVED'].map(value => (
                            <button key={value} style={filter === value ? AS.chipActive : AS.chip} onClick={() => setFilter(value)}>
                                {value === 'ALL' ? 'All Reports' : value.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#235347', fontWeight: 600 }}>
                        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#F4C430', marginRight: 6 }} />Active Damage</span>
                        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#22C55E', marginRight: 6 }} />Resolved</span>
                        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#2563EB', marginRight: 6 }} />Water Station</span>
                        <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#DC2626', marginRight: 6 }} />Flood Warning</span>
                    </div>
                </div>

                <div style={{ ...AS.card, padding: 0, overflow: 'hidden', marginTop: 14 }}>
                    {loading ? (
                        <div style={AS.emptyState}>Loading map data...</div>
                    ) : (
                        <div ref={mapRef} style={{ width: '100%', height: 560 }} />
                    )}
                </div>
            </div></div>
        </div>
    );
}
