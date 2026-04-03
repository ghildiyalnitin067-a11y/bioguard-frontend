import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RoleGuard — wraps a route and enforces role access.
 *
 * Usage:
 *   <Route path="/admin" element={<RoleGuard roles={['admin']}><AdminDashboard/></RoleGuard>}/>
 *   <Route path="/alerts/create" element={<RoleGuard roles={['admin','asha_worker']}><CreateAlert/></RoleGuard>}/>
 */
const RoleGuard = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '80vh', flexDirection: 'column', gap: 16,
        color: 'var(--text-muted)',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: '#16a34a', animation: 'spin 0.8s linear infinite' }}/>
        <span>Checking access…</span>
      </div>
    );
  }

  // Not logged in → go to signin
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Wrong role → show access denied
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <AccessDenied requiredRoles={roles} userRole={user.role} />;
  }

  return children;
};

const AccessDenied = ({ requiredRoles, userRole }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '70vh', gap: 20, padding: 40, textAlign: 'center',
  }}>
    <div style={{ fontSize: '4rem' }}>🚫</div>
    <div>
      <h2 style={{ color: 'var(--text-heading)', marginBottom: 8 }}>Access Denied</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 4 }}>
        This page requires: <strong style={{ color: '#ef4444' }}>{requiredRoles.join(' or ')}</strong>
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
        Your role: <strong style={{ color: '#16a34a' }}>{userRole}</strong>
      </p>
    </div>
  </div>
);

export default RoleGuard;
