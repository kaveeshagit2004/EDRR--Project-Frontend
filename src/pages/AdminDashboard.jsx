import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import WeatherCard from '../components/WeatherCard';
import {
    getAllReports,
    updateReportStatus,
    updateReportProgress,
    getReportStats,
    deleteReport,
    getDeletedReports,
    getDamageReportingStatus,
    setDamageReportingStatus,
    getPublicReportStats
} from '../api/api';
import RecoveryProgressBar from '../components/RecoveryProgressBar';
import { NAV_GA_ADMIN, GA_ADMIN_ROLE_LABEL, NAV_RDA_ADMIN, RDA_ADMIN_ROLE_LABEL } from '../utils/adminNav';
import { canDeleteReports } from '../utils/reportPermissions';
import RecycleBin, { RecycleBinIcon } from '../components/RecycleBin';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';
import GAAnnouncementCard from '../components/GAAnnouncementCard';

export default function AdminDashboard({ type = 'GA', initialTab = 'overview' }) {
    const [tab, setTab] = useState(initialTab);
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [selectedPhotos, setSelectedPhotos] = useState(null);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [announcementTrigger, setAnnouncementTrigger] = useState(0);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isGA = type === 'GA';
    // Delete + recycle bin are for the GA only on this page (RDA admins never see them).
    const canDelete = isGA && canDeleteReports(user);
    const [showBin, setShowBin] = useState(false);
    const [binCount, setBinCount] = useState(0);

    // Citizen Damage Reporting Portal Access Control (GA Admin)
    const [reportingOpen, setReportingOpen] = useState(false);
    const [togglingReporting, setTogglingReporting] = useState(false);
    const [reportingInfo, setReportingInfo] = useState(null);
    const [publicStats, setPublicStats] = useState({ total: 0, viewed: 0, pending: 0 });

    const loadReportingStatus = () => {
        getDamageReportingStatus()
            .then(res => {
                if (res.data) {
                    setReportingOpen(Boolean(res.data.open));
                    setReportingInfo(res.data);
                    localStorage.setItem('edrr_damage_reporting_open', Boolean(res.data.open));
                }
            })
            .catch(() => {});
        getPublicReportStats()
            .then(res => setPublicStats(res.data || {}))
            .catch(() => {});
    };

    const handleToggleReporting = async () => {
        const nextState = !reportingOpen;
        const confirmMsg = nextState
            ? 'Are you sure you want to OPEN the "Report Damage" portal for citizens?\n\nThe tab will immediately become visible to citizens to submit emergency damage reports.'
            : 'Are you sure you want to CLOSE the "Report Damage" portal for citizens?\n\nThe tab will be closed in citizen views and new submissions will be paused.';
        if (!window.confirm(confirmMsg)) return;

        setTogglingReporting(true);
        try {
            const res = await setDamageReportingStatus(nextState);
            setReportingOpen(Boolean(res.data?.open));
            setReportingInfo(res.data);
            localStorage.setItem('edrr_damage_reporting_open', Boolean(res.data?.open));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update citizen reporting status');
        } finally {
            setTogglingReporting(false);
        }
    };

    const loadBinCount = () => {
        if (!canDelete) return;
        getDeletedReports()
            .then(res => setBinCount(Array.isArray(res.data) ? res.data.length : 0))
            .catch(() => setBinCount(0));
    };

    useEffect(() => {
        Promise.all([getAllReports(), getReportStats()])
            .then(([r, s]) => { setReports(r.data); setStats(s.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
        loadBinCount();
        loadReportingStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reload = () => {
        Promise.all([getAllReports(), getReportStats()])
            .then(([r, s]) => { setReports(r.data); setStats(s.data); });
        loadReportingStatus();
    };

    const handleStatus = async (id, status) => {
        let notes = '';
        if (status === 'RESOLVED') {
            notes = prompt('Notes for marking as resolved (optional):') || '';
        }
        try {
            await updateReportStatus(id, status, notes);
            if (status === 'RESOLVED') {
                await updateReportProgress(id, 100);
            } else if (status === 'PENDING') {
                await updateReportProgress(id, 0);
            } else if (status === 'IN_PROGRESS') {
                await updateReportProgress(id, 60);
            }
            reload();
        } catch {
            alert('Failed to update status');
        }
    };



    const handleDelete = async (r) => {
        if (!window.confirm(`Move "${r.title}" (${r.reportNumber || `#${r.id}`}) to the recycle bin?\nYou can restore it later from the recycle bin.`)) return;
        try { await deleteReport(r.id); await reload(); loadBinCount(); }
        catch { alert('Failed to delete the report'); }
    };

    const handleProgress = async (id, value) => {
        try { await updateReportProgress(id, value); reload(); }
        catch { alert('Failed to update progress'); }
    };

    const sevColor = { CRITICAL:'#8EB69B', HIGH:'#8EB69B', MEDIUM:'#8EB69B', LOW:'#8EB69B' };
    const statColor = { IN_PROGRESS:'#8EB69B', RESOLVED:'#8EB69B', REJECTED:'#8EB69B' };
    const filtered = filter==='ALL' ? reports : reports.filter(r=>r.status===filter);

    if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading...</div>;

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={isGA ? GA_ADMIN_ROLE_LABEL : RDA_ADMIN_ROLE_LABEL} links={isGA ? NAV_GA_ADMIN : NAV_RDA_ADMIN} />
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth:1180, margin:'0 auto' }}>

                {/* Main Heading and Sub Heading */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                    <div>
                        <h2 style={S.title}>Dashboard Overview</h2>
                        <p style={{fontSize:13,color:'#235347',margin:'4px 0 0'}}>
                            {isGA ? 'Government Agent Portal · Monitor damage reports, river levels, and regional recovery' : 'RDA Portal · Road development and infrastructure damage management'}
                        </p>
                    </div>
                    <span style={{fontSize:12,color:'#235347',fontWeight:600}}>{isGA ? 'Government Agent Portal' : 'RDA Portal'}</span>
                </div>

                {/* Live Alert Announcement Banner (Displayed under main heading and sub heading for non-GA dashboards; suppressed in GA Admin portal) */}
                {!isGA && <AlertAnnouncementBanner refreshTrigger={announcementTrigger} hideForGA={true} />}

                <div style={S.tabBar}>
                    {[
                        ['overview', ' Overview'],
                        ['reports', 'Reports'],
                        ...(isGA ? [['announcements', ' Alert Announcements']] : []),
                        ...(canDelete ? [['bin', `Recycle Bin${binCount > 0 ? ` (${binCount})` : ''}`]] : [])
                    ].map(([k,l])=>(
                        <button key={k} style={tab===k?S.tabActive:S.tab} onClick={()=>{
                            setTab(k);
                            if (k === 'bin') setShowBin(true);
                            else setShowBin(false);
                        }}>{l}</button>
                    ))}
                </div>

                {/* ── OVERVIEW ── */}
                {tab === 'overview' && (
                    <div>

                        <div style={S.statsGrid}>
                            {[
                                { label:'Total Reports', val:stats.total||0, color:'#0B2B26', sub:'All time' },
                                { label:'In Progress', val:stats.inProgress||0, color:'#0B2B26', sub:'Being reported' },
                                { label:'Resolved', val:stats.resolved||0, color:'#0B2B26', sub:'Fixed this month' },
                            ].map(s=>(
                                <div key={s.label} style={S.statCard}>
                                    <div style={{fontSize:32,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                                    <div style={{fontSize:13,fontWeight:600,color:'#0B2B26',marginTop:4}}>{s.label}</div>
                                    <div style={{fontSize:12,color:'#235347',marginTop:2}}>{s.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* ── CITIZEN REPORT DAMAGE ACCESS CONTROLLER (GA ADMIN) ── */}
                        {isGA && (
                            <div style={{
                                background: reportingOpen ? '#ffffff' : '#fcfbf7',
                                border: `2px solid ${reportingOpen ? '#235347' : '#d97706'}`,
                                borderRadius: 12,
                                padding: '18px 22px',
                                marginTop: 16,
                                marginBottom: 16,
                                boxShadow: '0 2px 10px rgba(11,43,38,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 16
                            }}>
                                <div style={{ flex: '1 1 320px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: 22 }}>{reportingOpen ? '🟢' : '🔒'}</span>
                                        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0B2B26', margin: 0 }}>
                                            Citizen Damage Reporting Portal Access
                                        </h3>
                                        <span style={{
                                            fontSize: 12,
                                            fontWeight: 800,
                                            padding: '3px 10px',
                                            borderRadius: 999,
                                            background: reportingOpen ? '#235347' : '#fee2e2',
                                            color: reportingOpen ? '#DAF1DE' : '#991b1b',
                                            border: `1px solid ${reportingOpen ? '#235347' : '#fca5a5'}`
                                        }}>
                                            {reportingOpen ? 'ACTIVE · OPEN FOR CITIZENS' : 'CLOSED · INACTIVE'}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 13, color: '#235347', margin: 0, lineHeight: 1.5 }}>
                                        {reportingOpen
                                            ? 'Citizens can currently see the "Report Damage" tab and submit emergency environmental damage reports through the citizen portal.'
                                            : 'The "Report Damage" tab is currently closed for citizens. Activate this tab only when the GA Admin decides to open public damage reporting.'}
                                    </p>
                                    {reportingInfo?.updatedAt && (
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                                            Last updated: {new Date(reportingInfo.updatedAt).toLocaleString()} {reportingInfo.updatedBy ? `by ${reportingInfo.updatedBy}` : ''}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button
                                        type="button"
                                        onClick={handleToggleReporting}
                                        disabled={togglingReporting}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: 8,
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: togglingReporting ? 'not-allowed' : 'pointer',
                                            border: 'none',
                                            background: reportingOpen ? '#dc2626' : '#235347',
                                            color: '#ffffff',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}
                                    >
                                        {togglingReporting ? 'Updating...' : reportingOpen ? '🔒 Close Damage Reporting for Citizens' : '🔓 Open Damage Reporting for Citizens'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── PUBLIC DAMAGE REPORTS OVERVIEW (RDA ADMIN) ── */}
                        {!isGA && (
                            <div style={{
                                background: '#ffffff',
                                border: '2px solid #8EB69B',
                                borderRadius: 12,
                                padding: '16px 20px',
                                marginTop: 16,
                                marginBottom: 16,
                                boxShadow: '0 2px 8px rgba(11,43,38,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 14
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 20 }}>📋</span>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0B2B26', margin: 0 }}>
                                            Public Citizen Damage Reports (RDA / DMC Review)
                                        </h3>
                                    </div>
                                    <p style={{ fontSize: 13, color: '#235347', margin: 0 }}>
                                        <strong>{publicStats.pending || 0}</strong> report(s) awaiting RDA review · <strong>{publicStats.viewed || 0}</strong> marked as viewed by RDA/DMC Admin.
                                    </p>
                                </div>
                                <Link
                                    to="/admin-rda/public-reports"
                                    style={{
                                        padding: '9px 16px',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        background: '#235347',
                                        color: '#DAF1DE',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    Review Public Reports →
                                </Link>
                            </div>
                        )}

                        {/* Weather Forecast Card (Displayed for both GA and RDA Overview) */}
                        <div style={S.overviewWeatherRow}>
                            <WeatherCard />
                        </div>
                    </div>
                )}

                {/* ── ALERT ANNOUNCEMENTS TAB (GA ADMIN) ── */}
                {tab === 'announcements' && isGA && (
                    <div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                            <h2 style={S.title}>Alert Announcements &amp; Broadcasts</h2>
                            <span style={{fontSize:12,color:'#235347'}}>GA Admin Broadcasting Desk</span>
                        </div>
                        <GAAnnouncementCard onAnnouncementSent={() => setAnnouncementTrigger(prev => prev + 1)} />
                    </div>
                )}

                {/* ── RECYCLE BIN (Tab or modal view) ── */}
                {((tab === 'bin') || (tab === 'reports' && showBin)) && canDelete && (
                    <RecycleBin
                        onBack={() => { setTab('reports'); setShowBin(false); }}
                        onChanged={() => { reload(); loadBinCount(); }}
                    />
                )}

                {/* ── REPORTS ── */}
                {tab === 'reports' && !showBin && (
                    <div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:10}}>
                            <h2 style={S.title}>Damage Reports ({filtered.length})</h2>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                                {canDelete && (
                                    <button style={S.binBtn} title="Recycle Bin" aria-label="Open recycle bin" onClick={()=>{ setTab('bin'); setShowBin(true); }}>
                                        <RecycleBinIcon size={20} />
                                        {binCount > 0 && <span style={S.binBadge}>{binCount}</span>}
                                    </button>
                                )}
                                <select style={S.select} value={filter} onChange={e=>setFilter(e.target.value)}>
                                    {['ALL','IN_PROGRESS','RESOLVED','REJECTED'].map(v=>(
                                        <option key={v} value={v}>{v==='ALL'?'All Status':v.replace('_',' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {filtered.length === 0
                            ? <div style={{textAlign:'center',color:'#235347',padding:60}}>No reports found.</div>
                            : filtered.map(r=>(
                                <div key={r.id} style={S.reportCard}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                                        <div>
                                            <span style={{fontSize:12,color:'#235347',fontFamily:'monospace'}}>{r.reportNumber}</span>
                                            {r.status!=='PENDING' && <span style={{...S.badge,background:statColor[r.status]||'#8EB69B',marginLeft:8}}>{r.status?.replace('_',' ')}</span>}
                                        </div>
                                        <span style={{...S.badge,background:sevColor[r.severity]||'#8EB69B'}}>{r.severity}</span>
                                    </div>
                                    <h3 style={{fontSize:18,fontWeight:700,margin:'0 0 4px'}}>{r.title}</h3>
                                    <p style={{fontSize:12,color:'#235347',margin:'0 0 6px'}}>
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: '#235347', fontWeight: 500 }}
                                        >
                                            {r.location} <span style={{ fontSize: 11, color: '#235347', marginLeft: 4 }}>(View Map)</span>
                                        </a>
                                    </p>
                                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
                                        <span style={{fontSize:12,color:'#235347',background:'#DAF1DE',padding:'2px 8px',borderRadius:4}}>{r.damageType?.replace('_',' ')}</span>
                                        {r.reporterName && <span style={{fontSize:12,color:'#235347'}}>Reported by : {r.reporterName}</span>}
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
                                    {r.adminNotes && (
                                        <div style={{background:'#DAF1DE',borderRadius:7,padding:'7px 10px',fontSize:12,color:'#235347',marginBottom:8}}>
                                            {r.adminNotes}
                                        </div>
                                    )}
                                    <RecoveryProgressBar
                                        status={r.status}
                                        recoveryProgress={r.recoveryProgress}
                                        onStageChange={(newStatus) => handleStatus(r.id, newStatus)}
                                    />
                                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                                        {r.status==='PENDING' && (
                                            <button style={{...S.btn,background:'#235347'}} onClick={()=>handleStatus(r.id,'IN_PROGRESS')}>Start Recovery</button>
                                        )}
                                        {r.status==='IN_PROGRESS' && (
                                            <button style={{...S.btn,background:'#235347'}} onClick={()=>handleStatus(r.id,'RESOLVED')}>Mark Resolved</button>
                                        )}
                                        {canDelete && (
                                            <button style={S.btnDelete} onClick={()=>handleDelete(r)}>Delete</button>
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

const S = {
    tabBar: {display:'flex',background:'#DAF1DE',borderRadius:12,padding:4,gap:4,marginBottom:20,border:'1px solid #8EB69B',boxShadow:'0 2px 10px rgba(11,43,38,0.10)'},
    tab: {flex:1,padding:'10px',border:'none',background:'none',color:'#235347',fontSize:13,borderRadius:8,cursor:'pointer'},
    tabActive: {flex:1,padding:'10px',border:'none',background:'#235347',color:'#DAF1DE',fontSize:13,fontWeight:700,borderRadius:8,cursor:'pointer'},
    title: {fontSize:24,fontWeight:800,margin:0,color:'#0B2B26',textShadow:'none'},
    statsGrid: {display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20},
    overviewWeatherRow: {maxWidth:400,marginBottom:20},
    statCard: {background:'#DAF1DE',borderRadius:12,padding:18,border:'1px solid #8EB69B',boxShadow:'0 2px 10px rgba(11,43,38,0.10)',textAlign:'center',color:'#0B2B26'},
    panel: {background:'#DAF1DE',borderRadius:12,padding:18,border:'1px solid #8EB69B',boxShadow:'0 2px 10px rgba(11,43,38,0.10)',color:'#0B2B26'},
    panelTitle: {fontSize:18,fontWeight:700,margin:'0 0 14px',color:'#0B2B26'},
    panelRow: {display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #8EB69B'},
    reportCard: {background:'#DAF1DE',borderRadius:12,padding:18,marginBottom:10,border:'1px solid #8EB69B',boxShadow:'0 2px 10px rgba(11,43,38,0.10)',color:'#0B2B26'},
    badge: {fontSize:12,color:'#0B2B26',padding:'3px 9px',borderRadius:20,fontWeight:600},
    btn: {padding:'6px 14px',border:'1px solid #235347',borderRadius:9,background:'#235347',color:'#DAF1DE',fontSize:12,fontWeight:700,cursor:'pointer'},
    btnDelete: {padding:'6px 14px',border:'1px solid #0B2B26',borderRadius:9,background:'#DAF1DE',color:'#0B2B26',fontSize:12,fontWeight:700,cursor:'pointer',marginLeft:'auto'},
    binBtn: {position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:38,height:38,border:'1.5px solid #8EB69B',borderRadius:8,background:'#DAF1DE',color:'#235347',cursor:'pointer',padding:0},
    binBadge: {position:'absolute',top:-6,right:-6,minWidth:18,height:18,padding:'0 4px',borderRadius:9,background:'#235347',color:'#DAF1DE',fontSize:10,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box'},
    select: {padding:'8px 12px',border:'1.5px solid #8EB69B',borderRadius:8,fontSize:13,background:'#DAF1DE',color:'#0B2B26',outline:'none'},

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