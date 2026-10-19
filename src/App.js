import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WaterLevelPage from './pages/WaterLevelPage';
import WaterOverviewPage from './pages/WaterOverviewPage';
import OfficerManagementPage from './pages/OfficerManagementPage';
import CitizenMapPage from './pages/CitizenMapPage';
import CitizenAlertsPage from './pages/CitizenAlertsPage';
import CitizenWaterPage from './pages/CitizenWaterPage';
import CitizenReportsPage from './pages/CitizenReportsPage';
import CitizenReportDamagePage from './pages/CitizenReportDamagePage';
import ContactPage from './pages/ContactPage';
import FeedbackPage from './pages/FeedbackPage';
import AdminMapPage from './pages/AdminMapPage';
import AdminAlertsPage from './pages/AdminAlertsPage';
import AdminContactPage from './pages/AdminContactPage';
import AdminReportDamagePage from './pages/AdminReportDamagePage';
import AdminProfilePage from './pages/AdminProfilePage';
import AdminFinalReportPage from './pages/AdminFinalReportPage';
import AdminCitizenFeedbackPage from './pages/AdminCitizenFeedbackPage';
import AdminRecoveryProgressPage from './pages/AdminRecoveryProgressPage';
import AdminPublicReportsPage from './pages/AdminPublicReportsPage';

const ROLE_HOME = {
  GA_ADMIN: '/admin-ga',
  RDA_ADMIN: '/admin-rda',
  RURAL_OFFICER: '/officer',
  IRRIGATION_OFFICER: '/water',
};

const getHomeForUser = (user = {}) => {
  if (user.email === 'admin@edrr.com') return '/admin/officers';
  return ROLE_HOME[user.role] || '/citizen';
};

