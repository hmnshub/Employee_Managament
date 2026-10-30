import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from './AppShell.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Employee (Aayush)', email: 'aayush.shrestha@portal.demo', pass: 'EmployeePass#2026!' },
  { label: 'Manager (Suman)', email: 'suman.karki@portal.demo', pass: 'ManagerOne#2026!' },
  { label: 'HR Admin (Bishnu)', email: 'hradmin@portal.demo', pass: 'HrAdminPortal#2026!' },
  { label: 'System Admin (Rameshwar)', email: 'sysadmin@portal.demo', pass: 'AdminPortal#2026!' }
];

export function LoginForm({ inHero = false, showDemoAccounts = true }) {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.landingRoute || '/dashboard', { replace: true });
    } catch (err) {
      setError(err);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setError(null);
    setFieldErrors({});
  };

  // If user is already authenticated, provide a seamless jump into their dashboard
  if (user) {
    return (
      <div className={`login-panel ${inHero ? 'login-panel-hero' : ''}`} id="login-panel">
        <div className="login-panel-header">
          <div className="login-panel-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2 className="login-panel-title">Active Session Detected</h2>
            <p className="login-panel-subtitle">
              You are signed in as <strong>{user.fullName || user.email}</strong>
            </p>
          </div>
        </div>

        <div className="login-active-session-body">
          <div className="session-role-badge">
            Role: <strong>{user.role}</strong>
          </div>
          <p className="session-desc">
            Your secure corporate session is active. Access your role-specific dashboard directly or switch accounts.
          </p>

          <div className="session-actions">
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => navigate(user.landingRoute || '/dashboard')}
            >
              <span>Go to your dashboard</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={logout}
            >
              Sign out from portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`login-panel ${inHero ? 'login-panel-hero' : ''}`} id="login-panel">
      <div className="login-panel-header">
        <div className="login-panel-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="login-panel-title">Employee Self-Service Portal</h2>
          <p className="login-panel-subtitle">Sign in with your corporate credentials</p>
        </div>
      </div>

      <ErrorBanner error={error} />

      <form onSubmit={handleSubmit} noValidate className="login-form">
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Work email address
          </label>
          <input
            id="login-email"
            type="email"
            className={`form-input ${fieldErrors.email ? 'has-error' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@portal.demo"
            autoComplete="username"
            required
            disabled={submitting}
          />
          {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="login-password" className="form-label">
              Password (minimum 12 characters)
            </label>
          </div>
          <div className="password-input-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              disabled={submitting}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
        </div>

        <button type="submit" className="btn btn-primary btn-login-submit" disabled={submitting}>
          <Lock size={15} />
          <span>{submitting ? 'Signing in...' : 'Sign in to portal'}</span>
        </button>

        <div className="login-security-notice">
          <Lock size={12} />
          <span>Session-encrypted corporate gateway with audit tracking</span>
        </div>
      </form>

      {/* Demo seed accounts only displayed in development mode */}
      {showDemoAccounts && import.meta.env.DEV && (
        <div className="demo-accounts-section">
          <div className="demo-accounts-header">
            <span>Quick fill demo credentials (development seed):</span>
          </div>
          <div className="demo-accounts-grid">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="btn btn-secondary btn-sm demo-account-btn"
                onClick={() => fillDemo(acc)}
                title={`Sign in as ${acc.label}`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
