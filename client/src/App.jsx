import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppShell, TableSkeleton } from './components/AppShell.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { LeavesPage } from './pages/LeavesPage.jsx';
import { TeamApprovalsPage } from './pages/TeamApprovalsPage.jsx';
import { PayslipsPage } from './pages/PayslipsPage.jsx';
import { HrDirectoryPage, HrLeavesPage } from './pages/HrPages.jsx';
import { AdminUsersPage, AdminReferencePage, AdminAuditPage } from './pages/AdminPages.jsx';

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '48px', maxWidth: '720px', margin: '0 auto' }}>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.landingRoute || '/profile'} replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function NotFoundRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to={user.landingRoute || '/dashboard'} replace />;
  }
  return <Navigate to="/" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaves"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN']}>
                <LeavesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payslips"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'HR_ADMIN']}>
                <PayslipsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/approvals"
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <TeamApprovalsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr/employees"
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN']}>
                <HrDirectoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr/leaves"
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN']}>
                <HrLeavesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reference"
            element={
              <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
                <AdminReferencePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
                <AdminAuditPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
