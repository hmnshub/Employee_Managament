import React, { useEffect, useState, useCallback } from 'react';
import { CalendarPlus, XCircle } from 'lucide-react';
import { apiRequest, formatHumanDate } from '../api/client.js';
import {
  ConfirmDialog,
  ErrorBanner,
  PaginationControls,
  StatusBadge,
  SuccessBanner,
  TableSkeleton
} from '../components/AppShell.jsx';

export function LeavesPage() {
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);

  // Filters & sorting
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form state
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Feedback
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const fetchLeaveData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [balRes, reqRes] = await Promise.all([
        apiRequest('/api/leaves/balance'),
        apiRequest('/api/leaves/my', {
          query: { page, pageSize: 10, status: statusFilter, sortBy, sortOrder }
        })
      ]);
      const types = balRes.data.leaveTypes || [];
      setBalances(balRes.data.balances || []);
      setLeaveTypes(types);
      if (!leaveTypeId && types.length > 0) {
        setLeaveTypeId(types[0].id);
      }
      setRequests(reqRes.data || []);
      setPagination(reqRes.pagination || null);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sortBy, sortOrder, leaveTypeId]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessMsg('');

    // Convenience client-side check before authoritative server check
    if (startDate && endDate && endDate < startDate) {
      setFieldErrors({ end_date: 'End date must be on or after the start date.' });
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `leave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await apiRequest('/api/leaves', {
        method: 'POST',
        body: {
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          reason,
          idempotency_key: idempotencyKey
        }
      });
      setStartDate('');
      setEndDate('');
      setReason('');
      setSuccessMsg('Leave request submitted and routed to your reporting manager for approval.');
      await fetchLeaveData();
    } catch (err) {
      setFormError(err);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setFormError(null);
    try {
      await apiRequest(`/api/leaves/${cancelTarget.id}/cancel`, {
        method: 'POST',
        body: { version: cancelTarget.version }
      });
      setCancelTarget(null);
      setSuccessMsg('Pending leave request cancelled and pending days restored to your balance.');
      await fetchLeaveData();
    } catch (err) {
      setFormError(err);
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Leave Balance & Requests</h2>
          <p className="page-description">
            Review your 2026 leave entitlement, submit a new leave request, or manage pending requests.
          </p>
        </div>
      </div>

      <ErrorBanner error={loadError} onRetry={fetchLeaveData} />
      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

      {/* Balance Cards */}
      <div className="grid-4" style={{ marginBottom: '20px' }}>
        {balances.map((b) => (
          <div key={b.id} className="metric-card">
            <div className="metric-label">{b.leave_type_name}</div>
            <div className="metric-value">{b.available_days} days available</div>
            <div className="metric-sub">
              Allocated: {b.allocated_days} · Used: {b.used_days} · Pending: {b.pending_days}
            </div>
          </div>
        ))}
      </div>

      {/* Request Leave Form */}
      <section className="card" aria-labelledby="apply-leave-heading">
        <div className="card-header">
          <h3 id="apply-leave-heading" className="card-title">
            Request leave
          </h3>
        </div>

        <ErrorBanner error={formError} />

        <form onSubmit={handleApplyLeave} noValidate>
          <div className="grid-3">
            <div className="form-group">
              <label htmlFor="leave-type-select" className="form-label">
                Leave type *
              </label>
              <select
                id="leave-type-select"
                className={`form-select ${fieldErrors.leave_type_id ? 'has-error' : ''}`}
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                disabled={submitting}
              >
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code})
                  </option>
                ))}
              </select>
              {fieldErrors.leave_type_id && (
                <div className="field-error">{fieldErrors.leave_type_id}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="leave-start-date" className="form-label">
                Start date *
              </label>
              <input
                id="leave-start-date"
                type="date"
                className={`form-input ${fieldErrors.start_date ? 'has-error' : ''}`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
                required
              />
              {fieldErrors.start_date && <div className="field-error">{fieldErrors.start_date}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="leave-end-date" className="form-label">
                End date *
              </label>
              <input
                id="leave-end-date"
                type="date"
                className={`form-input ${fieldErrors.end_date ? 'has-error' : ''}`}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
                required
              />
              {fieldErrors.end_date && <div className="field-error">{fieldErrors.end_date}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="leave-reason" className="form-label">
              Reason for leave (5–500 characters, plain text) *
            </label>
            <textarea
              id="leave-reason"
              rows={2}
              className={`form-textarea ${fieldErrors.reason ? 'has-error' : ''}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide handover context or reason for leave..."
              disabled={submitting}
              required
            />
            {fieldErrors.reason && <div className="field-error">{fieldErrors.reason}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <CalendarPlus size={15} />
              <span>{submitting ? 'Submitting request...' : 'Submit leave request'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* My Leave Requests Table */}
      <section className="card" aria-labelledby="my-leaves-heading">
        <div className="table-toolbar">
          <h3 id="my-leaves-heading" className="card-title">
            My leave requests
          </h3>

          <div className="table-filters">
            <label htmlFor="filter-leave-status" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Status:
            </label>
            <select
              id="filter-leave-status"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <label htmlFor="sort-leave-by" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Sort by:
            </label>
            <select
              id="sort-leave-by"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [field, ord] = e.target.value.split(':');
                setSortBy(field);
                setSortOrder(ord);
                setPage(1);
              }}
            >
              <option value="created_at:desc">Submitted date (newest)</option>
              <option value="created_at:asc">Submitted date (oldest)</option>
              <option value="start_date:desc">Start date (newest)</option>
              <option value="start_date:asc">Start date (oldest)</option>
              <option value="total_days:desc">Duration (longest)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : requests.length === 0 ? (
          <div className="empty-state">No leave requests match the selected filters.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Manager comment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 500 }}>{req.leave_type_name}</td>
                      <td>
                        {formatHumanDate(req.start_date)} – {formatHumanDate(req.end_date)}
                      </td>
                      <td>{req.total_days}</td>
                      <td style={{ maxWidth: '240px' }}>{req.reason}</td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {req.decision_comment || '—'}
                      </td>
                      <td>
                        {req.status === 'PENDING' ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setCancelTarget(req)}
                          >
                            <XCircle size={13} /> Cancel
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel pending leave request?"
        description={
          cancelTarget
            ? `This will cancel your ${cancelTarget.leave_type_name} request (${formatHumanDate(
                cancelTarget.start_date
              )} to ${formatHumanDate(cancelTarget.end_date)}) and release ${
                cancelTarget.total_days
              } pending day(s).`
            : ''
        }
        confirmLabel="Cancel request"
        danger
        submitting={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
