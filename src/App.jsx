import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleGuard from './components/RoleGuard';
import Navbar from './components/layout/Navbar';

/* Pages */
import Home            from './pages/Home';
import Dashboard       from './pages/Dashboard';
import Alerts          from './pages/Alerts';
import ConflictMonitor from './pages/ConflictMonitor';
import Analytics       from './pages/Analytics';
import Report          from './pages/Report';
import Learn           from './pages/Learn';
import SignIn          from './pages/SignIn';
import SignUp          from './pages/SignUp';
import Profile         from './pages/Profile';
import AdminDashboard  from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';

import NotificationManager from './components/NotificationManager';
import AlertToastBar     from './components/AlertToastBar';
import './App.css';

/**
 * SmartDashboard — redirects to the correct dashboard by role.
 *   admin       → /admin-dashboard
 *   asha_worker → /worker-dashboard
 *   user        → /dashboard (main map dashboard)
 */
const SmartDashboard = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/signin" replace />;
  if (user.role === 'admin')       return <Navigate to="/admin-dashboard" replace />;
  if (user.role === 'asha_worker') return <Navigate to="/worker-dashboard" replace />;
  return <Dashboard />;
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const hasGoogleAuth = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

function App() {
  const content = (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <NotificationManager />
          <AlertToastBar />
          <main className="main-content">
            <Routes>
              {/* ── Public ── */}
              <Route path="/"       element={<Home />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/learn"  element={<Learn />} />

              {/* ── All authenticated ── */}
              <Route path="/dashboard" element={
                <RoleGuard roles={['user', 'asha_worker', 'admin']}>
                  <SmartDashboard />
                </RoleGuard>
              }/>
              <Route path="/profile" element={
                <RoleGuard roles={['user', 'asha_worker', 'admin']}>
                  <Profile />
                </RoleGuard>
              }/>
              <Route path="/alerts" element={
                <RoleGuard roles={['user', 'asha_worker', 'admin']}>
                  <Alerts />
                </RoleGuard>
              }/>
              <Route path="/report" element={
                <RoleGuard roles={['user', 'asha_worker', 'admin']}>
                  <Report />
                </RoleGuard>
              }/>

              {/* ── Asha Worker + Admin ── */}
              <Route path="/conflict" element={
                <RoleGuard roles={['asha_worker', 'admin']}>
                  <ConflictMonitor />
                </RoleGuard>
              }/>
              <Route path="/analytics" element={
                <RoleGuard roles={['asha_worker', 'admin']}>
                  <Analytics />
                </RoleGuard>
              }/>
              <Route path="/worker-dashboard" element={
                <RoleGuard roles={['asha_worker', 'admin']}>
                  <WorkerDashboard />
                </RoleGuard>
              }/>

              {/* ── Admin only ── */}
              <Route path="/admin-dashboard" element={
                <RoleGuard roles={['admin']}>
                  <AdminDashboard />
                </RoleGuard>
              }/>

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );

  return hasGoogleAuth
    ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
    : content;
}

export default App;
