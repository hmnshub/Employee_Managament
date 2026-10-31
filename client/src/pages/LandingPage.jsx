import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
  User,
  Users,
  Shield,
  FileText,
  CalendarCheck2,
  KeyRound,
  Database,
  Lock,
  Layers,
  FileCheck2,
  FolderGit2,
  ClipboardList,
  Check,
  Clock,
  ShieldAlert,
  Calendar,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LoginForm } from '../components/LoginForm.jsx';
import '../styles/landing.css';

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const focusLogin = (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    if (emailInput) {
      emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => emailInput.focus(), 300);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-layout">
      {/* Top Enterprise Navigation Header */}
      <header className="landing-header" role="banner">
        <div className="landing-container header-inner">
          <Link to="/" className="brand-logo" aria-label="Employee Self-Service Portal Home">
            <div className="brand-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">Employee Self-Service</span>
              <span className="brand-badge">Enterprise Edition</span>
            </div>
          </Link>

          <nav className="header-nav" aria-label="Main Navigation">
            <a href="#showcase" onClick={(e) => scrollToSection(e, 'showcase')} className="nav-link">
              Platform Preview
            </a>
            <a href="#introduction" onClick={(e) => scrollToSection(e, 'introduction')} className="nav-link">
              Overview
            </a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="nav-link">
              How It Works
            </a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="nav-link">
              Features
            </a>
            <a href="#roles" onClick={(e) => scrollToSection(e, 'roles')} className="nav-link">
              Roles
            </a>
            <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="nav-link">
              Security
            </a>
          </nav>

          <div className="header-actions">
            {user ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate(user.landingRoute || '/dashboard')}
              >
                <span>Dashboard ({user.role})</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={focusLogin}>
                <Lock size={14} />
                <span>Portal Sign In</span>
              </button>
            )}

            <button
              type="button"
              className="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
            <div className="mobile-nav-links">
              <a
                href="#showcase"
                onClick={(e) => {
                  scrollToSection(e, 'showcase');
                  setMobileMenuOpen(false);
                }}
                className="mobile-nav-link"
              >
                Platform Preview
              </a>
              <a
                href="#introduction"
                onClick={(e) => {
                  scrollToSection(e, 'introduction');
                  setMobileMenuOpen(false);
                }}
                className="mobile-nav-link"
              >
                Overview
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  scrollToSection(e, 'how-it-works');
                  setMobileMenuOpen(false);
                }}
                className="mobile-nav-link"
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={(e) => {
                  scrollToSection(e, 'features');
                  setMobileMenuOpen(false);
                }}
                className="mobile-nav-link"
              >
                Features
              </a>
              <a
                href="#roles"
                onClick={(e) => {
                  scrollToSection(e, 'roles');
                  setMobileMenuOpen(false);
                }}
                className="mobile-nav-link"
              >
                Roles
              </a>
              <a
                href="#security"
                onClick={(e) => {
                  scrollToSection(e, 'security');
                  setMobileMenuOpen(false);
                }}
                className="mobile-nav-link"
              >
                Security
              </a>
            </div>
            <div className="mobile-nav-actions">
              {user ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(user.landingRoute || '/dashboard');
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>Dashboard ({user.role})</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    focusLogin(e);
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Lock size={14} />
                  <span>Sign In to Portal</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="main-content">
        {/* HERO SECTION */}
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="landing-container hero-container">
            {/* Left Side: Product Identity & Value Proposition */}
            <div className="hero-content">
              <div className="hero-eyebrow">
                <span className="eyebrow-pill">
                  <span className="eyebrow-dot" />
                  EMPLOYEE SELF-SERVICE PLATFORM
                </span>
              </div>

              <h1 id="hero-heading" className="hero-headline">
                Your workplace essentials, <span className="hero-highlight">all in one place.</span>
              </h1>

              <p className="hero-description">
                A centralized employee platform designed to simplify everyday workplace operations. Manage employee
                information, submit leave requests, track approvals, and access important payroll documents through one
                secure portal.
              </p>

              <div className="hero-supporting-points" aria-label="Key Platform Benefits">
                <div className="supporting-point-item">
                  <div className="point-icon-wrapper">
                    <Check size={14} />
                  </div>
                  <span>Simplified employee management</span>
                </div>
                <div className="supporting-point-item">
                  <div className="point-icon-wrapper">
                    <Check size={14} />
                  </div>
                  <span>Transparent leave and approval workflows</span>
                </div>
                <div className="supporting-point-item">
                  <div className="point-icon-wrapper">
                    <Check size={14} />
                  </div>
                  <span>Convenient access to important documents</span>
                </div>
              </div>

              <div className="hero-cta-group">
                <a
                  href="#features"
                  onClick={(e) => scrollToSection(e, 'features')}
                  className="btn btn-primary hero-primary-cta"
                >
                  <span>Explore the platform</span>
                  <ArrowRight size={16} />
                </a>

                <a
                  href="#how-it-works"
                  onClick={(e) => scrollToSection(e, 'how-it-works')}
                  className="btn btn-secondary hero-secondary-cta"
                >
                  <span>Learn how it works</span>
                  <ArrowDown size={15} />
                </a>
              </div>

              <div className="hero-trust-bar">
                <span className="trust-item">
                  <Shield size={13} /> Role-Based Access
                </span>
                <span className="trust-divider">•</span>
                <span className="trust-item">
                  <Lock size={13} /> CSRF Protected
                </span>
                <span className="trust-divider">•</span>
                <span className="trust-item">
                  <Database size={13} /> Row Level Security
                </span>
              </div>
            </div>

            {/* Right Side: Reusable Portal Login Card */}
            <div className="hero-login-column">
              <LoginForm inHero={true} />
            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE PREVIEW */}
        <section id="showcase" className="section-showcase" aria-label="Product Interface Preview">
          <div className="landing-container">
            <div className="section-header-block">
              <span className="section-eyebrow">ENTERPRISE INTERFACE</span>
              <h2 className="section-title">Designed for precision & daily clarity</h2>
              <p className="section-lead">
                An authenticated employee environment presenting essential balance metrics, approval timelines, and
                payroll documentation without friction.
              </p>
            </div>

            <div className="showcase-window">
              <div className="window-titlebar">
                <div className="window-dots">
                  <span className="window-dot" />
                  <span className="window-dot" />
                  <span className="window-dot" />
                </div>
                <div className="window-address">https://portal.enterprise.demo/dashboard</div>
                <div className="window-status">
                  <Sparkles size={12} />
                  <span>Session Encrypted</span>
                </div>
              </div>

              <div className="showcase-body">
                {/* User Header */}
                <div className="preview-top-banner">
                  <div className="preview-user-block">
                    <div className="preview-avatar">AS</div>
                    <div>
                      <h3 className="preview-name">Aayush Shrestha</h3>
                      <p className="preview-meta">Platform Engineering &bull; Senior Backend Engineer &bull; EMP-1005</p>
                    </div>
                  </div>
                  <div className="preview-badges">
                    <span className="badge-lime">ROLE: EMPLOYEE</span>
                    <span className="badge-orange">1 ACTION QUEUED</span>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="preview-metrics-grid">
                  <div className="preview-metric-card accent-card">
                    <div className="preview-metric-label">Annual Leave Balance</div>
                    <div className="preview-metric-val">18 Days</div>
                    <div className="preview-metric-sub">Allocated: 20 Days &bull; Used: 2 Days</div>
                  </div>

                  <div className="preview-metric-card orange-card">
                    <div className="preview-metric-label">Pending Approval Requests</div>
                    <div className="preview-metric-val">1 In Review</div>
                    <div className="preview-metric-sub">Direct Manager: Suman Karki</div>
                  </div>

                  <div className="preview-metric-card">
                    <div className="preview-metric-label">Latest Available Payslip</div>
                    <div className="preview-metric-val">October 2026</div>
                    <div className="preview-metric-sub">Status: Issued &bull; Streaming PDF Ready</div>
                  </div>
                </div>

                {/* Real-looking Leave Table Snippet */}
                <div className="preview-table-card">
                  <div className="preview-table-header">
                    <span>Recent Leave Applications</span>
                    <span style={{ fontSize: '11px', color: '#777A70' }}>Real-time Synchronized</span>
                  </div>
                  <table className="preview-mini-table">
                    <thead>
                      <tr>
                        <th>Leave Type</th>
                        <th>Date Interval</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Annual Leave</strong></td>
                        <td>14 Nov 2026 – 18 Nov 2026</td>
                        <td>5 working days</td>
                        <td><span className="badge-orange">Pending Review</span></td>
                      </tr>
                      <tr>
                        <td><strong>Casual Leave</strong></td>
                        <td>02 Oct 2026 – 03 Oct 2026</td>
                        <td>2 working days</td>
                        <td><span className="badge-lime">Approved</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION A: PLATFORM INTRODUCTION */}
        <section id="introduction" className="landing-section section-intro">
          <div className="landing-container">
            <div className="section-header-block">
              <span className="section-eyebrow">PLATFORM ARCHITECTURE</span>
              <h2 className="section-title">One platform. Multiple workplace needs.</h2>
              <p className="section-lead">
                This application centralizes common employee operations and connects employees, managers, HR
                administrators and system administrators through unified data models and auditable workflows.
              </p>
            </div>

            <div className="intro-grid">
              <div className="intro-card">
                <div className="intro-card-icon">
                  <Layers size={22} />
                </div>
                <h3 className="intro-card-title">Unified Workplace Hub</h3>
                <p className="intro-card-text">
                  Replaces disconnected spreadsheets, ad-hoc paper forms, and isolated email threads with a single
                  coherent system of record for personal contact details, time-off requests, and payslip distribution.
                </p>
              </div>

              <div className="intro-card">
                <div className="intro-card-icon">
                  <Users size={22} />
                </div>
                <h3 className="intro-card-title">Connected Responsibilities</h3>
                <p className="intro-card-text">
                  Eliminates departmental silos by bridging daily employee requests directly to manager decision
                  queues, organizational HR visibility dashboards, and system-level administrative configuration.
                </p>
              </div>

              <div className="intro-card">
                <div className="intro-card-icon">
                  <FileCheck2 size={22} />
                </div>
                <h3 className="intro-card-title">Consistent Operations</h3>
                <p className="intro-card-text">
                  Enforces validated organization rules for leave date intervals, mandatory rejection explanations, and
                  optimistic concurrency locks on personal contact details to guarantee state integrity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION B: HOW IT WORKS */}
        <section id="how-it-works" className="landing-section section-how">
          <div className="landing-container">
            <div className="section-header-block">
              <span className="section-eyebrow">OPERATIONAL WORKFLOW</span>
              <h2 className="section-title">How It Works</h2>
              <p className="section-lead">
                A predictable, transparent lifecycle moving requests from employee initiation to manager decision and
                administrative oversight.
              </p>
            </div>

            <div className="timeline-wrapper">
              <div className="timeline-horizontal">
                {/* Step 01 */}
                <div className="timeline-step">
                  <div className="step-node-header">
                    <span className="step-number">01</span>
                    <div className="step-line" />
                  </div>
                  <div className="step-content">
                    <h3 className="step-title">01 — Employee Access</h3>
                    <p className="step-desc">
                      Employees log in and access their personal dashboard, profile, leave balances and payslips.
                    </p>
                    <div className="step-meta">
                      <span className="step-tag">Single Sign-On</span>
                      <span className="step-tag">Overview</span>
                    </div>
                  </div>
                </div>

                {/* Step 02 */}
                <div className="timeline-step">
                  <div className="step-node-header">
                    <span className="step-number">02</span>
                    <div className="step-line" />
                  </div>
                  <div className="step-content">
                    <h3 className="step-title">02 — Submit Requests</h3>
                    <p className="step-desc">
                      Employees submit leave applications and manage their profile information.
                    </p>
                    <div className="step-meta">
                      <span className="step-tag">Date Validation</span>
                      <span className="step-tag">Address Updates</span>
                    </div>
                  </div>
                </div>

                {/* Step 03 */}
                <div className="timeline-step">
                  <div className="step-node-header">
                    <span className="step-number step-orange">03</span>
                    <div className="step-line" />
                  </div>
                  <div className="step-content">
                    <h3 className="step-title">03 — Manager Review</h3>
                    <p className="step-desc">
                      Direct reporting managers review pending leave requests and approve or reject them.
                    </p>
                    <div className="step-meta">
                      <span className="step-tag-orange">Action Gate</span>
                      <span className="step-tag">Atomic Balance</span>
                    </div>
                  </div>
                </div>

                {/* Step 04 */}
                <div className="timeline-step">
                  <div className="step-node-header">
                    <span className="step-number">04</span>
                  </div>
                  <div className="step-content">
                    <h3 className="step-title">04 — Organization Management</h3>
                    <p className="step-desc">
                      HR administrators access employee and organization leave overviews, while system administrators
                      manage accounts, roles, leave types and security audit records.
                    </p>
                    <div className="step-meta">
                      <span className="step-tag">Company Directory</span>
                      <span className="step-tag">Audit Logs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION C: PLATFORM FEATURES */}
        <section id="features" className="landing-section section-features">
          <div className="landing-container">
            <div className="section-header-block">
              <span className="section-eyebrow">PORTAL CAPABILITIES</span>
              <h2 className="section-title">Platform Features</h2>
              <p className="section-lead">
                Every feature maps strictly to the functional implementations of this enterprise application.
              </p>
            </div>

            <div className="features-grid">
              {/* Feature 1 */}
              <div className="feature-card">
                <div className="feature-icon-box">
                  <User size={20} />
                </div>
                <div className="feature-body">
                  <h3 className="feature-title">1. Employee Profile Management</h3>
                  <p className="feature-desc">
                    Employees can access and update their personal information and residential or mailing addresses.
                  </p>
                  <ul className="feature-specs">
                    <li>
                      <Check size={14} /> Self-service address and contact updates
                    </li>
                    <li>
                      <Check size={14} /> Optimistic concurrency version locking
                    </li>
                    <li>
                      <Check size={14} /> Read-only protection for corporate attributes
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="feature-card card-ivory">
                <div className="feature-icon-box">
                  <CalendarCheck2 size={20} />
                </div>
                <div className="feature-body">
                  <h3 className="feature-title">2. Leave Management</h3>
                  <p className="feature-desc">
                    Employees can submit leave requests and monitor their leave balances and request statuses.
                  </p>
                  <ul className="feature-specs">
                    <li>
                      <Check size={14} /> Real-time category quota tracking
                    </li>
                    <li>
                      <Check size={14} /> Overlap rejection & date boundary validation
                    </li>
                    <li>
                      <Check size={14} /> Self-cancellation for pending requests
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="feature-card">
                <div className="feature-icon-box icon-orange">
                  <ClipboardList size={20} />
                </div>
                <div className="feature-body">
                  <h3 className="feature-title">3. Team Approvals</h3>
                  <p className="feature-desc">
                    Managers can review and decide on requests from their direct reporting employees.
                  </p>
                  <ul className="feature-specs">
                    <li>
                      <Check size={14} /> Scoped queue strictly for direct reports
                    </li>
                    <li>
                      <Check size={14} /> Mandatory comments on leave rejections
                    </li>
                    <li>
                      <Check size={14} /> Atomic balance deduction upon approval
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="feature-card card-ivory">
                <div className="feature-icon-box">
                  <FileText size={20} />
                </div>
                <div className="feature-body">
                  <h3 className="feature-title">4. Payslip Management</h3>
                  <p className="feature-desc">
                    Authorized employees can access their available payslip documents.
                  </p>
                  <ul className="feature-specs">
                    <li>
                      <Check size={14} /> Authenticated, streaming PDF downloads
                    </li>
                    <li>
                      <Check size={14} /> Itemized gross, tax, and net breakdowns
                    </li>
                    <li>
                      <Check size={14} /> Strict individual access control (no BOLA)
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="feature-card">
                <div className="feature-icon-box">
                  <FolderGit2 size={20} />
                </div>
                <div className="feature-body">
                  <h3 className="feature-title">5. HR Overview</h3>
                  <p className="feature-desc">
                    HR administrators can view the employee directory and organization-wide leave overview.
                  </p>
                  <ul className="feature-specs">
                    <li>
                      <Check size={14} /> Filterable employee personnel directory
                    </li>
                    <li>
                      <Check size={14} /> Department and position visibility
                    </li>
                    <li>
                      <Check size={14} /> Organization-wide time-off scheduling view
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="feature-card card-ivory">
                <div className="feature-icon-box">
                  <ShieldAlert size={20} />
                </div>
                <div className="feature-body">
                  <h3 className="feature-title">6. Administration</h3>
                  <p className="feature-desc">
                    System administrators can manage users, role assignments, leave type reference data and security
                    audit logs.
                  </p>
                  <ul className="feature-specs">
                    <li>
                      <Check size={14} /> User account creation & status locking
                    </li>
                    <li>
                      <Check size={14} /> Annual leave quota reference tables
                    </li>
                    <li>
                      <Check size={14} /> Comprehensive security event audit logs
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION D: ROLE-BASED ACCESS */}
        <section id="roles" className="landing-section section-roles">
          <div className="landing-container">
            <div className="section-header-block">
              <span className="section-eyebrow">ACCESS GOVERNANCE</span>
              <h2 className="section-title">Role-Based Access</h2>
              <p className="section-lead">
                Four distinct operational roles ensure team members and administrators only see and perform what their
                corporate duties permit.
              </p>
            </div>

            <div className="roles-grid">
              {/* Role 1: EMPLOYEE */}
              <div className="role-card">
                <div className="role-card-header">
                  <span className="role-badge">ROLE 01</span>
                  <h3 className="role-name">EMPLOYEE</h3>
                </div>
                <p className="role-summary">
                  Access personal information, leave management and payslips.
                </p>
                <div className="role-divider" />
                <div className="role-details">
                  <div className="role-detail-label">Authorized Operations:</div>
                  <ul className="role-detail-list">
                    <li>Inspect personal job title, department & reporting manager</li>
                    <li>Update residential mailing address and contact details</li>
                    <li>Submit and cancel personal leave applications</li>
                    <li>View and download personal monthly payslip PDFs</li>
                  </ul>
                </div>
              </div>

              {/* Role 2: MANAGER */}
              <div className="role-card role-card-highlight">
                <div className="role-card-header">
                  <span className="role-badge badge-orange-tag">ROLE 02 &bull; APPROVER</span>
                  <h3 className="role-name">MANAGER</h3>
                </div>
                <p className="role-summary">
                  Review and decide on leave requests submitted by direct reporting employees.
                </p>
                <div className="role-divider" />
                <div className="role-details">
                  <div className="role-detail-label">Authorized Operations:</div>
                  <ul className="role-detail-list">
                    <li>Retains all standard Employee self-service capabilities</li>
                    <li>View dedicated Team Leave Approvals queue</li>
                    <li>Approve requests with automatic atomic balance deductions</li>
                    <li>Reject requests with recorded rationale comments</li>
                  </ul>
                </div>
              </div>

              {/* Role 3: HR ADMIN */}
              <div className="role-card">
                <div className="role-card-header">
                  <span className="role-badge">ROLE 03</span>
                  <h3 className="role-name">HR ADMIN</h3>
                </div>
                <p className="role-summary">
                  Access the employee directory and organizational leave overview.
                </p>
                <div className="role-divider" />
                <div className="role-details">
                  <div className="role-detail-label">Authorized Operations:</div>
                  <ul className="role-detail-list">
                    <li>Retains standard Employee self-service capabilities</li>
                    <li>Search and inspect organization-wide employee directory</li>
                    <li>Filter workforce by department, role, and active status</li>
                    <li>Monitor global leave calendar and organizational absence</li>
                  </ul>
                </div>
              </div>

              {/* Role 4: SYSTEM ADMIN */}
              <div className="role-card">
                <div className="role-card-header">
                  <span className="role-badge">ROLE 04</span>
                  <h3 className="role-name">SYSTEM ADMIN</h3>
                </div>
                <p className="role-summary">
                  Manage user accounts, role assignments, leave types and security audit information.
                </p>
                <div className="role-divider" />
                <div className="role-details">
                  <div className="role-detail-label">Authorized Operations:</div>
                  <ul className="role-detail-list">
                    <li>Provision user credentials and assign access roles</li>
                    <li>Lock or unlock user accounts on security suspicion</li>
                    <li>Manage organizational leave policies and default allowances</li>
                    <li>Inspect immutable security audit event records</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION E: SECURITY AND PRIVACY (CHARCOAL SECTION) */}
        <section id="security" className="landing-section section-security">
          <div className="landing-container">
            <div className="section-header-block">
              <span className="section-eyebrow eyebrow-lime">DATA SAFEGUARDS</span>
              <h2 className="section-title">Security and Privacy</h2>
              <p className="section-lead">
                Built upon defensive software engineering practices to safeguard sensitive corporate personnel records
                and financial data.
              </p>
            </div>

            <div className="security-grid">
              <div className="security-item">
                <div className="security-item-icon">
                  <KeyRound size={18} />
                </div>
                <div className="security-item-content">
                  <h3 className="security-item-title">Secure Session-Based Authentication</h3>
                  <p className="security-item-desc">
                    Opaque 256-bit cryptographically random tokens stored in HttpOnly, SameSite cookies with SHA-256
                    server-side hashed verification. Tokens are never exposed to browser client scripts.
                  </p>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon icon-orange">
                  <ShieldCheck size={18} />
                </div>
                <div className="security-item-content">
                  <h3 className="security-item-title">CSRF Protection for State-Changing Operations</h3>
                  <p className="security-item-desc">
                    In-memory per-session tokens validated in constant time on all POST, PATCH, PUT, and DELETE requests
                    to protect users against cross-site request forgery attacks.
                  </p>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <Lock size={18} />
                </div>
                <div className="security-item-content">
                  <h3 className="security-item-title">Role-Based Authorization (RBAC)</h3>
                  <p className="security-item-desc">
                    Server-enforced endpoint middleware checks user roles on every incoming request, strictly rejecting
                    unauthorized vertical privilege escalation attempts with standardized HTTP 403 responses.
                  </p>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <Database size={18} />
                </div>
                <div className="security-item-content">
                  <h3 className="security-item-title">Database Row Level Security (RLS)</h3>
                  <p className="security-item-desc">
                    PostgreSQL database policies enforce tenancy and ownership boundaries directly at the storage
                    layer, guaranteeing that queries only return data belonging to the authorized context.
                  </p>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <Shield size={18} />
                </div>
                <div className="security-item-content">
                  <h3 className="security-item-title">Controlled Access to Employee Information</h3>
                  <p className="security-item-desc">
                    Prevents Broken Object-Level Authorization (BOLA). Direct report verification ensures managers can
                    only evaluate their own team members, and payslips can never be fetched across accounts.
                  </p>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <Clock size={18} />
                </div>
                <div className="security-item-content">
                  <h3 className="security-item-title">Security Audit Event Tracking</h3>
                  <p className="security-item-desc">
                    Sensitive operations—including authentication attempts, address updates, leave approvals, and role
                    changes—are recorded in a structured audit log with actor ID, IP address, and timestamp.
                  </p>
                </div>
              </div>

              <div className="security-item">
                <div className="security-item-icon">
                  <FileCheck2 size={18} />
                </div>
                <div className="security-item-content">
                  <h3 className="security-item-title">Validated Inputs and Server-Side Request Handling</h3>
                  <p className="security-item-desc">
                    Strict parameter allow-listing, HTML entity stripping to prevent Cross-Site Scripting (XSS), SQL
                    injection immunity through parameterized drivers, and account lockout after repeated failed logins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION F: FINAL CTA */}
        <section className="landing-section section-final-cta">
          <div className="landing-container">
            <div className="final-cta-card">
              <div className="final-cta-content">
                <h2 className="final-cta-heading">Everything starts with one secure sign-in.</h2>
                <p className="final-cta-desc">
                  Access your employee workspace and manage your workplace essentials from one place.
                </p>
              </div>

              <div className="final-cta-actions">
                <Link to="/login" className="btn btn-primary btn-final-sign-in">
                  <Lock size={16} />
                  <span>Sign in to your portal</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER (CHARCOAL BACKGROUND) */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-container footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-title">Employee Self-Service Portal</div>
            <p className="footer-brand-desc">
              Centralized enterprise platform for employee profiles, time-off management, team approvals, and secure
              payroll distribution.
            </p>
          </div>

          <div className="footer-links-group">
            <span className="footer-group-heading">Navigation</span>
            <ul className="footer-nav-list">
              <li>
                <a href="#showcase" onClick={(e) => scrollToSection(e, 'showcase')}>
                  Platform Preview
                </a>
              </li>
              <li>
                <a href="#introduction" onClick={(e) => scrollToSection(e, 'introduction')}>
                  Platform Overview
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>
                  Platform Features
                </a>
              </li>
              <li>
                <a href="#roles" onClick={(e) => scrollToSection(e, 'roles')}>
                  Role-Based Access
                </a>
              </li>
              <li>
                <a href="#security" onClick={(e) => scrollToSection(e, 'security')}>
                  Security & Privacy
                </a>
              </li>
              <li>
                <Link to="/login">Portal Login</Link>
              </li>
            </ul>
          </div>

          <div className="footer-meta-group">
            <span className="footer-group-heading">Architecture</span>
            <div className="footer-meta-text">
              Multi-Role Access Control
              <br />
              Session & RLS Enforced
              <br />
              Enterprise Audit Trails
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="landing-container bottom-bar-inner">
            <span>&copy; {new Date().getFullYear()} Employee Self-Service Portal. All rights reserved.</span>
            <span className="footer-subtle-badge">Enterprise Edition</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
