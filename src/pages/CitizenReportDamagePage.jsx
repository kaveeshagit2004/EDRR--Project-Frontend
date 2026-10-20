import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicPageShell from '../components/PublicPageShell';
import { createPublicReport, getRuralDivisions, getDamageReportingStatus } from '../api/api';

const NIC_PATTERN = '^([0-9]{9}[vVxX]|[0-9]{12})$';
const PHONE_PATTERN = '^0[0-9]{9}$';

export default function CitizenReportDamagePage() {
    const navigate = useNavigate();
    const [reportingOpen, setReportingOpen] = useState(() => {
        return localStorage.getItem('edrr_damage_reporting_open') === 'true';
    });
    const [statusLoaded, setStatusLoaded] = useState(false);
    const [submitMsg, setSubmitMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [divisions, setDivisions] = useState([]);

    const [form, setForm] = useState({
        title: '', location: '', divisionName: '',
        description: '', affectedArea: '', latitude: '', longitude: '',
        reporterName: '', reporterNic: '', reporterPhone: '', reporterEmail: '',
    });
    const [files, setFiles] = useState([]);

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerInstanceRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState('');

    useEffect(() => {
        let mapInstance = null;

        const initLeafletMap = () => {
            const defaultPos = [
                parseFloat(form.latitude) || 5.95,
                parseFloat(form.longitude) || 80.53
            ];
            if (!mapRef.current) return;

            mapInstance = window.L.map(mapRef.current).setView(defaultPos, 12);
            mapInstanceRef.current = mapInstance;

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstance);

            const defaultIcon = window.L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
            });

            const markerInstance = window.L.marker(defaultPos, { draggable: true, icon: defaultIcon }).addTo(mapInstance);
            markerInstanceRef.current = markerInstance;

            const updateCoords = (latlng) => {
                setForm(prev => ({ ...prev, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6) }));
            };

            markerInstance.on('dragend', () => updateCoords(markerInstance.getLatLng()));
            mapInstance.on('click', (e) => { markerInstance.setLatLng(e.latlng); updateCoords(e.latlng); });

            if (!form.latitude || !form.longitude) {
                setForm(prev => ({ ...prev, latitude: defaultPos[0].toFixed(6), longitude: defaultPos[1].toFixed(6) }));
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const userPos = [position.coords.latitude, position.coords.longitude];
                            mapInstance.setView(userPos, 14);
                            markerInstance.setLatLng(userPos);
                            updateCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                        },
                        (error) => console.warn('Geolocation permission denied or failed:', error),
                        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                    );
                }
            }
        };

        const loadLeaflet = () => {
            if (window.L) { initLeafletMap(); return; }
            const cssId = 'leaflet-css';
            if (!document.getElementById(cssId)) {
                const link = document.createElement('link');
                link.id = cssId; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }
            const scriptId = 'leaflet-script';
            let script = document.getElementById(scriptId);
            if (!script) {
                script = document.createElement('script');
                script.id = scriptId; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async = true;
                document.body.appendChild(script);
                script.onload = () => initLeafletMap();
            } else {
                const checkInterval = setInterval(() => {
                    if (window.L) { clearInterval(checkInterval); initLeafletMap(); }
                }, 100);
            }
        };

        loadLeaflet();

        getDamageReportingStatus()
            .then(res => {
                if (res.data) {
                    const isOpen = Boolean(res.data.open);
                    setReportingOpen(isOpen);
                    localStorage.setItem('edrr_damage_reporting_open', isOpen);
                }
            })
            .catch(() => {})
            .finally(() => setStatusLoaded(true));

        getRuralDivisions()
            .then(res => {
                if (res.data && Array.isArray(res.data)) {
                    setDivisions(res.data);
                }
            })
            .catch(() => {});

        return () => {
            if (mapInstance) {
                mapInstance.remove();
                mapInstanceRef.current = null;
                markerInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearchError('');
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                if (mapInstanceRef.current && markerInstanceRef.current) {
                    mapInstanceRef.current.setView([newLat, newLng], 14);
                    markerInstanceRef.current.setLatLng([newLat, newLng]);
                }
                setForm(prev => ({ ...prev, latitude: newLat.toFixed(6), longitude: newLng.toFixed(6) }));
            } else {
                setSearchError('Location not found.');
            }
        } catch {
            setSearchError('Search failed. Try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitMsg('');
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('location', form.location);
            formData.append('divisionName', form.divisionName || '');
            formData.append('description', form.description);
            formData.append('affectedArea', form.affectedArea);
            formData.append('latitude', parseFloat(form.latitude) || 0);
            formData.append('longitude', parseFloat(form.longitude) || 0);
            formData.append('reporterName', form.reporterName);
            formData.append('reporterNic', form.reporterNic);
            formData.append('reporterPhone', form.reporterPhone);
            if (form.reporterEmail) formData.append('reporterEmail', form.reporterEmail);

            if (files && files.length > 0) {
                files.forEach(file => formData.append('photos', file));
            }

            await createPublicReport(formData);
            setSubmitMsg('success');
            setForm({
                title: '', location: '', divisionName: '',
                description: '', affectedArea: '', latitude: '', longitude: '',
                reporterName: '', reporterNic: '', reporterPhone: '', reporterEmail: '',
            });
            setFiles([]);
            setTimeout(() => navigate('/citizen'), 2500);
        } catch {
            setSubmitMsg('error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PublicPageShell
            eyebrow="PUBLIC SUBMISSION"
            title="Report Environmental Damage"
            description="Tell us what you're seeing — a damaged road, blocked drainage, pollution or flooding — and we'll route it to the right authority for action."
        >
            {!reportingOpen ? (
                <div className="card-surface" style={{ textAlign: 'center', padding: '50px 24px', maxWidth: 640, margin: '20px auto', border: '1.5px solid #d97706', borderRadius: 14 }}>
                    <div style={{ fontSize: 50, marginBottom: 14 }}>🔒</div>
                    <h2 style={{ color: '#0B2B26', fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
                        Damage Reporting Portal is Currently Closed
                    </h2>
                    <p style={{ color: '#235347', fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 20px' }}>
                        The Government Agent (GA) Admin has not opened public damage reporting at this time.
                        This portal is activated by the District Administration during active disasters and flood alerts.
                    </p>
                    <button className="primary-action-button" type="button" onClick={() => navigate('/citizen')}>
                        Return to Citizen Overview →
                    </button>
                </div>
            ) : (
                <>
                    {submitMsg === 'success' && <div className="form-message success">✓ Report submitted successfully. It has been routed to authorities for review.</div>}
                    {submitMsg === 'error' && <div className="form-message error">Failed to submit. Please try again.</div>}

                    <form className="modern-report-form card-surface" onSubmit={handleSubmit}>
                        <div className="form-step-section">
                            <div className="form-step-badge">1</div>
                            <div className="form-step-content">
                                <h2>Damage Details</h2>
                                <p>Provide a brief title describing the damage incident.</p>

                                <label>Report Title *
                                    <input placeholder="Brief description of the damage" value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })} required />
                                </label>
                            </div>
                        </div>

                        <div className="form-step-section">
                            <div className="form-step-badge">2</div>
                            <div className="form-step-content">
                                <h2>Location</h2>
                                <p>Describe the location and pin it on the map.</p>

                                <label>Location *
                                    <input placeholder="e.g. Matara Town - Nilwala Left Bank" value={form.location}
                                        onChange={e => setForm({ ...form, location: e.target.value })} required />
                                </label>

                                <label style={{ marginTop: 14, display: 'block' }}>Rural Officer Division Name *
                                    <input 
                                        list="rural-divisions-list"
                                        placeholder="Select or enter Rural Officer Division (e.g. Weligama, Akuressa, Matara Four Gravets)..." 
                                        value={form.divisionName}
                                        onChange={e => setForm({ ...form, divisionName: e.target.value })} 
                                        required 
                                    />
                                    <datalist id="rural-divisions-list">
                                        {divisions.map(div => <option key={div} value={div} />)}
                                    </datalist>
                                    <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
                                        Select the assigned administrative division to route this report directly to the designated Rural Division Officer.
                                    </small>
                                </label>

                                <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                                    <input
                                        style={{ flex: 1 }}
                                        placeholder="Search location (e.g. Matara, Colombo)..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                                    />
                                    <button type="button" className="secondary-action-button" onClick={handleSearch}>Search</button>
                                </div>
                                {searchError && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{searchError}</div>}

                                <div className="report-location-map" ref={mapRef} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                                    <span>Latitude: {form.latitude || '-'}</span>
                                    <span>Longitude: {form.longitude || '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="form-step-section">
                            <div className="form-step-badge">3</div>
                            <div className="form-step-content">
                                <h2>Description &amp; Evidence</h2>
                                <p>Add any details and photos that help authorities assess the damage.</p>

                                <label>Damage Description
                                    <textarea rows="4" placeholder="Describe what you see, safety concerns, and impact on the area..."
                                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </label>

                                <label>Upload Photos
                                    <div className="upload-dropzone" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div className="upload-symbol">⤒</div>
                                        <strong>Attach photo evidence</strong>
                                        <small>{files.length > 0 ? `${files.length} photo(s) selected` : 'JPG or PNG, multiple allowed'}</small>
                                        <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} />
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="form-step-section" style={{ borderBottom: 'none' }}>
                            <div className="form-step-badge">4</div>
                            <div className="form-step-content">
                                <h2>Your Contact Information</h2>
                                <p>Required so authorities can verify and follow up on this report. Your NIC and phone number are never shown publicly.</p>

                                <label>Full Name *
                                    <input placeholder="Your full name" value={form.reporterName}
                                        onChange={e => setForm({ ...form, reporterName: e.target.value })} required />
                                </label>

                                <div className="two-column-form compact">
                                    <label>NIC Number *
                                        <input placeholder="e.g. 199512345678 or 951234567V" value={form.reporterNic}
                                            onChange={e => setForm({ ...form, reporterNic: e.target.value })}
                                            pattern={NIC_PATTERN}
                                            title="Enter a valid NIC: 9 digits followed by V/X, or 12 digits"
                                            required />
                                    </label>
                                    <label>Phone Number *
                                        <input type="tel" placeholder="e.g. 0771234567" value={form.reporterPhone}
                                            onChange={e => setForm({ ...form, reporterPhone: e.target.value })}
                                            pattern={PHONE_PATTERN}
                                            title="Enter a valid 10-digit phone number starting with 0"
                                            required />
                                    </label>
                                </div>

                                <label>Email (optional)
                                    <input type="email" placeholder="you@example.com" value={form.reporterEmail}
                                        onChange={e => setForm({ ...form, reporterEmail: e.target.value })} />
                                </label>
                            </div>
                        </div>

                        <div className="form-submit-footer">
                            <p>By submitting, you confirm this report is accurate to the best of your knowledge.</p>
                            <button className="primary-action-button" type="submit" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Damage Report'}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </PublicPageShell>
    );
}
