import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getOfficers, addOfficer, deleteOfficer, getWaterStations } from '../api/api';
import { NAV_USER_ADMIN, USER_ADMIN_ROLE_LABEL } from '../utils/adminNav';
import AlertAnnouncementBanner from '../components/AlertAnnouncementBanner';

const NAV_GA = [
    { path: '/admin-ga', icon: '', label: 'Overview' },
    { path: '/admin-ga/reports', icon: '', label: 'View Reports' },
    { path: '/admin-ga/public-reports', icon: '', label: 'Public Reports' },
    { path: '/admin-ga/final', icon: '', label: 'Final Reports' },
    { path: '/admin-ga/feedback', icon: '', label: 'Citizen Feedback' },
];

const NAV_RDA = [
    { path: '/admin-rda', icon: '', label: 'Overview' },
    { path: '/admin-rda/reports', icon: '', label: 'Damage Reports' },
    { path: '/admin-rda/alerts', icon: '', label: 'Alert' },
    { path: '/admin-rda/recovery', icon: '', label: 'Recovery Progress' },
    { path: '/admin-rda/public-reports', icon: '', label: 'Public Reports' },
    { path: '/admin-rda/final', icon: '', label: 'Final Reports' },
];

const NAV_CITIZEN = [
  { path: "/", icon: "", label: "Home" },
  { path: "/citizen/map", icon: "", label: "Map" },
  { path: "/citizen/alerts", icon: "", label: "Alerts" },
  { path: "/citizen/contact", icon: "", label: "Contact" },
  { path: "/citizen/feedback", icon: "", label: "Feedback" },
  { path: "/citizen/water", icon: "", label: "Water Levels" },
];

