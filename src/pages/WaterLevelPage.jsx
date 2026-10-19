import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllWaterLevels, updateWaterLevel, createWaterLevel } from '../api/api';
import { resolveSidebarNav } from '../utils/adminNav';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';
import { getWaterAlertInfo, getRecordAlertInfo, WATER_ALERT_COLORS } from '../utils/waterAlerts';
import WaterLevelChart from '../components/WaterLevelChart';

// Water-reading stations are assigned exclusively via the UserController at the time
// of registering an Irrigation Officer. Upon login, this page displays only the data
// for the water-reading station associated with the officer's email/account.
export default function WaterLevelPage() {
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [msgType, setMsgType] = useState('success');
    const [form, setForm] = useState({
        level: '',
        majorLevel: '',
        minorLevel: '',
        alertLevel: '',
        notes: ''
    });
    const [saving, setSaving] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { role: sidebarRole, links: sidebarLinks } = resolveSidebarNav(user);
    const assignedStation = (user.waterStation || '').trim();

    useEffect(() => {
        getAllWaterLevels()
            .then(r => setLevels(r.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const reload = () => getAllWaterLevels().then(r => setLevels(r.data || []));

    // Find the record for the assigned water-reading station
    const activeRecord = levels.find(l => {
        if (assignedStation && l.locationName) {
            return l.locationName.trim().toLowerCase() === assignedStation.toLowerCase();
        }
        if (!assignedStation && user.id) {
            return l.officerId === user.id || l.reportedBy === user.id || l.updatedBy === user.id;
        }
        return false;
    }) || null;

    // Sync form thresholds, current level, and notes with existing record
    useEffect(() => {
        if (activeRecord) {
            setForm(prev => ({
                level: prev.level !== '' ? prev.level : (activeRecord.currentLevel != null ? String(activeRecord.currentLevel) : ''),
                majorLevel: prev.majorLevel !== '' ? prev.majorLevel : (activeRecord.majorFloodLevel != null ? String(activeRecord.majorFloodLevel) : (activeRecord.maximumLimit != null ? String(activeRecord.maximumLimit) : '')),
                minorLevel: prev.minorLevel !== '' ? prev.minorLevel : (activeRecord.minorFloodLevel != null ? String(activeRecord.minorFloodLevel) : ''),
                alertLevel: prev.alertLevel !== '' ? prev.alertLevel : (activeRecord.alertWaterLevel != null ? String(activeRecord.alertWaterLevel) : ''),
                notes: prev.notes !== '' ? prev.notes : (activeRecord.officerNotes || ''),
            }));
        }
    }, [activeRecord]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const levelNum = parseFloat(form.level);
        const majorNum = parseFloat(form.majorLevel);
        const minorNum = parseFloat(form.minorLevel);
        const alertNum = parseFloat(form.alertLevel);

        if (isNaN(levelNum)) {
            setMsg('Please enter a valid water level (meters).');
            setMsgType('error');
            return;
        }

        const officerDisplayName = user.fullName || user.name || 'Irrigation Officer';
        const stationName = assignedStation || (activeRecord && activeRecord.locationName) || 'Assigned Water Station';
        setSaving(true);

        const payload = {
            currentLevel: levelNum,
            majorFloodLevel: !isNaN(majorNum) ? majorNum : (activeRecord?.majorFloodLevel || activeRecord?.maximumLimit || null),
            maximumLimit: !isNaN(majorNum) ? majorNum : (activeRecord?.maximumLimit || activeRecord?.majorFloodLevel || null),
            minorFloodLevel: !isNaN(minorNum) ? minorNum : (activeRecord?.minorFloodLevel || null),
            alertWaterLevel: !isNaN(alertNum) ? alertNum : (activeRecord?.alertWaterLevel || null),
            officerId: user.id,
            officerName: officerDisplayName,
            reportedBy: user.id,
            reporterName: officerDisplayName,
            updatedBy: user.id,
            updatedByName: officerDisplayName,
            notes: form.notes || '',
        };

        try {
            if (activeRecord && activeRecord.id) {
                // Update existing station record
                await updateWaterLevel(activeRecord.id, payload);
                setMsg(`Water level reading for "${stationName}" updated successfully!`);
            } else {
                // Initial recording for newly assigned station
                await createWaterLevel({
                    ...payload,
                    locationName: stationName,
                    district: 'Matara',
                });
                setMsg(`Initial reading for "${stationName}" created successfully!`);
            }

            setMsgType('success');
            // Keep the exact entered values in the form
            setForm(prev => ({
                ...prev,
                level: String(levelNum),
                majorLevel: !isNaN(majorNum) ? String(majorNum) : prev.majorLevel,
                minorLevel: !isNaN(minorNum) ? String(minorNum) : prev.minorLevel,
                alertLevel: !isNaN(alertNum) ? String(alertNum) : prev.alertLevel,
            }));
            await reload();
            setTimeout(() => setMsg(''), 4000);
        } catch (err) {
            setMsg('Failed to save reading. Please try again.');
            setMsgType('error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#0B2B26', fontWeight: 600 }}>
                Loading assigned water station...
            </div>
        );
    }

    const stationDisplayName = assignedStation || (activeRecord ? activeRecord.locationName : 'No Station Assigned');
    const activeAlert = getRecordAlertInfo(activeRecord);

    // Live alert computed dynamically as the irrigation officer inputs current water level or adjusts threshold levels
    const liveInputAlert = getWaterAlertInfo(
        form.level !== '' ? form.level : (activeRecord ? activeRecord.currentLevel : null),
        form.majorLevel !== '' ? form.majorLevel : (activeRecord?.majorFloodLevel || activeRecord?.maximumLimit || 5.0),
        form.minorLevel !== '' ? form.minorLevel : (activeRecord?.minorFloodLevel || 4.0),
        form.alertLevel !== '' ? form.alertLevel : (activeRecord?.alertWaterLevel || 3.0)
    );

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={sidebarLinks} />
            <div className="dashboard-with-sidebar">
                <div className="edrr-dashboard-content" style={{ maxWidth: 1180, margin: '0 auto' }}>
                    {/* Header */}
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: '#0B2B26', textShadow: 'none' }}>
                            Water Reading Station
                        </h2>
                        <p style={{ fontSize: 13, color: '#235347', margin: 0 }}>
                            Water-reading stations are assignable exclusively via the User Controller. You are managing readings exclusively for your assigned station.
                        </p>
                    </div>

                    {/* GA Admin Official Alert Announcement Banner (Displayed under main heading and sub heading) */}
                    <AlertAnnouncementBanner />

                    {/* Notification message */}
                    {msg && (
                        <div style={{
                            background: msgType === 'success' ? '#DAF1DE' : '#FBEAEA',
                            color: msgType === 'success' ? '#0B2B26' : '#7A1F14',
                            borderLeft: msgType === 'success' ? '4px solid #235347' : '4px solid #C0392B',
                            padding: '12px 16px',
                            borderRadius: 8,
                            marginBottom: 20,
                            fontSize: 13,
                            fontWeight: 600
                        }}>
                            {msg}
                        </div>
                    )}

                    {/* Unassigned Warning */}
                    {!assignedStation && !activeRecord && (
                        <div style={{
                            background: '#FFF3CD',
                            border: '1.5px solid #FFEBAA',
                            borderRadius: 12,
                            padding: 20,
                            marginBottom: 24,
                            color: '#856404'
                        }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>No Water-Reading Station Assigned</h3>
                            <p style={{ margin: 0, fontSize: 13 }}>
                                Your irrigation officer account has not been assigned a water-reading station yet. Please contact the User Administrator (<a href="mailto:admin@edrr.com" style={{ color: '#856404', fontWeight: 700 }}>admin@edrr.com</a>) to assign your water station in the User Controller.
                            </p>
                        </div>
                    )}

                    {/* Assigned Station Banner & Metrics */}
                    {(assignedStation || activeRecord) && (
                        <>
                            {/* Station Banner */}
                            <div style={{
                                background: '#FFFFFF',
                                borderRadius: 12,
                                padding: '18px 24px',
                                marginBottom: 20,
                                border: '1px solid #8EB69B',
                                borderLeft: `6px solid ${activeAlert.borderColor}`,
                                boxShadow: '0 2px 10px rgba(11,43,38,0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 14
                            }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#235347', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                        ASSIGNED WATER-READING STATION
                                    </div>
                                    <h3 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 2px', color: '#0B2B26' }}>
                                        {stationDisplayName}
                                    </h3>
                                    <div style={{ fontSize: 13, color: '#235347', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                                        <span>{activeRecord?.district || 'Matara'} District</span>
                                        <span>&bull;</span>
                                        <span style={{ fontWeight: 600 }}>
                                            Reported by : {activeRecord?.reporterName || activeRecord?.updatedByName || user.fullName || user.email}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: activeAlert.badgeText,
                                        background: activeAlert.badgeBg,
                                        padding: '6px 16px',
                                        borderRadius: 20,
                                        letterSpacing: 0.5,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                    }}>
                                        {activeAlert.badgeLabel}
                                    </span>
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
                                <div style={{ background: '#DAF1DE', borderRadius: 10, padding: '16px 18px', border: '1px solid #8EB69B', boxShadow: '0 2px 8px rgba(11,43,38,0.06)' }}>
                                    <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Current Water Level</div>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#0B2B26', marginTop: 4 }}>
                                        {activeRecord ? `${activeRecord.currentLevel} m` : '0.00 m'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#235347', marginTop: 4 }}>
                                        Trend: <strong>{activeRecord?.trend || 'STABLE'}</strong>
                                    </div>
                                </div>

                                <div style={{ background: '#DAF1DE', borderRadius: 10, padding: '16px 18px', border: '1px solid #ef9a9a', borderTop: '4px solid #dc2626', boxShadow: '0 2px 8px rgba(11,43,38,0.06)' }}>
                                    <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Major Flood Level</span>

                                    </div>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                                        {activeRecord?.majorFloodLevel != null ? `${activeRecord.majorFloodLevel} m` : (activeRecord?.maximumLimit != null ? `${activeRecord.maximumLimit} m` : '-')}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4 }}>
                                        Severe Flood Threshold
                                    </div>
                                </div>

                                <div style={{ background: '#DAF1DE', borderRadius: 10, padding: '16px 18px', border: '1px solid #ffcc80', borderTop: '4px solid #ea580c', boxShadow: '0 2px 8px rgba(11,43,38,0.06)' }}>
                                    <div style={{ fontSize: 12, color: '#9a3412', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Minor Flood Level</span>

                                    </div>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#ea580c', marginTop: 4 }}>
                                        {activeRecord?.minorFloodLevel != null ? `${activeRecord.minorFloodLevel} m` : '-'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#9a3412', marginTop: 4 }}>
                                        Warning Flood Threshold
                                    </div>
                                </div>

                                <div style={{ background: '#DAF1DE', borderRadius: 10, padding: '16px 18px', border: '1px solid #fff59d', borderTop: '4px solid #eab308', boxShadow: '0 2px 8px rgba(11,43,38,0.06)' }}>
                                    <div style={{ fontSize: 12, color: '#854d0e', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Alert Water Level</span>

                                    </div>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#854d0e', marginTop: 4 }}>
                                        {activeRecord?.alertWaterLevel != null ? `${activeRecord.alertWaterLevel} m` : '-'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#854d0e', marginTop: 4 }}>
                                        Vigilance Alert Threshold
                                    </div>
                                </div>

                                <div style={{ background: '#DAF1DE', borderRadius: 10, padding: '16px 18px', border: '1px solid #8EB69B', boxShadow: '0 2px 8px rgba(11,43,38,0.06)' }}>
                                    <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Station Status</div>
                                    <div style={{ marginTop: 8 }}>
                                        <span style={{
                                            fontSize: 12,
                                            fontWeight: 800,
                                            padding: '4px 12px',
                                            borderRadius: 20,
                                            background: activeAlert.badgeBg,
                                            color: activeAlert.badgeText,
                                            display: 'inline-block'
                                        }}>
                                            {activeAlert.badgeLabel}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#235347', marginTop: 8 }}>
                                        Capacity: <strong>{activeRecord?.percentageOfMax ? `${activeRecord.percentageOfMax}%` : '0%'}</strong>
                                    </div>
                                </div>

                                <div style={{ background: '#DAF1DE', borderRadius: 10, padding: '16px 18px', border: '1px solid #8EB69B', boxShadow: '0 2px 8px rgba(11,43,38,0.06)' }}>
                                    <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Last Updated</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0B2B26', marginTop: 8 }}>
                                        {activeRecord?.lastUpdated ? new Date(activeRecord.lastUpdated).toLocaleDateString() : 'Never'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#235347', marginTop: 2 }}>
                                        {activeRecord?.lastUpdated ? new Date(activeRecord.lastUpdated).toLocaleTimeString() : 'Awaiting input'}
                                    </div>
                                </div>
                            </div>

                            {/* Reading Entry Form */}
                            <div style={{
                                background: '#DAF1DE',
                                borderRadius: 12,
                                padding: 22,
                                border: '1px solid #8EB69B',
                                boxShadow: '0 2px 10px rgba(11,43,38,0.10)'
                            }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: '#0B2B26', textShadow: 'none' }}>
                                    Record Water Level Reading
                                </h3>
                                <p style={{ fontSize: 12, color: '#235347', margin: '0 0 18px' }}>
                                    Submit latest sensor or gauge readings for <strong>{stationDisplayName}</strong>.
                                    Specify the <strong>Major Flood Level</strong>, <strong>Minor Flood Level</strong>, and <strong>Alert Water Level</strong> thresholds to automatically trigger colored alerts.
                                </p>

                                <form onSubmit={handleSubmit}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 14 }}>
                                        {/* Current Water Level */}
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 700, color: '#0B2B26', display: 'block', marginBottom: 4 }}>
                                                Water Level (meters) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={form.level}
                                                onChange={e => setForm({ ...form, level: e.target.value })}
                                                placeholder={activeRecord ? `Current: ${activeRecord.currentLevel} m` : 'e.g. 3.45'}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1.5px solid #8EB69B',
                                                    borderRadius: 8,
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    background: '#FFFFFF',
                                                    color: '#0B2B26',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <span style={{ fontSize: 11, color: '#235347', marginTop: 3, display: 'block' }}>
                                                Current gauge reading
                                            </span>
                                        </div>

                                        {/* Major Flood Level (meters) - Red Alert */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <label style={{ fontSize: 12, fontWeight: 700, color: '#b71c1c' }}>
                                                    Major Flood Level (meters) *
                                                </label>

                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={form.majorLevel}
                                                onChange={e => setForm({ ...form, majorLevel: e.target.value })}
                                                placeholder="e.g. 5.00"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1.5px solid #ef9a9a',
                                                    borderRadius: 8,
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    background: '#FFFFFF',
                                                    color: '#b71c1c',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <span style={{ fontSize: 11, color: '#991b1b', marginTop: 3, display: 'block' }}>
                                                Level &ge; this triggers <strong>RED</strong> Alert
                                            </span>
                                        </div>

                                        {/* Minor Flood Level (meters) - Orange Alert */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <label style={{ fontSize: 12, fontWeight: 700, color: '#c2410c' }}>
                                                    Minor Flood Level (meters) *
                                                </label>

                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={form.minorLevel}
                                                onChange={e => setForm({ ...form, minorLevel: e.target.value })}
                                                placeholder="e.g. 4.00"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1.5px solid #ffcc80',
                                                    borderRadius: 8,
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    background: '#FFFFFF',
                                                    color: '#c2410c',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <span style={{ fontSize: 11, color: '#9a3412', marginTop: 3, display: 'block' }}>
                                                Level &ge; this triggers <strong></strong> Alert
                                            </span>
                                        </div>

                                        {/* Alert Water Level (meters) - Yellow Alert */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <label style={{ fontSize: 12, fontWeight: 700, color: '#854d0e' }}>
                                                    Alert Water Level (meters) *
                                                </label>

                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={form.alertLevel}
                                                onChange={e => setForm({ ...form, alertLevel: e.target.value })}
                                                placeholder="e.g. 3.00"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1.5px solid #fff59d',
                                                    borderRadius: 8,
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    background: '#FFFFFF',
                                                    color: '#854d0e',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <span style={{ fontSize: 11, color: '#854d0e', marginTop: 3, display: 'block' }}>
                                                Level &ge; this triggers <strong></strong> Alert
                                            </span>
                                        </div>
                                    </div>

                                    {/* Real-time Alert Banner: Computed dynamically as the irrigation officer inputs current water level or thresholds */}
                                    {liveInputAlert && (
                                        <div style={{
                                            background: liveInputAlert.bgTint,
                                            border: `2px solid ${liveInputAlert.borderColor}`,
                                            borderLeft: `8px solid ${liveInputAlert.borderColor}`,
                                            borderRadius: 10,
                                            padding: '14px 18px',
                                            marginBottom: 16,
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 12,
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                                            transition: 'all 0.25s ease'
                                        }}>
                                            <div style={{ fontSize: 26, lineHeight: 1 }}>{liveInputAlert.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        padding: '3px 10px',
                                                        borderRadius: 20,
                                                        background: liveInputAlert.badgeBg,
                                                        color: liveInputAlert.badgeText,
                                                        letterSpacing: 0.5
                                                    }}>
                                                        {liveInputAlert.badgeLabel}
                                                    </span>
                                                    <span style={{ fontSize: 13, fontWeight: 800, color: liveInputAlert.textColor }}>
                                                        {liveInputAlert.title}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: liveInputAlert.textColor, fontWeight: 500 }}>
                                                    {liveInputAlert.message}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: '#235347', display: 'block', marginBottom: 4 }}>
                                            Officer Observations / Notes (optional)
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            placeholder="Enter any relevant weather observations, sluice gate operations, or notes..."
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1.5px solid #8EB69B',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                outline: 'none',
                                                background: '#FFFFFF',
                                                color: '#0B2B26',
                                                boxSizing: 'border-box',
                                                fontFamily: 'inherit',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{
                                            padding: '11px 26px',
                                            background: '#235347',
                                            color: '#DAF1DE',
                                            border: 'none',
                                            borderRadius: 9,
                                            fontSize: 14,
                                            fontWeight: 700,
                                            cursor: saving ? 'default' : 'pointer',
                                            opacity: saving ? 0.7 : 1,
                                            transition: 'background 0.2s ease'
                                        }}
                                    >
                                        {saving ? 'Saving Reading...' : 'Save Water Level Reading'}
                                    </button>
                                </form>
                            </div>

                            {/* 1-Week Water Level Graph for Assigned Station */}
                            {activeRecord && (
                                <div style={{ marginTop: 24 }}>
                                    <WaterLevelChart
                                        station={activeRecord}
                                        height={300}
                                        showSummary={true}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
