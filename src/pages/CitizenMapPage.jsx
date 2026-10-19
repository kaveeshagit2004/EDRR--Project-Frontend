import React, { useEffect, useRef, useState } from 'react';
import PublicPageShell from '../components/PublicPageShell';
import { getAllReports, getAllWaterLevels } from '../api/api';
import { getRecordAlertInfo } from '../utils/waterAlerts';

export default function CitizenMapPage() {
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
    const interval = setInterval(loadMapData, 5000);
    const handleFocus = () => loadMapData();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
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
        const alertInfo = getRecordAlertInfo(w);
        const color = alertInfo.color;
        const marker = window.L.circleMarker([lat, lng], {
          radius: 9,
          color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2
        }).addTo(map);
        const reporterName = w.reporterName || w.updatedByName || w.officerName;
        const reporterInfo = reporterName ? `<br/>Reported by : ${reporterName}` : '';
        marker.bindPopup(`<strong>${w.locationName || 'Water Monitoring'}</strong><br/>Current Level: <strong>${w.currentLevel ?? '-'} m</strong><br/>Alert: <strong>${alertInfo.badgeLabel}</strong>${reporterInfo}`);
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
    <PublicPageShell eyebrow="GEOGRAPHIC VIEW" title="Damage & Hazard Map" description="View reported environmental damage and water monitoring information by location." wide>
      <div className="map-page-toolbar card-surface">
        <div className="map-filter-buttons">
          {['ALL', 'IN_PROGRESS', 'RESOLVED'].map(value => (
            <button key={value} className={filter === value ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter(value)}>
              {value === 'ALL' ? 'All Reports' : value.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="map-legend">
          <span><i className="legend-marker damage" /> Active Damage</span>
          <span><i className="legend-marker resolved" /> Resolved</span>
          <span><i className="legend-marker water" /> Water Station</span>
          <span><i className="legend-marker critical" /> Flood Warning</span>
        </div>
      </div>

      <div className="map-card" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
        {loading ? <div className="page-loading">Loading map data...</div> : <div ref={mapRef} className="leaflet-map" />}
      </div>
    </PublicPageShell>
  );
}
