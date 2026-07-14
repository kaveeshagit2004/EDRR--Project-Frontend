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
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [form, setForm] = useState({
        title:'', damageType:'FLOOD', location:'', severity:'MEDIUM',
        description:'', affectedArea:'', latitude:'', longitude:'',
        reporterName: user.fullName || '', reportedBy: user.id || '',
    });

    useEffect(() => {
        getAllReports()
            .then(r => setReports(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const reload = () => getAllReports().then(r => setReports(r.data)).catch(console.error);

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitMsg('');
        try {
            await createReport({ ...form, latitude: parseFloat(form.latitude)||0, longitude: parseFloat(form.longitude)||0 });
            setSubmitMsg('success');
            setForm({ ...form, title:'', location:'', description:'', affectedArea:'', latitude:'', longitude:'' });
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
                                    <p style={{fontSize:12,color:'#6b7280',margin:'0 0 8px'}}>📍 {r.location}</p>
                                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                                        <span style={{...S.badge,background:sevColor[r.severity]||'#6b7280'}}>{r.severity}</span>
                                        <span style={{fontSize:12,color:'#6b7280',background:'#f3f4f6',padding:'2px 8px',borderRadius:4}}>{r.damageType?.replace('_',' ')}</span>
                                    </div>
                                    {r.description && <p style={{fontSize:13,color:'#555',margin:'0 0 8px'}}>{r.description}</p>}
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
                                            <div style={{background:'#e5e7eb',borderRadius:6,height:7,overflow:'hidden'}}>
                                                <div style={{background:'linear-gradient(90deg,#3b82f6,#1d4ed8)',height:'100%',width:`${r.recoveryProgress||0}%`,borderRadius:6,transition:'width 0.5s ease'}} />
                                            </div>
                                            <span style={{fontSize:11,color:'#6b7280',marginTop:3,display:'block'}}>{getStageLabel(r.recoveryProgress||0)}</span>
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
                                <div style={{display:'flex',gap:10}}>
                                    <Field label="Latitude (GPS)" style={{flex:1}}>
                                        <input style={S.input} type="number" step="any" placeholder="5.9483"
                                               value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})} />
                                    </Field>
                                    <Field label="Longitude (GPS)" style={{flex:1}}>
                                        <input style={S.input} type="number" step="any" placeholder="80.5353"
                                               value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})} />
                                    </Field>
                                </div>
                                <Field label="Damage Description">
                  <textarea style={{...S.input,height:90,resize:'vertical'}}
                            placeholder="Describe what you see, safety concerns, and impact on the area..."
                            value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                                </Field>
                                <Field label="Estimated Affected Area">
                                    <input style={S.input} placeholder="e.g. 500 sq meters"
                                           value={form.affectedArea} onChange={e=>setForm({...form,affectedArea:e.target.value})} />
                                </Field>
                                <button style={{...S.btn,background:'#2d5a27',width:'100%',padding:13,fontSize:15,fontWeight:700}} type="submit">
                                    Submit Damage Report
                                </button>
                            </form>
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
};