import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getOfficers, addOfficer, deleteOfficer, } from '../api/api';

const NAV_GA = [
    { path: '/admin-ga', icon: '', label: 'Overview' },
    { path: '/admin-ga/reports', icon: '', label: 'View Reports' },
    { path: '/admin-ga/final', icon: '', label: 'Final Reports' },
    { path: '/admin-ga/feedback', icon: '', label: 'Citizen Feedback' },
    { path: '/admin/officers', icon: '', label: 'Manage Officers' },
    { path: '/admin-ga/profile', icon: '', label: 'Profile' },
];

const NAV_RDA = [
    { path: '/admin-rda', icon: '', label: 'Overview' },
    { path: '/admin-rda/reports', icon: '', label: 'Damage Reports' },
    { path: '/admin-rda/recovery', icon: '', label: 'Recovery Progress' },
    { path: '/admin-rda/final', icon: '', label: 'Final Reports' },
    { path: '/admin/officers', icon: '', label: 'Manage Officers' },
    { path: '/admin-rda/profile', icon: '', label: 'Profile' },
];

const NAV_CITIZEN = [
  { path: "/", icon: "", label: "Home" },
  { path: "/citizen/map", icon: "", label: "Map" },
  { path: "/citizen/alerts", icon: "", label: "Alerts" },
  { path: "/citizen/contact", icon: "", label: "Contact" },
  { path: "/citizen/feedback", icon: "", label: "Feedback" },
  { path: "/citizen/about", icon: "", label: "About Us" },
  { path: "/citizen/profile", icon: "", label: "Profile" },
  { path: "/citizen/water", icon: "", label: "Water Levels" },
];

export default function OfficerManagementPage() {
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Toggle registration form
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        nic: '',
        email: '',
        password: '',
        phoneNumber: '',
        address: '',
        role: 'RURAL_OFFICER'
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    let links = NAV_GA;
    let sidebarRole = 'GA Admin';
    if (currentUser.role === 'GA_ADMIN') {
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddOfficer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Simple validation
        if (!formData.fullName || !formData.username || !formData.nic || !formData.email || !formData.password) {
            setError('All marked fields are required.');
            return;
        }

        try {
            await addOfficer(formData);
            setSuccess(`Officer ${formData.fullName} has been registered successfully!`);
            setShowForm(false);
            // Reset form
            setFormData({
                fullName: '',
                username: '',
                nic: '',
                email: '',
                password: '',
                phoneNumber: '',
                address: '',
                role: 'RURAL_OFFICER'
            });
            // Reload list
            loadOfficers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register officer.');
        }
    };

    const handleDeleteOfficer = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete officer "${name}"? This action cannot be undone.`)) {
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
            off.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            off.nic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            off.email?.toLowerCase().includes(searchQuery.toLowerCase());
        
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
        <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'inherit' }}>
            <Sidebar role={sidebarRole} links={links} />
            
            <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={S.title}>Officer Registry</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                            Manage administrative access and view status for Division &amp; Irrigation officers.
                        </p>
                    </div>
                    <button 
                        style={showForm ? S.btnCancel : S.btnPrimary} 
                        onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
                    >
                        {showForm ? '✕ Close Form' : ' Register New Officer'}
                    </button>
                </div>

                {/* Notifications */}
                {error && <div style={S.errorBox}>⚠️ {error}</div>}
                {success && <div style={S.successBox}>✅ {success}</div>}

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
                                    <label style={S.label}>Username * (Unique)</label>
                                    <input 
                                        type="text" 
                                        name="username" 
                                        value={formData.username} 
                                        onChange={handleInputChange} 
                                        placeholder="kamalp" 
                                        style={S.input} 
                                        required 
                                    />
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
                                    <label style={S.label}>Initial Password *</label>
                                    <input 
                                        type="password" 
                                        name="password" 
                                        value={formData.password} 
                                        onChange={handleInputChange} 
                                        placeholder="••••••••" 
                                        style={S.input} 
                                        required 
                                    />
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
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" style={S.btnCancelInline} onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" style={S.btnSubmit}>Create Account</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Stats summary bar */}
                <div style={S.statsGrid}>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{totalCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Total Officers</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb' }}>{ruralCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Rural Division</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#0891b2' }}>{irrigationCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Irrigation</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed' }}>{gaCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Gov Agent (GA)</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#ea580c' }}>{rdaCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>RDA/DMC Admin</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{activeCount}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Active Accounts</div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div style={S.filterRow}>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍 Search by Name, Email, NIC or Username..." 
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
                                        <th style={S.th}>NIC / Username</th>
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
                                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{off.fullName}</div>
                                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>✉️ {off.email}</div>
                                                {off.phoneNumber && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>📞 {off.phoneNumber}</div>}
                                            </td>
                                            <td style={S.td}>
                                                <div style={{ fontSize: 13, fontWeight: 500 }}>{off.nic}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>@{off.username}</div>
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
                                            </td>
                                            <td style={S.td}>
                                                <span style={off.active ? S.badgeActive : S.badgeInactive}>
                                                    {off.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={S.td}>
                                                <div style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                                                    {formatDateTime(off.lastLogin)}
                                                </div>
                                            </td>
                                            <td style={S.td}>
                                                <button 
                                                    style={S.btnDelete} 
                                                    onClick={() => handleDeleteOfficer(off.id, off.fullName)}
                                                    title="Delete Officer Account"
                                                >
                                                    🗑️ Delete
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
    );
}

const S = {
    title: { fontSize: 22, fontWeight: 800, margin: 0, color: '#1e293b' },
    btnPrimary: { padding: '8px 16px', background: '#2d5a27', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s' },
    btnCancel: { padding: '8px 16px', background: '#475569', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    errorBox: { background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 },
    successBox: { background: '#f0fdf4', borderLeft: '4px solid #22c55e', color: '#15803d', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 },
    
    // Stats
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 },
    statCard: { background: 'white', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' },
    
    // Form
    formCard: { background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' },
    cardTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 },
    form: { display: 'flex', flexDirection: 'column', gap: 12 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#475569' },
    input: { padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' },
    select: { padding: '9px 12px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: 'white', cursor: 'pointer', outline: 'none' },
    btnSubmit: { padding: '9px 18px', background: '#2d5a27', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    btnCancelInline: { padding: '9px 18px', background: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    
    // Filter
    filterRow: { display: 'flex', gap: 12, marginBottom: 16 },
    searchInput: { flex: 1, padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none' },
    filterSelect: { padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: 'white' },
    
    // Table
    tableCard: { background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
    emptyState: { padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { background: '#f8fafc', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' },
    tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
    td: { padding: '14px 16px', verticalAlign: 'middle' },
    
    // Badges
    badgeRural: { fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 12 },
    badgeIrrigation: { fontSize: 11, fontWeight: 600, background: '#ecfeff', color: '#0891b2', padding: '3px 8px', borderRadius: 12 },
    badgeGA: { fontSize: 11, fontWeight: 600, background: '#f5f3ff', color: '#7c3aed', padding: '3px 8px', borderRadius: 12 },
    badgeRDA: { fontSize: 11, fontWeight: 600, background: '#fff7ed', color: '#ea580c', padding: '3px 8px', borderRadius: 12 },
    badgeDefault: { fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 12 },
    badgeActive: { fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: 6 },
    badgeInactive: { fontSize: 11, fontWeight: 600, background: '#fef2f2', color: '#dc2626', padding: '2px 6px', borderRadius: 6 },
    
    // Buttons
    btnDelete: { padding: '5px 10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fee2e2', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }
};
