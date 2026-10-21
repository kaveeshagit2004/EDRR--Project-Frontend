import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Link } from 'react-router-dom';
import {
    getAllReports,
    createReport,
    deleteReport,
    getDashboardNotifications,
    dismissNotification
} from '../api/api';
import { canDeleteReports } from '../utils/reportPermissions';
import RecoveryProgressBar from '../components/RecoveryProgressBar';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';

const NAV = [
    { path: '/officer', icon: '', label: 'Overview' },
    { path: '/officer/map', icon: '', label: 'Map' },
    { path: '/officer/alerts', icon: '', label: 'Alerts' },
    { path: '/officer/contact', icon: '', label: 'Contact' },
    { path: '/officer/report-damage', icon: '', label: 'Situation Damage' },
    { path: '/officer/public-reports', icon: '', label: 'Citizen Reports' },
    { path: '/officer/profile', icon: '', label: 'Profile' },
];

export default function OfficerDashboard({ initialTab = 'reports' }) {
    const [tab, setTab] = useState(initialTab);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitMsg, setSubmitMsg] = useState('');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [citizenNotifs, setCitizenNotifs] = useState([]);
    const [photoIndex, setPhotoIndex] = useState(0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = user.id || user._id || '';
    const currentUserName = user.fullName || user.name || '';

    const [form, setForm] = useState({
        title:'', damageType:'FLOOD', location:'', severity:'MEDIUM',
        description:'', affectedArea:'', latitude:'', longitude:'',
        reporterName: currentUserName, reportedBy: currentUserId,
    });
    const [files, setFiles] = useState([]);
    const mapRef = React.useRef(null);
    const mapInstanceRef = React.useRef(null);
    const markerInstanceRef = React.useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState('');

    useEffect(() => {
        getAllReports()
            .then(r => setReports(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (user.role !== 'RURAL_OFFICER') return;

        const checkNotifications = () => {
            getDashboardNotifications({
                role: 'RURAL_OFFICER',
                divisionName: user.divisionName || '',
                userId: currentUserId
            })
            .then(res => {
                const list = res.data || [];
                setCitizenNotifs(list);

                // Browser push notifications for new citizen reports
                list.forEach(n => {
                    const key = 'notified_citizen_report_' + n.id;
                    if (!localStorage.getItem(key)) {
                        if ('Notification' in window) {
                            if (Notification.permission === 'granted') {
                                try {
                                    new Notification(`New Citizen Damage Report · ${n.targetDivision || 'Your Division'}`, {
                                        body: n.message || `New citizen report in ${n.location}: ${n.title}`,
                                        icon: '/favicon.ico'
                                    });
                                    localStorage.setItem(key, 'true');
                                } catch {}
                            } else if (Notification.permission === 'default') {
                                Notification.requestPermission().then(p => {
                                    if (p === 'granted') {
                                        try {
                                            new Notification(`New Citizen Damage Report · ${n.targetDivision || 'Your Division'}`, {
                                                body: n.message || `New citizen report in ${n.location}: ${n.title}`,
                                                icon: '/favicon.ico'
                                            });
                                            localStorage.setItem(key, 'true');
                                        } catch {}
                                    }
                                });
                            }
                        }
                    }
                });
            })
            .catch(() => {});
        };

        checkNotifications();
        const interval = setInterval(checkNotifications, 20000);
        return () => clearInterval(interval);
    }, [user.role, user.divisionName, currentUserId]);

    const handleDismissNotif = (notifId) => {
        setCitizenNotifs(prev => prev.filter(n => n.id !== notifId));
        dismissNotification(notifId).catch(() => {});
    };

    const reload = () => getAllReports().then(r => setReports(r.data)).catch(console.error);

    // Only damage reports uploaded by this officer are visible in their overview
    const isMyReport = (r) => {
        if (!r) return false;
        // Primary check: match officer's unique ID
        if (currentUserId && r.reportedBy) {
            return String(r.reportedBy) === String(currentUserId);
        }
        // Match by officer's email if stored as reportedBy
        if (user.email && r.reportedBy) {
            return String(r.reportedBy).toLowerCase() === String(user.email).toLowerCase();
        }
        // Fallback for older reports without reportedBy
        if (!r.reportedBy && currentUserName && r.reporterName) {
            return String(r.reporterName).trim().toLowerCase() === String(currentUserName).trim().toLowerCase();
        }
        return false;
    };

    const myReports = (reports || []).filter(isMyReport);

    // Only Rural Division Officers (and the GA elsewhere) may delete reports.
    const canDelete = canDeleteReports(user);
    const handleDelete = async (r) => {
        if (!window.confirm(`Delete "${r.title}" (${r.reportNumber || `#${r.id}`})?\nIt will be moved to the recycle bin, where the GA can restore or permanently delete it.`)) return;
        try { await deleteReport(r.id); await reload(); }
        catch { alert('Failed to delete the report'); }
    };

    useEffect(() => {
        if (tab !== 'new') return;

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
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            const markerInstance = window.L.marker(defaultPos, {
                draggable: true,
                icon: defaultIcon
            }).addTo(mapInstance);
            markerInstanceRef.current = markerInstance;

            const updateCoords = (latlng) => {
                setForm(prev => ({
                    ...prev,
                    latitude: latlng.lat.toFixed(6),
                    longitude: latlng.lng.toFixed(6)
                }));
            };

            markerInstance.on('dragend', () => {
                updateCoords(markerInstance.getLatLng());
            });

            mapInstance.on('click', (e) => {
                markerInstance.setLatLng(e.latlng);
                updateCoords(e.latlng);
            });

            if (!form.latitude || !form.longitude) {
                setForm(prev => ({
                    ...prev,
                    latitude: defaultPos[0].toFixed(6),
                    longitude: defaultPos[1].toFixed(6)
                }));

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const userPos = [position.coords.latitude, position.coords.longitude];
                            mapInstance.setView(userPos, 14);
                            markerInstance.setLatLng(userPos);
                            updateCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
                        },
                        (error) => {
                            console.warn("Geolocation permission denied or failed:", error);
                        },
                        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                    );
                }
            }
        };

        const loadLeaflet = () => {
            if (window.L) {
                initLeafletMap();
                return;
            }

            const cssId = 'leaflet-css';
            if (!document.getElementById(cssId)) {
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            const scriptId = 'leaflet-script';
            let script = document.getElementById(scriptId);
            if (!script) {
                script = document.createElement('script');
                script.id = scriptId;
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                document.body.appendChild(script);
                script.onload = () => {
                    initLeafletMap();
                };
            } else {
                const checkInterval = setInterval(() => {
                    if (window.L) {
                        clearInterval(checkInterval);
                        initLeafletMap();
                    }
                }, 100);
            }
        };

        loadLeaflet();

        return () => {
            if (mapInstance) {
                mapInstance.remove();
                mapInstanceRef.current = null;
                markerInstanceRef.current = null;
            }
        };
    }, [tab]);

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

                setForm(prev => ({
                    ...prev,
                    latitude: newLat.toFixed(6),
                    longitude: newLng.toFixed(6)
                }));
            } else {
                setSearchError('Location not found.');
            }
        } catch (err) {
            setSearchError('Search failed. Try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitMsg('');
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('damageType', form.damageType);
            formData.append('location', form.location);
            formData.append('severity', form.severity);
            formData.append('description', form.description);
            formData.append('affectedArea', form.affectedArea);
            formData.append('latitude', parseFloat(form.latitude) || 0);
            formData.append('longitude', parseFloat(form.longitude) || 0);
            const officerId = currentUserId || form.reportedBy || '';
            const officerName = currentUserName || form.reporterName || 'Rural Division Officer';
            formData.append('reporterName', officerName);
            formData.append('reportedBy', officerId);

            if (files && files.length > 0) {
                files.forEach(file => {
                    formData.append('photos', file);
                });
            }

            await createReport(formData);
            setSubmitMsg('success');
            setForm({
                title:'', damageType:'FLOOD', location:'', severity:'MEDIUM',
                description:'', affectedArea:'', latitude:'', longitude:'',
                reporterName: currentUserName, reportedBy: currentUserId,
            });
            setFiles([]);
            reload();
            setTimeout(() => { setSubmitMsg(''); setTab('reports'); }, 2000);
        } catch { setSubmitMsg('error'); }
    };

    if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading...</div>;



    const sevColor = { CRITICAL:'#8EB69B', HIGH:'#8EB69B', MEDIUM:'#8EB69B', LOW:'#8EB69B' };
    const statColor = { IN_PROGRESS:'#8EB69B', RESOLVED:'#8EB69B', REJECTED:'#8EB69B' };

    const roleLabel = user.role === 'IRRIGATION_OFFICER' ? 'Irrigation Officer' : 'Rural Division Officer';

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={roleLabel} links={NAV} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth:1180, margin:'0 auto' }}>

                {/* Main Heading and Sub Heading */}
                <div style={{ marginBottom: 16 }}>
                    <h2 style={S.title}>Rural Officer Overview</h2>
                    <p style={{ fontSize: 13, color: '#235347', margin: '4px 0 0' }}>
                        Manage and monitor environmental damage reports registered in your division.
                    </p>
                </div>

                {/* GA Admin Official Alert Announcement Banner (Displayed under main heading and sub heading) */}
                <AlertAnnouncementBanner />

                {/* Citizen Damage Report Notifications Scoped to this Officer's Division */}
                {citizenNotifs.length > 0 && (
                    <div style={{
                        background: '#E8F5E9',
                        border: '1px solid #A5D6A7',
                        borderLeft: '5px solid #2E7D32',
                        borderRadius: 8,
                        padding: '14px 18px',
                        marginBottom: 16,
                        boxShadow: '0 2px 6px rgba(46,125,50,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 18 }}>📢</span>
                                <strong style={{ color: '#1B5E20', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Citizen Damage Report Notifications {user.divisionName ? `· ${user.divisionName} Division` : ''} ({citizenNotifs.length})
                                </strong>
                            </div>
                            <Link
                                to="/officer/public-reports"
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#1B5E20',
                                    textDecoration: 'underline'
                                }}
                            >
                                View in Citizen Reports →
                            </Link>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {citizenNotifs.slice(0, 3).map(notif => (
                                <div
                                    key={notif.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        background: '#FFFFFF',
                                        padding: '10px 14px',
                                        borderRadius: 6,
                                        border: '1px solid #C8E6C9'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B5E20', marginBottom: 2 }}>
                                            {notif.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#2E7D32', lineHeight: 1.4 }}>
                                            {notif.message}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#558B2F', marginTop: 4 }}>
                                            Location: <strong>{notif.location || 'N/A'}</strong> · Submitter: <strong>{notif.reporterName || 'Citizen'}</strong>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <Link
                                            to="/officer/public-reports"
                                            style={{
                                                fontSize: 11,
                                                padding: '4px 10px',
                                                background: '#235347',
                                                color: '#FFF',
                                                borderRadius: 4,
                                                textDecoration: 'none',
                                                fontWeight: 600
                                            }}
                                        >
                                            Review
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDismissNotif(notif.id)}
                                            title="Dismiss notification"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#888',
                                                fontSize: 16,
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                lineHeight: 1
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={S.tabBar}>
                    {[['reports',' My Reports'],['new',' Report Damage']].map(([k,l])=>(
                        <button key={k} style={tab===k?S.tabActive:S.tab} onClick={()=>setTab(k)}>{l}</button>
                    ))}
                </div>

                {/* ── REPORTS LIST ── */}
                {tab === 'reports' && (
                    <div>
                        <h2 style={S.title}>Damage Reports ({myReports.length})</h2>
                        {myReports.length === 0
                            ? <div style={{textAlign:'center',color:'#235347',padding:60}}>No reports yet.</div>
                            : myReports.map(r => (
                                    <div key={r.id} style={S.card}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                                        <span style={{fontSize:12,color:'#235347',fontFamily:'monospace'}}>{r.reportNumber}</span>
                                        {r.status !== 'PENDING' && <span style={{...S.badge,background:statColor[r.status]||'#8EB69B'}}>{r.status?.replace('_',' ')}</span>}
                                    </div>
                                    <h3 style={{fontSize:18,fontWeight:700,margin:'0 0 3px'}}>{r.title}</h3>
                                    <p style={{fontSize:12,color:'#235347',margin:'0 0 8px'}}>
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: '#235347', fontWeight: 500 }}
                                        >
                                            {r.location} <span style={{ fontSize: 11, color: '#235347', marginLeft: 4 }}>(View Map)</span>
                                        </a>
                                    </p>
                                     <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8,alignItems:'center'}}>
                                         <span style={{...S.badge,background:sevColor[r.severity]||'#8EB69B'}}>{r.severity}</span>
                                         <span style={{fontSize:12,color:'#235347',background:'#DAF1DE',padding:'2px 8px',borderRadius:4}}>{r.damageType?.replace('_',' ')}</span>
                                         {r.reporterName && <span style={{fontSize:12,color:'#235347',marginLeft:4}}>Reported by : {r.reporterName}</span>}
                                     </div>
                                    {r.description && <p style={{fontSize:13,color:'#235347',margin:'0 0 8px'}}>{r.description}</p>}
                                    {r.photoUrls && r.photoUrls.length > 0 && (
                                        <div style={{ marginBottom: 12, cursor: 'pointer', position: 'relative' }} onClick={() => { setSelectedPhotos(r.photoUrls); setPhotoIndex(0); }}>
                                            <img src={r.photoUrls[0]} alt={r.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
                                            {r.photoUrls.length > 1 && (
                                                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(5,31,32,0.82)', color:'#DAF1DE', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                                    +{r.photoUrls.length - 1} More Photo{r.photoUrls.length > 2 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <RecoveryProgressBar
                                        status={r.status}
                                        recoveryProgress={r.recoveryProgress}
                                    />
                                    {canDelete && (
                                        <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
                                            <button style={S.btnDelete} onClick={() => handleDelete(r)}>Delete</button>
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* ── NEW REPORT FORM ── */}
                {tab === 'new' && (
                    <div>
                        <h2 style={S.title}>Report Damage</h2>
                        {submitMsg === 'success' && <div style={S.successBox}>Report submitted successfully!</div>}
                        {submitMsg === 'error' && <div style={S.errorBox}>Failed to submit. Try again.</div>}
                        <div style={S.formCard}>
                            <form onSubmit={handleSubmit}>
                                <Field label="Report Title *">
                                    <input style={S.input} placeholder="Brief description of the damage"
                                           value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
                                </Field>
                                <div style={{display:'flex',gap:10}}>
                                    <Field label="Damage Type *" style={{flex:1}}>
                                        <select style={S.input} value={form.damageType} onChange={e=>setForm({...form,damageType:e.target.value})}>
                                            {['FLOOD','ROAD_DAMAGE','LANDSLIDE','BRIDGE_DAMAGE','BUILDING','WATER_POLLUTION','OTHER'].map(v=>(
                                                <option key={v} value={v}>{v.replace('_',' ')}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Severity *" style={{flex:1}}>
                                        <select style={S.input} value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}>
                                            {['LOW','MEDIUM','HIGH','CRITICAL'].map(v=><option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </Field>
                                </div>
                                <Field label="Location *">
                                    <input style={S.input} placeholder="e.g. Matara Town - Nilwala Left Bank"
                                           value={form.location} onChange={e=>setForm({...form,location:e.target.value})} required />
                                </Field>
                                <Field label="Pick Location on Map *">
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                        <input 
                                            style={{ ...S.input, flex: 1, padding: '8px 12px' }} 
                                            placeholder="Search location (e.g. Matara, Colombo)..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                                        />
                                        <button 
                                            type="button" 
                                            style={{ ...S.btn, background: '#235347', padding: '8px 16px' }}
                                            onClick={handleSearch}
                                        >
                                            Search
                                        </button>
                                    </div>
                                    {searchError && <div style={{ fontSize: 12, color: '#8EB69B', marginBottom: 8 }}>{searchError}</div>}
                                    <div 
                                        ref={mapRef} 
                                        style={{ 
                                            width: '100%', 
                                            height: '250px', 
                                            borderRadius: '8px', 
                                            border: '1.5px solid #8EB69B',
                                            marginBottom: 8 
                                        }} 
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#235347' }}>
                                        <span>Latitude: {form.latitude || '-'}</span>
                                        <span>Longitude: {form.longitude || '-'}</span>
                                    </div>
                                </Field>
                                <Field label="Damage Description">
                  <textarea style={{...S.input,height:90,resize:'vertical'}}
                            placeholder="Describe what you see, safety concerns, and impact on the area..."
                            value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                                </Field>
                                <Field label="Estimated Affected Area">
                                    <input style={S.input} placeholder="e.g. 500 sq meters"
                                           value={form.affectedArea} onChange={e=>setForm({...form,affectedArea:e.target.value})} />
                                </Field>
                                <Field label="Upload Photos">
                                    <input style={S.input} type="file" multiple accept="image/*"
                                           onChange={e => setFiles(Array.from(e.target.files || []))} />
                                </Field>
                                <button style={{...S.btn,background:'#235347',width:'100%',padding:13,fontSize:18,fontWeight:700}} type="submit">
                                    Submit Damage Report
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* ── PHOTO SLIDER MODAL ── */}
            {selectedPhotos && (
                <div style={S.modalOverlay} onClick={() => setSelectedPhotos(null)}>
                    <div style={S.modalContent} onClick={e => e.stopPropagation()}>
                        <button style={S.modalClose} onClick={() => setSelectedPhotos(null)}>✕</button>
                        
                        <div style={S.sliderContainer}>
                            {selectedPhotos.length > 1 && (
                                <button style={S.navBtnLeft} onClick={() => setPhotoIndex((photoIndex - 1 + selectedPhotos.length) % selectedPhotos.length)}>
                                    ◀
                                </button>
                            )}
                            
                            <img src={selectedPhotos[photoIndex]} alt="Report detail" style={S.sliderImg} />
                            
                            {selectedPhotos.length > 1 && (
                                <button style={S.navBtnRight} onClick={() => setPhotoIndex((photoIndex + 1) % selectedPhotos.length)}>
                                    ▶
                                </button>
                            )}
                        </div>
                        
                        {selectedPhotos.length > 1 && (
                            <div style={S.sliderDots}>
                                {selectedPhotos.map((_, idx) => (
                                    <span 
                                        key={idx} 
                                        style={{
                                            ...S.sliderDot, 
                                            background: idx === photoIndex ? '#235347' : '#8EB69B'
                                        }}
                                        onClick={() => setPhotoIndex(idx)}
                                    />
                                ))}
                            </div>
                        )}
                        <div style={{ textAlign: 'center', marginTop: 8, color: '#235347', fontSize: 12, fontWeight: 600 }}>
                            {photoIndex + 1} / {selectedPhotos.length}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

function Field({ label, children, style }) {
    return (
        <div style={{ marginBottom:14, ...style }}>
            <label style={{display:'block',fontSize:13,fontWeight:500,color:'#235347',marginBottom:5}}>{label}</label>
            {children}
        </div>
    );
}

const S = {
    tabBar: {display:'flex',background:'#DAF1DE',borderRadius:12,padding:4,gap:4,marginBottom:20,border:'1px solid #8EB69B',boxShadow:'0 2px 10px rgba(11,43,38,0.10)'},
    tab: {flex:1,padding:'10px',border:'none',background:'none',color:'#235347',fontSize:13,borderRadius:8,cursor:'pointer'},
    tabActive: {flex:1,padding:'10px',border:'none',background:'#235347',color:'#DAF1DE',fontSize:13,fontWeight:700,borderRadius:8,cursor:'pointer'},
    title: {fontSize:24,fontWeight:800,margin:'0 0 16px',color:'#0B2B26',textShadow:'none'},
    card: {background:'#DAF1DE',borderRadius:12,padding:18,marginBottom:10,border:'1px solid #8EB69B',boxShadow:'0 2px 10px rgba(11,43,38,0.10)',color:'#0B2B26'},
    badge: {fontSize:12,color:'#0B2B26',padding:'3px 9px',borderRadius:20,fontWeight:600},
    btnDelete: {padding:'6px 14px',border:'1px solid #0B2B26',borderRadius:9,background:'#DAF1DE',color:'#0B2B26',fontSize:12,fontWeight:700,cursor:'pointer'},
    btn: {padding:'7px 16px',border:'1px solid #235347',borderRadius:9,background:'#235347',color:'#DAF1DE',fontSize:13,fontWeight:700,cursor:'pointer'},
    formCard: {background:'#DAF1DE',borderRadius:12,padding:22,border:'1px solid #8EB69B',boxShadow:'0 2px 10px rgba(11,43,38,0.10)',color:'#0B2B26'},
    input: {width:'100%',padding:'11px 13px',border:'1.5px solid #8EB69B',borderRadius:8,fontSize:14,background:'#DAF1DE',color:'#0B2B26',fontFamily:'inherit',boxSizing:'border-box',outline:'none'},
    successBox: {background:'#DAF1DE',color:'#0B2B26',borderLeft:'4px solid #235347',padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13},
    errorBox: {background:'#DAF1DE',color:'#0B2B26',borderLeft:'4px solid #0B2B26',padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13},

    // Modal & Slider Styles
    modalOverlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(5,31,32,0.65)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: 16
    },
    modalContent: {
        background:'#DAF1DE', borderRadius: 12, padding: '30px 20px 20px', maxWidth: 600,
        width: '100%', position: 'relative', boxShadow: '0 4px 20px rgba(11,43,38,0.16)', color:'#0B2B26', border:'1px solid #8EB69B'
    },
    modalClose: {
        position: 'absolute', top: 12, right: 12, background: '#DAF1DE',
        border: '1px solid #8EB69B', borderRadius: '50%', width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontWeight: 'bold', color: '#0B2B26', zIndex: 10
    },
    sliderContainer: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', minHeight: 250, background: '#8EB69B',
        borderRadius: 8, overflow: 'hidden', marginTop: 10
    },
    sliderImg: {
        maxWidth: '100%', maxHeight: 400, objectFit: 'contain'
    },
    navBtnLeft: {
        position: 'absolute', left: 10, background: '#DAF1DE', color:'#0B2B26',
        border: '1px solid #8EB69B', borderRadius: '50%', width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 5px rgba(11,43,38,0.16)', fontWeight: 'bold', zIndex: 10
    },
    navBtnRight: {
        position: 'absolute', right: 10, background: '#DAF1DE', color:'#0B2B26',
        border: '1px solid #8EB69B', borderRadius: '50%', width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 5px rgba(11,43,38,0.16)', fontWeight: 'bold', zIndex: 10
    },
    sliderDots: {
        display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12
    },
    sliderDot: {
        width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s'
    }
};