export default function OfficerManagementPage() {
    const [officers, setOfficers] = useState([]);
    const [availableStations, setAvailableStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Toggle registration form
    const [showForm, setShowForm] = useState(false);
    const [showOfficerPassword, setShowOfficerPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        nic: '',
        email: '',
        password: '',
        phoneNumber: '',
        address: '',
        divisionName: '',
        waterStation: '',
        role: 'RURAL_OFFICER'
    });
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSystemAdmin = currentUser.email === 'admin@edrr.com';

    let links = NAV_GA;
    let sidebarRole = 'GA Admin';
    if (isSystemAdmin) {
        links = NAV_USER_ADMIN;
        sidebarRole = USER_ADMIN_ROLE_LABEL;
    } else if (currentUser.role === 'GA_ADMIN') {
        links = NAV_GA;
        sidebarRole = 'GA Admin';
    } else if (currentUser.role === 'RDA_ADMIN') {
        links = NAV_RDA;
        sidebarRole = 'RDA/DMC Admin';
    } else {
        links = NAV_CITIZEN;
        sidebarRole = currentUser.fullName || 'Citizen';
    }

    useEffect(() => {
        loadOfficers();
        loadStations();
    }, []);

    const loadOfficers = async () => {
        setLoading(true);
        try {
            const res = await getOfficers();
            setOfficers(res.data);
        } catch (err) {
            setError('Failed to load officers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadStations = async () => {
        try {
            const res = await getWaterStations();
            setAvailableStations(res.data || []);
        } catch (err) {
            console.error('Failed to load water stations', err);
        }
    };

    const resetPhoto = () => {
        if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
        setProfilePhoto(null);
        setProfilePhotoPreview(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0] || null;
        setProfilePhoto(file);
        setProfilePhotoPreview(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return file ? URL.createObjectURL(file) : null;
        });
    };

    const handleAddOfficer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Simple validation
        if (!formData.fullName || !formData.nic || !formData.email || !formData.password) {
            setError('All marked fields are required.');
            return;
        }

        if (formData.role === 'RURAL_OFFICER' && !formData.divisionName.trim()) {
            setError('Rural Officer Division Name is required.');
            return;
        }

        if (formData.role === 'IRRIGATION_OFFICER' && !formData.waterStation.trim()) {
            setError('Water-Reading Station is required for Irrigation Officers.');
            return;
        }

        try {
            let payload = formData;
            if (profilePhoto) {
                payload = new FormData();
                Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
                payload.append('profilePhoto', profilePhoto);
            }
            await addOfficer(payload);
            setSuccess(`Officer ${formData.fullName} has been registered successfully!`);
            setShowForm(false);
            // Reset form
            setFormData({
                fullName: '',
                nic: '',
                email: '',
                password: '',
                phoneNumber: '',
                address: '',
                divisionName: '',
                waterStation: '',
                role: 'RURAL_OFFICER'
            });
            resetPhoto();
            // Reload list and stations
            loadOfficers();
            loadStations();
        } catch (err) {
            const apiError = 
                err.response?.data?.error || 
                err.response?.data?.message || 
                err.response?.data?.errors?.[0]?.defaultMessage || 
                err.message || 
                'Failed to register officer.';
            setError(apiError);
        }
    };

    const handleDeleteOfficer = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete officer "${name}"? `)) {
            return;
        }

        setError('');
        setSuccess('');
        try {
            await deleteOfficer(id);
            setSuccess(`Officer "${name}" has been deleted.`);
            loadOfficers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete officer.');
        }
    };

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return 'Never Logged In';
        try {
            const date = new Date(dateTimeStr);
            return date.toLocaleString();
        } catch (e) {
            return dateTimeStr;
        }
    };

    // Filter and search logic
    const filteredOfficers = officers.filter(off => {
        const matchesSearch = 
            off.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            off.nic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            off.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            off.divisionName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            off.waterStation?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesRole = roleFilter === 'ALL' ? true : off.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    // Stats calculations
    const totalCount = officers.length;
    const ruralCount = officers.filter(o => o.role === 'RURAL_OFFICER').length;
    const irrigationCount = officers.filter(o => o.role === 'IRRIGATION_OFFICER').length;
    const gaCount = officers.filter(o => o.role === 'GA_ADMIN').length;
    const rdaCount = officers.filter(o => o.role === 'RDA_ADMIN').length;
    const activeCount = officers.filter(o => o.active).length;

    if (loading && officers.length === 0) {
        return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading Registry...</div>;
    }

    return (
        <div className="edrr-dashboard-page">
            <Sidebar role={sidebarRole} links={links} />
            
            <div className="dashboard-with-sidebar"><div className="edrr-dashboard-content" style={{ maxWidth:1180, margin:'0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={S.title}>User Controller</h2>
                        <p style={{ fontSize: 13, color: '#235347', marginTop: 2 }}>
                            Manage administrative access and view status for Division &amp; Irrigation officers.
                        </p>
                    </div>
                    <button 
                        style={showForm ? S.btnCancel : S.btnPrimary} 
                        onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); resetPhoto(); }}
                    >
                        {showForm ? 'Close Form' : 'Register New Officer'}
                    </button>
                </div>

                {/* GA Admin Official Alert Announcement Banner (Displayed under main heading and sub heading) */}
                <AlertAnnouncementBanner />

                {/* Notifications */}
                {error && <div style={S.errorBox}>{error}</div>}
                {success && <div style={S.successBox}>{success}</div>}

                {/* Registration Form */}
                {showForm && (
                    <div style={S.formCard}>
                        <h3 style={S.cardTitle}>Register New System Officer</h3>
                        <form onSubmit={handleAddOfficer} style={S.form}>
                            <div style={S.formGrid}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Full Name *</label>
                                    <input 
                                        type="text" 
                                        name="fullName" 
                                        value={formData.fullName} 
                                        onChange={handleInputChange} 
                                        placeholder="E.g. Kamal Perera" 
                                        style={S.input} 
                                        required 
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Profile Photo (optional)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        style={S.input}
                                    />
                                    {profilePhotoPreview && (
                                        <img
                                            src={profilePhotoPreview}
                                            alt="Profile preview"
                                            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginTop: 6, border: '1.5px solid #8EB69B' }}
                                        />
                                    )}
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>NIC Number * (Unique)</label>
                                    <input 
                                        type="text" 
                                        name="nic" 
                                        value={formData.nic} 
                                        onChange={handleInputChange} 
                                        placeholder="199912345678 or 991234567V" 
                                        style={S.input} 
                                        required 
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Email Address * (Unique)</label>
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleInputChange} 
                                        placeholder="kamal@domain.com" 
                                        style={S.input} 
                                        required 
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Password *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type={showOfficerPassword ? 'text' : 'password'} 
                                            name="password" 
                                            value={formData.password} 
                                            onChange={handleInputChange} 
                                            placeholder="••••••••" 
                                            style={{ ...S.input, width: '100%', paddingRight: 40, boxSizing: 'border-box' }} 
                                            required 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOfficerPassword(!showOfficerPassword)}
                                            aria-label="Toggle password visibility"
                                            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#235347', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {showOfficerPassword ? '●' : '○'}
                                        </button>
                                    </div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Phone Number</label>
                                    <input 
                                        type="tel" 
                                        name="phoneNumber" 
                                        value={formData.phoneNumber} 
                                        onChange={handleInputChange} 
                                        placeholder="0712345678" 
                                        style={S.input} 
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Office/Division Address</label>
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleInputChange} 
                                        placeholder="Matara Divisional Secretariat" 
                                        style={S.input} 
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>System Role *</label>
                                    <select 
                                        name="role" 
                                        value={formData.role} 
                                        onChange={handleInputChange} 
                                        style={S.select}
                                    >
                                        <option value="RURAL_OFFICER">Rural Division Officer (Damage Reporter)</option>
                                        <option value="IRRIGATION_OFFICER">Irrigation Officer (Water Monitor)</option>
                                        <option value="GA_ADMIN">Government Agent (GA)</option>
                                        <option value="RDA_ADMIN">RDA/DMC Administrator</option>
                                    </select>
                                </div>
                                {formData.role === 'RURAL_OFFICER' && (
                                    <div style={S.formGroup}>
                                        <label style={S.label}>Rural Officer Division Name * (Unique)</label>
                                        <input 
                                            type="text" 
                                            name="divisionName" 
                                            value={formData.divisionName} 
                                            onChange={handleInputChange} 
                                            placeholder="E.g. Weligama, Akuressa, Matara Four Gravets..." 
                                            style={S.input} 
                                            required 
                                        />
                                        <small style={{ fontSize: 11, color: '#235347', marginTop: 4, display: 'block' }}>
                                            Assigned administrative division. Citizen public damage reports for this division will be routed to this officer.
                                        </small>
                                    </div>
                                )}
                                {formData.role === 'IRRIGATION_OFFICER' && (
                                    <div style={S.formGroup}>
                                        <label style={S.label}>Water-Reading Station * (Assigned)</label>
                                        <input 
                                            type="text" 
                                            name="waterStation" 
                                            list="water-station-options"
                                            value={formData.waterStation} 
                                            onChange={handleInputChange} 
                                            placeholder="E.g. Nilwala River - Matara, Kirama Oya, Panadugama..." 
                                            style={S.input} 
                                            required 
                                        />
                                        <datalist id="water-station-options">
                                            {availableStations.map(st => (
                                                <option key={st} value={st} />
                                            ))}
                                        </datalist>
                                        <small style={{ fontSize: 11, color: '#235347', marginTop: 4, display: 'block' }}>
                                            Assigned water monitoring station. Upon login, this officer will exclusively view and record data for this station.
                                        </small>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" style={S.btnCancelInline} onClick={() => { setShowForm(false); resetPhoto(); }}>Cancel</button>
                                <button type="submit" style={S.btnSubmit}>Create Account</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Stats summary bar */}
                <div style={S.statsGrid}>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0B2B26' }}>{totalCount}</div>
                        <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Total Officers</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0B2B26' }}>{ruralCount}</div>
                        <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Rural Division</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0B2B26' }}>{irrigationCount}</div>
                        <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Irrigation</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0B2B26' }}>{gaCount}</div>
                        <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Gov Agent (GA)</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0B2B26' }}>{rdaCount}</div>
                        <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>RDA/DMC Admin</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0B2B26' }}>{activeCount}</div>
                        <div style={{ fontSize: 12, color: '#235347', fontWeight: 600 }}>Active Accounts</div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div style={S.filterRow}>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by Name, Email, or NIC..." 
                        style={S.searchInput}
                    />
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={S.filterSelect}
                    >
                        <option value="ALL">All Roles</option>
                        <option value="RURAL_OFFICER">Rural Division Officers</option>
                        <option value="IRRIGATION_OFFICER">Irrigation Officers</option>
                        <option value="GA_ADMIN">Government Agent (GA)</option>
                        <option value="RDA_ADMIN">RDA/DMC Administrator</option>
                    </select>
                </div>

                {/* Officers Table Card */}
                <div style={S.tableCard}>
                    {filteredOfficers.length === 0 ? (
                        <div style={S.emptyState}>
                            No officers found matching the filters.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={S.table}>
                                <thead>
                                    <tr>
                                        <th style={S.th}>Officer Details</th>
                                        <th style={S.th}>NIC Number</th>
                                        <th style={S.th}>Assigned Role</th>
                                        <th style={S.th}>Status</th>
                                        <th style={S.th}>Last Activity</th>
                                        <th style={S.th}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOfficers.map(off => (
                                        <tr key={off.id} style={S.tr}>
                                            <td style={S.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    {off.profilePhotoUrl ? (
                                                        <img 
                                                            src={off.profilePhotoUrl.startsWith('http') ? off.profilePhotoUrl : `http://localhost:8080${off.profilePhotoUrl}`} 
                                                            alt={off.fullName} 
                                                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #8EB69B', flexShrink: 0 }} 
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: 40, height: 40, borderRadius: '50%', background: '#8EB69B', color: '#0B2B26',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0
                                                        }}>
                                                            {off.fullName?.[0]?.toUpperCase() || 'O'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 16, color: '#0B2B26' }}>{off.fullName}</div>
                                                        <div style={{ fontSize: 12, color: '#235347', marginTop: 2 }}>{off.email}</div>
                                                        {off.phoneNumber && <div style={{ fontSize: 12, color: '#235347', marginTop: 2 }}>{off.phoneNumber}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={S.td}>
                                                <div style={{ fontSize: 13, fontWeight: 500 }}>{off.nic}</div>
                                            </td>
                                            <td style={S.td}>
                                                <span style={
                                                    off.role === 'RURAL_OFFICER' ? S.badgeRural :
                                                    off.role === 'IRRIGATION_OFFICER' ? S.badgeIrrigation :
                                                    off.role === 'GA_ADMIN' ? S.badgeGA :
                                                    off.role === 'RDA_ADMIN' ? S.badgeRDA : S.badgeDefault
                                                }>
                                                    {
                                                        off.role === 'RURAL_OFFICER' ? 'Rural Officer' :
                                                        off.role === 'IRRIGATION_OFFICER' ? 'Irrigation Officer' :
                                                        off.role === 'GA_ADMIN' ? 'Government Agent (GA)' :
                                                        off.role === 'RDA_ADMIN' ? 'RDA/DMC Administrator' : off.role
                                                    }
                                                </span>
                                                {off.divisionName && (
                                                    <div style={{ fontSize: 11, color: '#0B2B26', fontWeight: 700, marginTop: 4, background: '#8EB69B', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                                                        Division: {off.divisionName}
                                                    </div>
                                                )}
                                                {off.waterStation && (
                                                    <div style={{ fontSize: 11, color: '#0B2B26', fontWeight: 700, marginTop: 4, background: '#8EB69B', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                                                        Station: {off.waterStation}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={S.td}>
                                                <span style={off.active ? S.badgeActive : S.badgeInactive}>
                                                    {off.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={S.td}>
                                                <div style={{ fontSize: 12, color: '#235347', fontWeight: 500 }}>
                                                    {formatDateTime(off.lastLogin)}
                                                </div>
                                            </td>
                                            <td style={S.td}>
                                                <button 
                                                    style={S.btnDelete} 
                                                    onClick={() => handleDeleteOfficer(off.id, off.fullName)}
                                                    title="Delete Officer Account"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}

const S = {
    title: { fontSize: 24, fontWeight: 800, margin: 0, color: '#0B2B26', textShadow: 'none' },
    btnPrimary: {
        padding: '10px 20px',
        background: '#235347',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#DAF1DE',
        border: '1px solid #235347',
        borderRadius: '9px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 8px 24px rgba(11,43,38,0.16)',
        textShadow: 'none',
        transition: 'all 0.3s ease',
    },
    btnCancel: {
        padding: '10px 20px',
        background: '#DAF1DE',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#0B2B26',
        border: '1px solid #8EB69B',
        borderRadius: '9px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 8px 24px rgba(11,43,38,0.10)',
        textShadow: 'none',
        transition: 'all 0.3s ease',
    },
    errorBox: { background: '#DAF1DE', borderLeft: '4px solid #0B2B26', color: '#0B2B26', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 },
    successBox: { background: '#DAF1DE', borderLeft: '4px solid #235347', color: '#0B2B26', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 },

    // Stats
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 },
    statCard: { background:'#DAF1DE', borderRadius: 10, padding: 14, boxShadow: '0 2px 10px rgba(11,43,38,0.10)', textAlign: 'center', border: '1px solid #8EB69B' },

    // Form
    formCard: { background:'#DAF1DE', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 10px rgba(11,43,38,0.10)', border: '1px solid #8EB69B' },
    cardTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#0B2B26', borderBottom: '1px solid #8EB69B', paddingBottom: 10 },
    form: { display: 'flex', flexDirection: 'column', gap: 12 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#235347' },
    input: { padding: '9px 12px', border: '1.5px solid #8EB69B', borderRadius: 8, fontSize: 13, outline: 'none', background: '#DAF1DE', color: '#0B2B26', transition: 'border-color 0.2s' },
    select: { padding: '9px 12px', border: '1.5px solid #8EB69B', borderRadius: 8, fontSize: 13, background:'#DAF1DE', color: '#0B2B26', cursor: 'pointer', outline: 'none' },
    btnSubmit: {
        padding: '10px 22px',
        background: '#235347',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#DAF1DE',
        border: '1px solid #235347',
        borderRadius: '30px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(11,43,38,0.14)',
        transition: 'all 0.3s ease',
    },
    btnCancelInline: {
        padding: '10px 22px',
        background: '#DAF1DE',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#0B2B26',
        border: '1px solid #8EB69B',
        borderRadius: '30px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    },

    // Filter
    filterRow: { display: 'flex', gap: 12, marginBottom: 16 },
    searchInput: { flex: 1, padding: '10px 14px', border: '1.5px solid #8EB69B', borderRadius: 8, fontSize: 13, outline: 'none', background: '#DAF1DE', color: '#0B2B26' },
    filterSelect: { padding: '10px 14px', border: '1.5px solid #8EB69B', borderRadius: 8, fontSize: 13, background:'#DAF1DE', color: '#0B2B26' },

    // Table
    tableCard: { background:'#DAF1DE', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(11,43,38,0.10)', border: '1px solid #8EB69B' },
    emptyState: { padding: 40, textAlign: 'center', color: '#235347', fontSize: 13 },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#0B2B26' },
    th: { background: '#235347', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#DAF1DE', borderBottom: '1px solid #8EB69B' },
    tr: { borderBottom: '1px solid #8EB69B', transition: 'background 0.15s' },
    td: { padding: '14px 16px', verticalAlign: 'middle', color: '#0B2B26' },

    // Badges
    badgeRural: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '3px 8px', borderRadius: 12 },
    badgeIrrigation: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '3px 8px', borderRadius: 12 },
    badgeGA: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '3px 8px', borderRadius: 12 },
    badgeRDA: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '3px 8px', borderRadius: 12 },
    badgeDefault: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '3px 8px', borderRadius: 12 },
    badgeActive: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '2px 6px', borderRadius: 6 },
    badgeInactive: { fontSize: 12, fontWeight: 600, background: '#8EB69B', color: '#0B2B26', padding: '2px 6px', borderRadius: 6 },

    // Buttons
    btnDelete: { padding: '5px 10px', background: '#235347', color: '#DAF1DE', border: '1px solid #235347', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }
};