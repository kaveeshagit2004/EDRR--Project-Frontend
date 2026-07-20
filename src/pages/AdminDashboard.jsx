import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllReports, updateReportStatus, updateReportProgress, getReportStats } from '../api/api';

const NAV_GA = [
    { path: '/admin-ga', icon: '📊', label: 'Overview' },
    { path: '/admin-ga/reports', icon: '📋', label: 'View Reports' },
    { path: '/admin-ga/final', icon: '📄', label: 'Final Reports' },
    { path: '/admin-ga/feedback', icon: '💬', label: 'Citizen Feedback' },
    { path: '/admin-ga/profile', icon: '👤', label: 'Profile' },
];

const NAV_RDA = [
    { path: '/admin-rda', icon: '📊', label: 'Overview' },
    { path: '/admin-rda/reports', icon: '📋', label: 'Damage Reports' },
    { path: '/admin-rda/recovery', icon: '🔧', label: 'Recovery Progress' },
    { path: '/admin-rda/final', icon: '📄', label: 'Final Reports' },
    { path: '/admin-rda/profile', icon: '👤', label: 'Profile' },
];

export default function AdminDashboard({ type = 'GA' }) {
    const [tab, setTab] = useState('overview');
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [photoIndex, setPhotoIndex] = useState(0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isGA = type === 'GA';

    useEffect(() => {
        Promise.all([getAllReports(), getReportStats()])
            .then(([r, s]) => { setReports(r.data); setStats(s.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const reload = () => Promise.all([getAllReports(), getReportStats()])
        .then(([r, s]) => { setReports(r.data); setStats(s.data); });

    const handleStatus = async (id, status) => {
        const notes = prompt(`Notes for "${status}" (optional):`) || '';
        try { await updateReportStatus(id, status, notes); reload(); }
        catch { alert('Failed to update'); }
    };

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

    const handleProgress = async (id, value) => {
        try { await updateReportProgress(id, value); reload(); }
        catch { alert('Failed to update progress'); }
    };

    const sevColor = { CRITICAL:'#dc2626', HIGH:'#ea580c', MEDIUM:'#d97706', LOW:'#059669' };
    const statColor = { PENDING:'#d97706', IN_PROGRESS:'#2563eb', RESOLVED:'#059669', REJECTED:'#dc2626' };
    const filtered = filter==='ALL' ? reports : reports.filter(r=>r.status===filter);

    if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading...</div>;

    return (
        <div style={{ minHeight:'100vh', background:'#f0f2f5', fontFamily:'inherit' }}>
            <Sidebar role={isGA ? 'GA Admin' : 'RDA/DMC Admin'} links={isGA ? NAV_GA : NAV_RDA} />
            <div style={{ padding:16, maxWidth:900, margin:'0 auto' }}>

                <div style={S.tabBar}>
                    {[['overview','📊 Overview'],['reports','📋 Reports']].map(([k,l])=>(
                        <button key={k} style={tab===k?S.tabActive:S.tab} onClick={()=>setTab(k)}>{l}</button>
                    ))}
                </div>

                {/* ── OVERVIEW ── */}
                {tab === 'overview' && (
                    <div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                            <h2 style={S.title}>Dashboard Overview</h2>
                            <span style={{fontSize:12,color:'#9ca3af'}}>{isGA ? 'Government Agent Portal' : 'RDA/DMC Portal'}</span>
                        </div>

                        <div style={S.statsGrid}>
                            {[
                                { label:'Total Reports', val:stats.total||0, icon:'📋', color:'#2d5a27', sub:'All time' },
                                { label:'Pending', val:stats.pending||0, icon:'⏳', color:'#d97706', sub:'Awaiting action' },
                                { label:'In Progress', val:stats.inProgress||0, icon:'🔧', color:'#2563eb', sub:'Being reported' },
                                { label:'Resolved', val:stats.resolved||0, icon:'✅', color:'#059669', sub:'Fixed this month' },
                            ].map(s=>(
                                <div key={s.label} style={S.statCard}>
                                    <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
                                    <div style={{fontSize:32,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                                    <div style={{fontSize:13,fontWeight:600,color:'#111',marginTop:4}}>{s.label}</div>
                                    <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{s.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* Quick actions for pending */}
                        <div style={S.panel}>
                            <h3 style={S.panelTitle}>⚡ Pending Reports — Quick Actions</h3>
                            {reports.filter(r=>r.status==='PENDING').slice(0,5).map(r=>(
                                <div key={r.id} style={S.panelRow}>
                                    <div style={{flex:1}}>
                                        <span style={{fontSize:11,color:'#9ca3af',fontFamily:'monospace'}}>{r.reportNumber} </span>
                                        <span style={{fontSize:14,fontWeight:600}}>{r.title}</span>
                                        <span style={{...S.badge,background:sevColor[r.severity]||'#6b7280',marginLeft:8}}>{r.severity}</span>
                                    </div>
                                    <div style={{display:'flex',gap:6}}>
                                        <button style={{...S.btn,background:'#059669'}} onClick={()=>handleStatus(r.id,'IN_PROGRESS')}>Approve</button>
                                        <button style={{...S.btn,background:'#dc2626'}} onClick={()=>handleStatus(r.id,'REJECTED')}>Reject</button>
                                    </div>
                                </div>
                            ))}
                            {reports.filter(r=>r.status==='PENDING').length===0 && (
                                <p style={{color:'#9ca3af',fontSize:13,textAlign:'center',padding:'20px 0'}}>No pending reports</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── REPORTS ── */}
                {tab === 'reports' && (
                    <div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                            <h2 style={S.title}>Damage Reports ({filtered.length})</h2>
                            <select style={S.select} value={filter} onChange={e=>setFilter(e.target.value)}>
                                {['ALL','PENDING','IN_PROGRESS','RESOLVED','REJECTED'].map(v=>(
                                    <option key={v} value={v}>{v==='ALL'?'All Status':v.replace('_',' ')}</option>
                                ))}
                            </select>
                        </div>

                        {filtered.length === 0
                            ? <div style={{textAlign:'center',color:'#9ca3af',padding:60}}>No reports found.</div>
                            : filtered.map(r=>(
                                <div key={r.id} style={S.reportCard}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                                        <div>
                                            <span style={{fontSize:11,color:'#9ca3af',fontFamily:'monospace'}}>{r.reportNumber}</span>
                                            <span style={{...S.badge,background:statColor[r.status]||'#6b7280',marginLeft:8}}>{r.status?.replace('_',' ')}</span>
                                        </div>
                                        <span style={{...S.badge,background:sevColor[r.severity]||'#6b7280'}}>{r.severity}</span>
                                    </div>
                                    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 4px'}}>{r.title}</h3>
                                    <p style={{fontSize:12,color:'#6b7280',margin:'0 0 6px'}}>
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}
                                        >
                                            📍 {r.location} <span style={{ fontSize: 10, color: '#2563eb', marginLeft: 4 }}>(View Map)</span>
                                        </a>
                                    </p>
                                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                                        <span style={{fontSize:12,color:'#6b7280',background:'#f3f4f6',padding:'2px 8px',borderRadius:4}}>{r.damageType?.replace('_',' ')}</span>
                                        {r.reporterName && <span style={{fontSize:12,color:'#6b7280'}}>By: {r.reporterName}</span>}
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
                                    {r.adminNotes && (
                                        <div style={{background:'#eff6ff',borderRadius:7,padding:'7px 10px',fontSize:12,color:'#1d4ed8',marginBottom:8}}>
                                            📝 {r.adminNotes}
                                        </div>
                                    )}
                                    {r.status==='IN_PROGRESS' && (
                                        <div style={{marginBottom:12}}>
                                            {/* Stage buttons row — acts as both selector and stepper */}
                                            <div style={{fontSize:11,color:'#9ca3af',marginBottom:6,fontWeight:500}}>Recovery Progress</div>
                                            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                                                {PROGRESS_STAGES.map((stage, i) => {
                                                    const prog = r.recoveryProgress || 0;
                                                    const isCurrent = prog === stage.value;
                                                    const isDone    = prog > stage.value;
                                                    return (
                                                        <button
                                                            key={stage.value}
                                                            onClick={() => handleProgress(r.id, stage.value)}
                                                            style={{
                                                                display:'flex',alignItems:'center',gap:5,
                                                                padding:'6px 12px',cursor:'pointer',
                                                                borderRadius:20,fontSize:11,fontWeight:600,
                                                                transition:'all 0.18s',
                                                                border: isCurrent ? '2px solid #2563eb'
                                                                      : isDone    ? '2px solid #bbf7d0'
                                                                      :             '1.5px solid #e5e7eb',
                                                                background: isCurrent ? '#2563eb'
                                                                          : isDone    ? '#f0fdf4'
                                                                          :             'white',
                                                                color:      isCurrent ? 'white'
                                                                          : isDone    ? '#15803d'
                                                                          :             '#9ca3af',
                                                                boxShadow: isCurrent ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                                                            }}
                                                        >
                                                            <span style={{
                                                                width:16,height:16,borderRadius:'50%',
                                                                display:'inline-flex',alignItems:'center',justifyContent:'center',
                                                                fontSize:9,fontWeight:800,flexShrink:0,
                                                                background: isCurrent ? 'rgba(255,255,255,0.25)'
                                                                          : isDone    ? '#86efac'
                                                                          :             '#f3f4f6',
                                                                color:      isCurrent ? 'white'
                                                                          : isDone    ? '#15803d'
                                                                          :             '#d1d5db',
                                                            }}>{isDone ? '✓' : stage.value / 20}</span>
                                                            {stage.label.split('– ')[1]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                                        {r.status==='PENDING' && <>
                                            <button style={{...S.btn,background:'#059669'}} onClick={()=>handleStatus(r.id,'IN_PROGRESS')}>✓ Approve</button>
                                            <button style={{...S.btn,background:'#dc2626'}} onClick={()=>handleStatus(r.id,'REJECTED')}>✗ Reject</button>
                                        </>}
                                        {r.status==='IN_PROGRESS' && (
                                            <button style={{...S.btn,background:'#059669'}} onClick={()=>handleStatus(r.id,'RESOLVED')}>✓ Mark Resolved</button>
                                        )}
                                    </div>
                                </div>
                            ))
                        }
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
                                            background: idx === photoIndex ? '#1a2c4a' : '#d1d5db'
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

const S = {
    tabBar: {display:'flex',background:'white',borderRadius:10,padding:4,gap:4,marginBottom:20,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'},
    tab: {flex:1,padding:'10px',border:'none',background:'none',color:'#6b7280',fontSize:13,borderRadius:8},
    tabActive: {flex:1,padding:'10px',border:'none',background:'#1a2c4a',color:'white',fontSize:13,fontWeight:700,borderRadius:8},
    title: {fontSize:20,fontWeight:700,margin:0,color:'#111'},
    statsGrid: {display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20},
    statCard: {background:'white',borderRadius:10,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',textAlign:'center'},
    panel: {background:'white',borderRadius:10,padding:18,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'},
    panelTitle: {fontSize:15,fontWeight:700,margin:'0 0 14px',color:'#111'},
    panelRow: {display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #f3f4f6'},
    reportCard: {background:'white',borderRadius:10,padding:16,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'},
    badge: {fontSize:11,color:'white',padding:'3px 9px',borderRadius:20,fontWeight:600},
    btn: {padding:'6px 14px',border:'none',borderRadius:7,color:'white',fontSize:12,fontWeight:600,cursor:'pointer'},
    select: {padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:13,background:'white'},
    
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
        display: 'flex', alignItems: 'center', justifycontent: 'center',
        cursor: 'pointer', fontWeight: 'bold', color: '#4b5563', zIndex: 10
    },
    sliderContainer: {
        display: 'flex', alignItems: 'center', justifycontent: 'center',
        position: 'relative', minHeight: 250, background: '#f3f4f6',
        borderRadius: 8, overflow: 'hidden', marginTop: 10
    },
    sliderImg: {
        maxWidth: '100%', maxHeight: 400, objectFit: 'contain'
    },
    navBtnLeft: {
        position: 'absolute', left: 10, background: 'rgba(255,255,255,0.85)',
        border: 'none', borderRadius: '50%', width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifycontent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', fontWeight: 'bold', zIndex: 10
    },
    navBtnRight: {
        position: 'absolute', right: 10, background: 'rgba(255,255,255,0.85)',
        border: 'none', borderRadius: '50%', width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifycontent: 'center',
        cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', fontWeight: 'bold', zIndex: 10
    },
    sliderDots: {
        display: 'flex', justifycontent: 'center', gap: 6, marginTop: 12
    },
    sliderDot: {
        width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s'
    }
};