import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WaterLevelPage from './pages/WaterLevelPage';
import OfficerManagementPage from './pages/OfficerManagementPage';

// Redirect to login if not logged in
function Guard({ children, requiredEmail }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const location = useLocation();

  if (!token) {
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredEmail && user.email !== requiredEmail) {
    if (user.role === 'GA_ADMIN') return <Navigate to="/admin-ga" replace />;
    if (user.role === 'RDA_ADMIN') return <Navigate to="/admin-rda" replace />;
    if (user.role === 'RURAL_OFFICER') return <Navigate to="/officer" replace />;
    if (user.role === 'IRRIGATION_OFFICER') return <Navigate to="/water" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CitizenDashboard />} />

          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/UserAdmin" element={<Guard><OfficerManagementPage type="USER_ADMIN" /></Guard>} />

        { /* <Route path="/citizen" element={<Guard><CitizenDashboard /></Guard>} />   */ }

          <Route path="/officer" element={<Guard><OfficerDashboard /></Guard>} />

          <Route path="/admin-ga" element={<Guard><AdminDashboard type="GA" /></Guard>} />
          <Route path="/admin-rda" element={<Guard><AdminDashboard type="RDA" /></Guard>} />
          
          <Route path="/admin/officers" element={<Guard requiredEmail="admin@edrr.com"><OfficerManagementPage /></Guard>} />

          <Route path="/water" element={<Guard><WaterLevelPage /></Guard>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
  );
}