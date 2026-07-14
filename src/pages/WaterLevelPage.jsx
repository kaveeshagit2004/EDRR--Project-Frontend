import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllWaterLevels, updateWaterLevel } from '../api/api';

const NAV = [
    { path: '/water', icon: '🏠', label: 'Home' },
    { path: '/water/levels', icon: '💧', label: 'Water Monitor' },
    { path: '/water/map', icon: '🗺️', label: 'Map' },
    { path: '/water/alerts', icon: '🔔', label: 'Alerts' },
    { path: '/water/profile', icon: '👤', label: 'Profile' },
];

export default function WaterLevelPage() {
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        getAllWaterLevels().then(r => setLevels(r.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    const reload = () => getAllWaterLevels().then(r => setLevels(r.data));

    const handleUpdate = async (wl) => {
        const newLevel = prompt(`Update: ${wl.locationName}\nCurrent: ${wl.currentLevel}m\nEnter new level (m):`);
        if (!newLevel || isNaN(parseFloat(newLevel))) return;
        try {
            await updateWaterLevel(wl.id, {
                currentLevel: parseFloat(newLevel),
                maximumLimit: wl.maximumLimit,
                officerId: user.id,
                officerName: user.fullName,
                notes: '',
            });
            setMsg('✅ Water level updated successfully!');
            reload();
            setTimeout(() => setMsg(''), 3000);
        } catch { setMsg('❌ Update failed. Try again.'); }
    };

    const getColor = (s) => ({ NORMAL:'#059669', WARNING:'#d97706', CRITICAL:'#dc2626' }[s] || '#6b7280');

    if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading...</div>;

    return (
        <div style={{ minHeight:'100vh', background:'#f0f2f5', fontFamily:'inherit' }}>
            <Sidebar role="Irrigation Officer" links={NAV} />
            <div style={{ padding:16, maxWidth:700, margin:'0 auto' }}>
                <h2 style={{fontSize:20,fontWeight:700,margin:'0 0 4px',color:'#111'}}>Water Level Management</h2>
                <p style={{fontSize:13,color:'#9ca3af',marginBottom:16}}>Monitor and Update Levels</p>

                {msg && (
                    <div style={{background:msg.includes('✅')?'#dcfce7':'#fee2e2',color:msg.includes('✅')?'#166534':'#991b1b',padding:'10px 14px',borderRadius:8,marginBottom:14,fontSize:13}}>
                        {msg}
                    </div>
                )}

                {/* Summary row */}
                <div style={{display:'flex',gap:10,marginBottom:20}}>
                    {[
                        { label:'Normal', val:levels.filter(l=>l.status==='NORMAL').length, color:'#059669' },
                        { label:'Warning', val:levels.filter(l=>l.status==='WARNING').length, color:'#d97706' },
                        { label:'Critical', val:levels.filter(l=>l.status==='CRITICAL').length, color:'#dc2626' },
                    ].map(s=>(
                        <div key={s.label} style={{flex:1,background:'white',borderRadius:10,padding:'14px 10px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
                            <div style={{fontSize:26,fontWeight:800,color:s.color}}>{s.val}</div>
                            <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{s.label}</div>
                        </div>
                    ))}
                </div>

                <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>Current Water Levels (Live)</h3>

                {levels.length === 0 ? (
                    <div style={{textAlign:'center',color:'#9ca3af',padding:60,background:'white',borderRadius:10}}>
                        <div style={{fontSize:36,marginBottom:12}}>💧</div>
                        <p>No water locations added yet.</p>
                        <p style={{fontSize:12,marginTop:4}}>Add locations via Postman: POST /api/water-levels</p>
                    </div>
                ) : (
                    levels.map(wl => {
                        const color = getColor(wl.status);
                        const pct = Math.min(wl.percentageOfMax || 0, 100);
                        return (
                            <div key={wl.id} style={{background:'white',borderRadius:10,padding:16,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.07)',borderLeft:`4px solid ${color}`}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                                    <div>
                                        <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 2px'}}>{wl.locationName}</h3>
                                        <p style={{fontSize:12,color:'#9ca3af',margin:0}}>📍 {wl.district} District</p>
                                    </div>
                                    <span style={{fontSize:11,color:'white',padding:'4px 10px',borderRadius:20,fontWeight:700,background:color}}>{wl.status}</span>
                                </div>

                                <div style={{display:'flex',gap:24,marginBottom:12}}>
                                    {[['Current Level',`${wl.currentLevel} m`],['Max Limit',`${wl.maximumLimit} m`],['Trend',wl.trend],['Percentage',`${wl.percentageOfMax}%`]].map(([l,v])=>(
                                        <div key={l}>
                                            <div style={{fontSize:11,color:'#9ca3af'}}>{l}</div>
                                            <div style={{fontSize:16,fontWeight:700,color:'#111'}}>{v}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{background:'#e5e7eb',borderRadius:4,height:8,overflow:'hidden',marginBottom:6}}>
                                    <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:4,transition:'width 0.3s'}} />
                                </div>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                    <span style={{fontSize:11,color:'#9ca3af'}}>{wl.percentageOfMax}% of maximum limit</span>
                                    <button
                                        style={{padding:'7px 16px',background:'#1a3a4a',color:'white',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer'}}
                                        onClick={() => handleUpdate(wl)}>
                                        💧 Update Level
                                    </button>
                                </div>
                                {wl.officerNotes && (
                                    <p style={{fontSize:12,color:'#6b7280',marginTop:8,borderTop:'1px solid #f3f4f6',paddingTop:8}}>
                                        Note: {wl.officerNotes}
                                    </p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}