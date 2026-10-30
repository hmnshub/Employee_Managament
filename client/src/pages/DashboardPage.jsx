import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FileText, MapPin, ArrowRight } from 'lucide-react';
import { apiRequest, formatHumanDate } from '../api/client.js';
import { ErrorBanner, StatusBadge, TableSkeleton } from '../components/AppShell.jsx';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, balanceRes, leavesRes, payslipsRes] = await Promise.all([
        apiRequest('/api/employees/me'),
        apiRequest('/api/leaves/balance'),
        apiRequest('/api/leaves/my', { query: { page: 1, pageSize: 5 } }),
        apiRequest('/api/payslips', { query: { page: 1, pageSize: 3 } })
      ]);
      setData({
        profile: profileRes.data.profile,
        address: profileRes.data.address,
        balances: balanceRes.data.balances || [],
        fiscalYear: balanceRes.data.year || new Date().getFullYear(),
        recentLeaves: leavesRes.data || [],
        recentPayslips: payslipsRes.data || []
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <TableSkeleton rows={6} />;
  if (error) return <ErrorBanner error={error} onRetry={loadDashboard} />;
  if (!data) return null;

  const { profile, address, balances, fiscalYear, recentLeaves, recentPayslips } = data;
  const totalAvailableDays = balances.reduce((acc, b) => acc + (b.available_days || 0), 0);
  const totalUsedDays = balances.reduce((acc, b) => acc + (b.used_days || 0), 0);
  const totalPendingDays = balances.reduce((acc, b) => acc + (b.pending_days || 0), 0);
  const latestPayslip = recentPayslips[0];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Employee Overview</h2>
          <p className="page-description">
            {profile.legal_name} ({profile.employee_code}) · {profile.designation}, {profile.department}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/leaves" className="btn btn-primary">
            <CalendarDays size={15} /> Request leave
          </Link>
          <Link to="/profile" className="btn btn-secondary">
            <MapPin size={15} /> Update address
          </Link>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-label">Total available leave (FY {fiscalYear})</div>
          <div className="metric-value">
            {totalAvailableDays} days
          </div>
          <div className="metric-sub">
            Across {balances.length} categories · {totalUsedDays} used · {totalPendingDays} pending
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Latest issued payslip</div>
          <div className="metric-value">
            {latestPayslip
              ? `${latestPayslip.currency} ${Number(latestPayslip.net_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : '—'}
          </div>
          <div className="metric-sub">
            {latestPayslip
              ? `Paid on ${formatHumanDate(latestPayslip.payment_date)} (${latestPayslip.bank_account_masked})`
              : 'No issued payslips'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Current residential address</div>
          <div className="metric-value" style={{ fontSize: '15px', marginTop: '4px' }}>
            {address ? `${address.residential_line1}, ${address.residential_city}` : 'Not set'}
          </div>
          <div className="metric-sub">
            {address
              ? `${address.residential_state} ${address.residential_postal_code} · Version v${address.version}`
              : 'Update in profile settings'}
          </div>
        </div>
      </div>

      {/* Leave Quotas & Balances - All Categories Synced from DB */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Leave Quotas & Balances</h3>
              <span className="badge badge-success" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Synced with DB · FY {fiscalYear}
              </span>
            </div>
            <p className="page-description" style={{ marginTop: '4px', marginBottom: 0, fontSize: '13px' }}>
              All quotas renew annually per fiscal year (Jan 1 – Dec 31). Applying for leave deducts pending and approved days in real time.
            </p>
          </div>
          <Link to="/leaves" className="btn btn-secondary btn-sm">
            <CalendarDays size={13} /> Manage leaves
          </Link>
        </div>

        {balances.length === 0 ? (
          <div className="empty-state">No leave quotas found for this fiscal year.</div>
        ) : (
          <div className="grid-4" style={{ gap: '14px', marginTop: '4px' }}>
            {balances.map((b) => {
              const allocated = b.allocated_days || 0;
              const used = b.used_days || 0;
              const pending = b.pending_days || 0;
              const available = b.available_days ?? (allocated - used - pending);
              const totalTaken = used + pending;
              const usedPercent = allocated > 0 ? Math.min(100, Math.round((totalTaken / allocated) * 100)) : 0;

              return (
                <div
                  key={b.id || b.leave_type_code}
                  style={{
                    backgroundColor: 'var(--color-bg, #ffffff)',
                    border: '1px solid var(--color-border, #E5E1D6)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-soft-lime, #E8EDCF)',
                          color: 'var(--color-charcoal, #191C18)'
                        }}
                      >
                        {b.leave_type_code}
                      </span>
                      {b.is_paid && (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                          Paid Leave
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-charcoal, #191C18)', marginBottom: '4px' }}>
                      {b.leave_type_name}
                    </div>
                    {b.description && (
                      <div style={{ fontSize: '12px', color: 'var(--color-muted-grey, #777A70)', marginBottom: '14px', minHeight: '32px', lineHeight: 1.35 }}>
                        {b.description}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '26px', fontWeight: 700, color: available > 0 ? 'var(--color-charcoal, #191C18)' : '#dc2626' }}>
                        {available}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--color-muted-grey, #777A70)' }}>
                        days available
                      </span>
                    </div>

                    {/* Visual Quota Progress Bar */}
                    <div
                      style={{
                        height: '6px',
                        width: '100%',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}
                      title={`${totalTaken} of ${allocated} days consumed`}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${usedPercent}%`,
                          backgroundColor: usedPercent > 80 ? 'var(--color-orange, #F47738)' : 'var(--color-acid-lime, #D6F23A)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-muted-grey, #777A70)' }}>
                      <span>Quota: <strong>{allocated}d</strong></span>
                      <span>Used: <strong>{used}d</strong></span>
                      {pending > 0 ? (
                        <span style={{ color: 'var(--color-orange, #F47738)', fontWeight: 600 }}>
                          Pending: {pending}d
                        </span>
                      ) : (
                        <span>Pending: 0d</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <h3 className="card-title">Recent leave requests</h3>
            <Link to="/leaves" className="btn btn-secondary btn-sm">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {recentLeaves.length === 0 ? (
            <div className="empty-state">No leave requests submitted yet.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaves.map((req) => (
                    <tr key={req.id}>
                      <td>{req.leave_type_name}</td>
                      <td>
                        {formatHumanDate(req.start_date)} – {formatHumanDate(req.end_date)}
                      </td>
                      <td>{req.total_days}</td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3 className="card-title">Recent payslips</h3>
            <Link to="/payslips" className="btn btn-secondary btn-sm">
              All payslips <FileText size={13} />
            </Link>
          </div>
          {recentPayslips.length === 0 ? (
            <div className="empty-state">No payslips issued yet.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Payment date</th>
                    <th>Net pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayslips.map((ps) => (
                    <tr key={ps.id}>
                      <td>
                        {String(ps.pay_period_month).padStart(2, '0')}/{ps.pay_period_year}
                      </td>
                      <td>{formatHumanDate(ps.payment_date)}</td>
                      <td>
                        {ps.currency} {Number(ps.net_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <StatusBadge status={ps.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