// Frontend role guard. Public/general users are redirected to the public viewer UI.
function Guard({ children, allowedRoles, requiredEmail }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const location = useLocation();

  if (!token) {
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredEmail && user.email !== requiredEmail) {
    return <Navigate to={getHomeForUser(user)} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeForUser(user)} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / general-user viewer routes */}
        <Route path="/" element={<CitizenDashboard />} />
        <Route path="/citizen" element={<CitizenDashboard />} />
        <Route path="/citizen/map" element={<CitizenMapPage />} />
        <Route path="/citizen/alerts" element={<CitizenAlertsPage />} />
        <Route path="/citizen/water" element={<CitizenWaterPage />} />
        <Route path="/citizen/reports" element={<CitizenReportsPage />} />
        <Route path="/citizen/situation-reports" element={<Navigate to="/citizen/reports" replace />} />
        <Route path="/situation-reports" element={<Navigate to="/citizen/reports" replace />} />

        {/* Citizens can submit their own damage reports here. Legacy/alternate submission URLs are redirected to it. */}
        <Route path="/citizen/report-damage" element={<CitizenReportDamagePage />} />
        <Route path="/citizen/report" element={<Navigate to="/citizen/report-damage" replace />} />
        <Route path="/citizen/report/*" element={<Navigate to="/citizen/report-damage" replace />} />
        <Route path="/report-damage" element={<Navigate to="/citizen/report-damage" replace />} />
        <Route path="/damage-report" element={<Navigate to="/citizen/report-damage" replace />} />
        <Route path="/report" element={<Navigate to="/citizen/report-damage" replace />} />
        <Route path="/citizen/contact" element={<ContactPage />} />
        <Route path="/citizen/feedback" element={<FeedbackPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Rural officers: damage report submission */}
        <Route path="/officer" element={<Guard allowedRoles={['RURAL_OFFICER']}><OfficerDashboard /></Guard>} />
        <Route path="/officer/report" element={<Guard allowedRoles={['RURAL_OFFICER']}><OfficerDashboard initialTab="new" /></Guard>} />

        {/* Rural officer sidebar sections - reusing the same Map/Alert/Contact/Profile/Report Damage pages built for the User Admin sidebar */}
        <Route path="/officer/map" element={<Guard allowedRoles={['RURAL_OFFICER']}><AdminMapPage /></Guard>} />
        <Route path="/officer/alerts" element={<Guard allowedRoles={['RURAL_OFFICER']}><AdminAlertsPage /></Guard>} />
        <Route path="/officer/contact" element={<Guard allowedRoles={['RURAL_OFFICER']}><AdminContactPage /></Guard>} />
        <Route path="/officer/report-damage" element={<Guard allowedRoles={['RURAL_OFFICER']}><AdminReportDamagePage /></Guard>} />
        <Route path="/officer/public-reports" element={<Guard allowedRoles={['RURAL_OFFICER']}><AdminPublicReportsPage /></Guard>} />
        <Route path="/officer/profile" element={<Guard allowedRoles={['RURAL_OFFICER']}><AdminProfilePage /></Guard>} />

        {/* GA admins: report progress + recovery approval */}
        <Route path="/admin-ga" element={<Guard allowedRoles={['GA_ADMIN']}><AdminDashboard type="GA" /></Guard>} />
        <Route path="/admin-ga/reports" element={<Guard allowedRoles={['GA_ADMIN']}><AdminDashboard type="GA" initialTab="reports" /></Guard>} />
        <Route path="/admin-ga/announcements" element={<Guard allowedRoles={['GA_ADMIN']}><AdminDashboard type="GA" initialTab="announcements" /></Guard>} />

        {/* GA sidebar sections - Map/Alert/Profile reuse the pages built for the User Admin sidebar; Final Report and Citizen Feedback are dedicated GA pages */}
        <Route path="/admin-ga/map" element={<Guard allowedRoles={['GA_ADMIN']}><AdminMapPage /></Guard>} />
        <Route path="/admin-ga/alerts" element={<Guard allowedRoles={['GA_ADMIN']}><AdminAlertsPage /></Guard>} />
        <Route path="/admin-ga/public-reports" element={<Guard allowedRoles={['GA_ADMIN']}><AdminPublicReportsPage /></Guard>} />
        <Route path="/admin-ga/final" element={<Guard allowedRoles={['GA_ADMIN']}><AdminFinalReportPage /></Guard>} />
        <Route path="/admin-ga/feedback" element={<Guard allowedRoles={['GA_ADMIN']}><AdminCitizenFeedbackPage /></Guard>} />
        <Route path="/admin-ga/profile" element={<Guard allowedRoles={['GA_ADMIN']}><AdminProfilePage /></Guard>} />

        {/* RDA admins: damage report progress tracking */}
        <Route path="/admin-rda" element={<Guard allowedRoles={['RDA_ADMIN']}><AdminDashboard type="RDA" /></Guard>} />
        <Route path="/admin-rda/reports" element={<Guard allowedRoles={['RDA_ADMIN']}><AdminDashboard type="RDA" initialTab="reports" /></Guard>} />

        {/* RDA sidebar sections - dedicated Recovery Progress page for RDA; Final Report and Profile reuse the pages built for the User Admin sidebar */}
        <Route path="/admin-rda/alerts" element={<Guard allowedRoles={['RDA_ADMIN']}><AdminAlertsPage /></Guard>} />
        <Route path="/admin-rda/recovery" element={<Guard allowedRoles={['RDA_ADMIN']}><AdminRecoveryProgressPage /></Guard>} />
        <Route path="/admin-rda/public-reports" element={<Guard allowedRoles={['RDA_ADMIN']}><AdminPublicReportsPage /></Guard>} />
        <Route path="/admin-rda/final" element={<Guard allowedRoles={['RDA_ADMIN']}><AdminFinalReportPage /></Guard>} />
        <Route path="/admin-rda/profile" element={<Guard allowedRoles={['RDA_ADMIN']}><AdminProfilePage /></Guard>} />

        {/* Irrigation officers: assigned water-reading station management */}
        <Route path="/water" element={<Guard allowedRoles={['IRRIGATION_OFFICER']}><WaterLevelPage /></Guard>} />
        <Route path="/water/levels" element={<Guard allowedRoles={['IRRIGATION_OFFICER']}><WaterLevelPage /></Guard>} />

        {/* Irrigation officer sidebar sections - reusing the same Map/Alert/Profile pages built for the User Admin sidebar */}
        <Route path="/water/map" element={<Guard allowedRoles={['IRRIGATION_OFFICER']}><AdminMapPage /></Guard>} />
        <Route path="/water/alerts" element={<Guard allowedRoles={['IRRIGATION_OFFICER']}><AdminAlertsPage /></Guard>} />
        <Route path="/water/public-reports" element={<Guard allowedRoles={['IRRIGATION_OFFICER']}><AdminPublicReportsPage /></Guard>} />
        <Route path="/water/profile" element={<Guard allowedRoles={['IRRIGATION_OFFICER']}><AdminProfilePage /></Guard>} />

        {/* Existing system administrator-only user controller */}
        <Route path="/UserAdmin" element={<Guard requiredEmail="admin@edrr.com"><OfficerManagementPage type="USER_ADMIN" /></Guard>} />
        <Route path="/admin/officers" element={<Guard requiredEmail="admin@edrr.com"><OfficerManagementPage /></Guard>} />

        {/* User Admin sidebar sections (system administrator only, not accessible to citizens) */}
        <Route path="/admin/officers/map" element={<Guard requiredEmail="admin@edrr.com"><AdminMapPage /></Guard>} />
        <Route path="/admin/officers/alerts" element={<Guard requiredEmail="admin@edrr.com"><AdminAlertsPage /></Guard>} />
        <Route path="/admin/officers/contact" element={<Guard requiredEmail="admin@edrr.com"><AdminContactPage /></Guard>} />
        <Route path="/admin/officers/report-damage" element={<Guard requiredEmail="admin@edrr.com"><AdminReportDamagePage /></Guard>} />
        <Route path="/admin/officers/public-reports" element={<Guard requiredEmail="admin@edrr.com"><AdminPublicReportsPage /></Guard>} />
        <Route path="/admin/officers/profile" element={<Guard requiredEmail="admin@edrr.com"><AdminProfilePage /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
