import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, createReport, updateReportStatus } from '../api/api';

const NAV = [
    { path: '/officer', icon: '🏠', label: 'Home' },
    { path: '/officer/map', icon: '🗺️', label: 'Map' },
    { path: '/officer/alerts', icon: '🔔', label: 'Alerts' },
    { path: '/officer/contact', icon: '📞', label: 'Contact' },
    { path: '/officer/feedback', icon: '💬', label: 'Feedback' },
    { path: '/officer/about', icon: 'ℹ️', label: 'About Us' },
    { path: '/officer/profile', icon: '👤', label: 'Profile' },
    { path: '/officer/report', icon: '📝', label: 'Report Damage' },
];

export default function OfficerDashboard() {
    const [tab, setTab] = useState('reports');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitMsg, setSubmitMsg] = useState('');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [photoIndex, setPhotoIndex] = useState(0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [form, setForm] = useState({
        title:'', damageType:'FLOOD', location:'', severity:'MEDIUM',
        description:'', affectedArea:'', latitude:'', longitude:'',
        reporterName: user.fullName || '', reportedBy: user.id || '',
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

    const reload = () => getAllReports().then(r => setReports(r.data)).catch(console.error);

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
            formData.append('reporterName', form.reporterName);
            formData.append('reportedBy', form.reportedBy);

            if (files && files.length > 0) {
                files.forEach(file => {
                    formData.append('photos', file);
                });
            }

            await createReport(formData);
            setSubmitMsg('success');
            setForm({ ...form, title:'', location:'', description:'', affectedArea:'', latitude:'', longitude:'' });
            setFiles([]);
            reload();
            setTimeout(() => { setSubmitMsg(''); setTab('reports'); }, 2000);
        } catch { setSubmitMsg('error'); }
    };

    const handleStatusUpdate = async (id, status) => {
        try { await updateReportStatus(id, status, ''); reload(); } catch { alert('Update failed'); }
    };

    if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading...</div>;

    const PROGRESS_STAGES = [
        { value: 20,  label: '20% – Site Inspection' },
        { value: 40,  label: '40% – Surface Preparation' },
        { value: 60,  label: '60% – Road Repair' },
        { value: 80,  label: '80% – Quality Check' },
        { value: 100, label: '100% – Completed' },
    ];
    const getStageLabel = (pct) => {
        const stage = PROGRESS_STAGES.find(s => s.value === pct);
        return stage ? stage.label : `${pct || 0}%`;
    };

    const sevColor = { CRITICAL:'#dc2626', HIGH:'#ea580c', MEDIUM:'#d97706', LOW:'#059669' };
    const statColor = { PENDING:'#d97706', IN_PROGRESS:'#2563eb', RESOLVED:'#059669', REJECTED:'#dc2626' };

    const roleLabel = user.role === 'IRRIGATION_OFFICER' ? 'Irrigation Officer' : 'Rural Division Officer';

    return (
        <div style={{ minHeight:'100vh', background:'#f0f2f5', fontFamily:'inherit' }}>
            <Sidebar role={roleLabel} links={NAV} />
            <div style={{ padding:16, maxWidth:700, margin:'0 auto' }}>

                <div style={S.tabBar}>
                    {[['reports','📋 My Reports'],['new','➕ Report Damage']].map(([k,l])=>(
                        <button key={k} style={tab===k?S.tabActive:S.tab} onClick={()=>setTab(k)}>{l}</button>
                    ))}
                </div>

                {/* ── REPORTS LIST ── */}
                {tab === 'reports' && (
                    <div>
                        <h2 style={S.title}>Damage Reports ({reports.length})</h2>
                        {reports.length === 0
                            ? <div style={{textAlign:'center',color:'#9ca3af',padding:60}}>No reports yet.</div>
                            : reports.map(r => (
                                <div key={r.id} style={S.card}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                                        <span style={{fontSize:11,color:'#9ca3af',fontFamily:'monospace'}}>{r.reportNumber}</span>
                                        <span style={{...S.badge,background:statColor[r.status]||'#6b7280'}}>{r.status?.replace('_',' ')}</span>
                                    </div>
                                    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 3px'}}>{r.title}</h3>
                                    <p style={{fontSize:12,color:'#6b7280',margin:'0 0 8px'}}>
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}
                                        >
                                            📍 {r.location} <span style={{ fontSize: 10, color: '#2563eb', marginLeft: 4 }}>(View Map)</span>
                                        </a>
                                    </p>
                                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                                        <span style={{...S.badge,background:sevColor[r.severity]||'#6b7280'}}>{r.severity}</span>
                                        <span style={{fontSize:12,color:'#6b7280',background:'#f3f4f6',padding:'2px 8px',borderRadius:4}}>{r.damageType?.replace('_',' ')}</span>
                                    </div>
                                    {r.description && <p style={{fontSize:13,color:'#555',margin:'0 0 8px'}}>{r.description}</p>}
                                    {r.photoUrls && r.photoUrls.length > 0 && (
                                        <div style={{ marginBottom: 12, cursor: 'pointer', position: 'relative' }} onClick={() => { setSelectedPhotos(r.photoUrls); setPhotoIndex(0); }}>
                                            <img src={r.photoUrls[0]} alt={r.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
                                            {r.photoUrls.length > 1 && (
                                                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                                                    +{r.photoUrls.length - 1} More Photo{r.photoUrls.length > 2 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {r.status === 'PENDING' && (
                                        <button style={{...S.btn, background:'#2563eb'}} onClick={() => handleStatusUpdate(r.id, 'IN_PROGRESS')}>
                                            Mark In Progress
                                        </button>
                                    )}
                                    {r.status === 'IN_PROGRESS' && (
                                        <div style={{marginTop:8,marginBottom:4}}>
                                            {/* Milestone stepper */}
                                            <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:6}}>
                                                {PROGRESS_STAGES.map((stage, i) => {
                                                    const prog = r.recoveryProgress || 0;
                                                    const done = prog >= stage.value;
                                                    const active = prog < stage.value && (i === 0 || prog >= PROGRESS_STAGES[i-1].value);
                                                    return (
                                                        <React.Fragment key={stage.value}>
                                                            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:'0 0 auto'}}>
                                                                <div style={{
                                                                    width:26,height:26,borderRadius:'50%',
                                                                    background: done ? '#2563eb' : active ? '#93c5fd' : '#e5e7eb',
                                                                    border: done ? '2px solid #1d4ed8' : active ? '2px solid #3b82f6' : '2px solid #d1d5db',
                                                                    display:'flex',alignItems:'center',justifyContent:'center',
                                                                    fontSize:10,color: done ? 'white' : '#6b7280',fontWeight:700,boxSizing:'border-box'
                                                                }}>
                                                                    {done ? '✓' : `${i+1}`}
                                                                </div>
                                                                <span style={{fontSize:8,color: done ? '#1d4ed8' : active ? '#3b82f6' : '#9ca3af',fontWeight: done ? 700 : 500,textAlign:'center',marginTop:2,maxWidth:50,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                                                    {stage.label.split('– ')[1]}
                                                                </span>
                                                            </div>
                                                            {i < PROGRESS_STAGES.length - 1 && (
                                                                <div style={{flex:1,height:3,background: prog >= PROGRESS_STAGES[i+1].value ? '#2563eb' : prog >= stage.value ? '#93c5fd' : '#e5e7eb',marginBottom:12,transition:'background 0.3s'}} />
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                            {/*<div style={{background:'#e5e7eb',borderRadius:6,height:7,overflow:'hidden'}}>*/}
                                            {/*    <div style={{background:'linear-gradient(90deg,#3b82f6,#1d4ed8)',height:'100%',width:`${r.recoveryProgress||0}%`,borderRadius:6,transition:'width 0.5s ease'}} />*/}
                                            {/*</div>*/}
                                            {/*<span style={{fontSize:11,color:'#6b7280',marginTop:3,display:'block'}}>{getStageLabel(r.recoveryProgress||0)}</span>*/}
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
                        {submitMsg === 'success' && <div style={S.successBox}>✅ Report submitted successfully!</div>}
                        {submitMsg === 'error' && <div style={S.errorBox}>❌ Failed to submit. Try again.</div>}
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
                                            style={{ ...S.btn, background: '#2563eb', padding: '8px 16px' }}
                                            onClick={handleSearch}
                                        >
                                            Search
                                        </button>
                                    </div>
                                    {searchError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>⚠️ {searchError}</div>}
                                    <div 
                                        ref={mapRef} 
                                        style={{ 
                                            width: '100%', 
                                            height: '250px', 
                                            borderRadius: '8px', 
                                            border: '1.5px solid #e5e7eb',
                                            marginBottom: 8 
                                        }} 
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
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
                                <button style={{...S.btn,background:'#2d5a27',width:'100%',padding:13,fontSize:15,fontWeight:700}} type="submit">
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
                                            background: idx === photoIndex ? '#2d5a27' : '#d1d5db'
                                        }}
                                        onClick={() => setPhotoIndex(idx)}
                                    />
                                ))}
                            </div>
                        )}
                        <div style={{ textAlign: 'center', marginTop: 8, color: '#6b7280', fontSize: 12, fontWeight: 600 }}>
                            {photoIndex + 1} / {selectedPhotos.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children, style }) {
    return (
        <div style={{ marginBottom:14, ...style }}>
            <label style={{display:'block',fontSize:13,fontWeight:500,color:'#444',marginBottom:5}}>{label}</label>
            {children}
        </div>
    );
}

const S = {
    tabBar: {display:'flex',background:'white',borderRadius:10,padding:4,gap:4,marginBottom:20,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'},
    tab: {flex:1,padding:'10px',border:'none',background:'none',color:'#6b7280',fontSize:13,borderRadius:8},
    tabActive: {flex:1,padding:'10px',border:'none',background:'#2d5a27',color:'white',fontSize:13,fontWeight:700,borderRadius:8},
    title: {fontSize:20,fontWeight:700,margin:'0 0 16px',color:'#111'},
    card: {background:'white',borderRadius:10,padding:16,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'},
    badge: {fontSize:11,color:'white',padding:'3px 9px',borderRadius:20,fontWeight:600},
    btn: {padding:'7px 16px',border:'none',borderRadius:7,color:'white',fontSize:13,fontWeight:600,cursor:'pointer'},
    formCard: {background:'white',borderRadius:10,padding:20,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'},
    input: {width:'100%',padding:'11px 13px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:14,background:'#fafafa',fontFamily:'inherit',boxSizing:'border-box'},
    successBox: {background:'#dcfce7',color:'#166534',padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13},
    errorBox: {background:'#fee2e2',color:'#991b1b',padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13},
    
    // Modal & Slider Styles
    modalOverlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: 16
    },
    modalContent: {
        background: 'white', borderRadius: 12, padding: '30px 20px 20px', maxWidth: 600,
        width: '100%', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    },
    modalClose: {
        position: 'absolute', top: 12, right: 12, background: '#f3f4f6',
        border: 'none', borderRadius: '50%', width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontWeight: 'bold', color: '#4b5563', zIndex: 10
    },
    sliderContainer: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', minHeight: 250, background: '#f3f4f6',
        borderRadius: 8, overflow: 'hidden', marginTop: 10
    },
    sliderImg: {
        maxWidth: '100%', maxHeight: 400, objectFit: 'contain'
    },
    navBtnLeft: {
        position: 'absolute', left: 10, background: 'rgba(255,255,255,0.85)',
        border: 'none', borderRadius: '50%', width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', fontWeight: 'bold', zIndex: 10
    },
    navBtnRight: {
        position: 'absolute', right: 10, background: 'rgba(255,255,255,0.85)',
        border: 'none', borderRadius: '50%', width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', fontWeight: 'bold', zIndex: 10
    },
    sliderDots: {
        display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12
    },
    sliderDot: {
        width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s'
    }
};