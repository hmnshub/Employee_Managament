import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  CalendarDays,
  FileText,
  CheckSquare,
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function StatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  const cls = normalized.toLowerCase();
  const labels = {
    APPROVED: 'Approved',
    PENDING: 'Pending approval',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    ACTIVE: 'Active',
    LOCKED: 'Locked',
    ARCHIVED: 'Archived',
    ISSUED: 'Issued',
    ON_LEAVE: 'On leave'
  };
  return <span className={`status-badge ${cls}`}>{labels[normalized] || normalized}</span>;
}

export function TableSkeleton({ rows = 4, columns = 5 }) {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-row" style={{ width: `${95 - (r % 3) * 8}%` }} />
      ))}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert" aria-live="assertive">
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 600 }}>{error.message || 'Unable to load data'}</div>
          {error.correlationId && (
            <div style={{ fontSize: '11.5px', marginTop: '2px', opacity: 0.85 }}>
              Correlation ID: <code>{error.correlationId}</code>
            </div>
          )}
        </div>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="alert alert-success" role="status" aria-live="polite">
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <CheckCircle2 size={18} />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}

export function PaginationControls({ pagination, onPageChange }) {
  if (!pagination) return null;
  const { page, totalPages, totalItems, hasPreviousPage, hasNextPage } = pagination;
  return (
    <div className="pagination-bar" role="navigation" aria-label="Pagination">
      <span>
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total records)
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  children,
  onConfirm,
  onCancel,
  submitting = false
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-dialog">
        <h3 id="modal-title" style={{ margin: '0 0 8px', fontSize: '16px' }}>
          {title}
        </h3>
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
          {description}
        </p>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Back
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const ROUTE_LABELS = {
  '/dashboard': 'Overview',
  '/profile': 'My Profile & Address',
  '/leaves': 'Leave Balance & Requests',
  '/payslips': 'My Payslips',
  '/manager/approvals': 'Team Leave Approvals',
  '/hr/employees': 'Employee Directory',
  '/hr/leaves': 'Organization Leave Overview',
  '/admin/users': 'User & Role Management',
  '/admin/reference': 'Leave Types Reference',
  '/admin/audit': 'Security Audit Log'
};

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close mobile sidebar drawer when navigating to a new route
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock background scroll on mobile when drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const role = user?.role || 'EMPLOYEE';
  const currentBreadcrumb = ROUTE_LABELS[location.pathname] || 'Portal';

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Primary Navigation">
        <div className="sidebar-brand">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="sidebar-brand-title">Employee Self-Service</h1>
              <p className="sidebar-brand-subtitle">People & Payroll Portal</p>
            </div>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={closeSidebar}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Self-Service</div>
          {role !== 'SYSTEM_ADMIN' && (
            <NavLink
              to="/dashboard"
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </NavLink>
          )}
          <NavLink
            to="/profile"
            onClick={closeSidebar}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <UserCheck size={16} />
            <span>My profile & address</span>
          </NavLink>
          {role !== 'SYSTEM_ADMIN' && (
            <>
              <NavLink
                to="/leaves"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <CalendarDays size={16} />
                <span>Leave balance & requests</span>
              </NavLink>
              <NavLink
                to="/payslips"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <FileText size={16} />
                <span>Payslips</span>
              </NavLink>
            </>
          )}

          {role === 'MANAGER' && (
            <>
              <div className="sidebar-section-label">Manager Workflows</div>
              <NavLink
                to="/manager/approvals"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <CheckSquare size={16} />
                <span>Direct report approvals</span>
              </NavLink>
            </>
          )}

          {role === 'HR_ADMIN' && (
            <>
              <div className="sidebar-section-label">HR Administration</div>
              <NavLink
                to="/hr/employees"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Users size={16} />
                <span>Employee directory</span>
              </NavLink>
              <NavLink
                to="/hr/leaves"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <CalendarDays size={16} />
                <span>Leave overview (read-only)</span>
              </NavLink>
            </>
          )}

          {role === 'SYSTEM_ADMIN' && (
            <>
              <div className="sidebar-section-label">System Administration</div>
              <NavLink
                to="/admin/users"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Users size={16} />
                <span>Users & roles</span>
              </NavLink>
              <NavLink
                to="/admin/reference"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Settings size={16} />
                <span>Leave types reference</span>
              </NavLink>
              <NavLink
                to="/admin/audit"
                onClick={closeSidebar}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <ShieldAlert size={16} />
                <span>Security audit events</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="app-main-wrapper">
        <header className="app-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={sidebarOpen}
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumbs" aria-label="Breadcrumb">
              <span className="breadcrumb-root">Portal</span>
              <ChevronRight size={14} className="breadcrumb-separator" />
              <span className="breadcrumb-current">{currentBreadcrumb}</span>
            </div>
          </div>

          <div className="topbar-user">
            <div className="topbar-user-info">
              <div className="topbar-user-name">
                {user?.employee?.legal_name || user?.email}
              </div>
              <div className="topbar-user-role">
                {user?.employee?.employee_code ? `${user.employee.employee_code} · ` : ''}
                {role.replace('_', ' ')}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-logout"
              onClick={handleLogout}
              title="Sign out from portal"
            >
              <LogOut size={14} />
              <span className="logout-text">Sign out</span>
            </button>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
