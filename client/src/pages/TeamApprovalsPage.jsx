import React, { useEffect, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { apiRequest, formatHumanDate } from '../api/client.js';
import {
  ConfirmDialog,
  ErrorBanner,
  PaginationControls,
  StatusBadge,
  SuccessBanner,
  TableSkeleton
} from '../components/AppShell.jsx';

export function TeamApprovalsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('asc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state for Approve / Reject decision
  const [decisionModal, setDecisionModal] = useState(null); // { req, decision: 'APPROVED' | 'REJECTED' }
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTeamLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/leaves/team', {
        query: { page, pageSize: 10, status: statusFilter, sortBy, sortOrder }
      });
      setItems(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchTeamLeaves();
  }, [fetchTeamLeaves]);

  const openDecisionModal = (req, decision) => {
    setDecisionModal({ req, decision });
    setComment('');
    setCommentError('');
  };

  const handleConfirmDecision = async () => {
    if (!decisionModal) return;
    const { req, decision } = decisionModal;

    if (decision === 'REJECTED' && comment.trim().length < 3) {
      setCommentError('Please enter a brief explanation (at least 3 characters) when rejecting a request.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/api/leaves/${req.id}/decision`, {
        method: 'PATCH',
        body: {
          decision,
          comment: comment.trim() || (decision === 'APPROVED' ? 'Approved by manager.' : ''),
          version: req.version
        }
      });
      setDecisionModal(null);
      setSuccessMsg(
        `Leave request for ${req.employee_name} (${formatHumanDate(req.start_date)} – ${formatHumanDate(
          req.end_date
        )}) has been ${decision.toLowerCase()}.`
      );
      await fetchTeamLeaves();
    } catch (err) {
      setError(err);
      setDecisionModal(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Direct Report Leave Approvals</h2>
          <p className="page-description">
            Review and decide pending leave requests strictly for employees who report directly to you.
          </p>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={fetchTeamLeaves} />
      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

      <section className="card">
        <div className="table-toolbar">
          <h3 className="card-title">Direct reports leave queue</h3>

          <div className="table-filters">
            <label htmlFor="team-status-filter" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Workflow status:
            </label>
            <select
              id="team-status-filter"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All requests</option>
              <option value="PENDING">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <label htmlFor="team-sort" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Sort:
            </label>
            <select
              id="team-sort"
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':');
                setSortBy(f);
                setSortOrder(o);
                setPage(1);
              }}
            >
              <option value="created_at:asc">Oldest pending first</option>
              <option value="created_at:desc">Newest submitted first</option>
              <option value="start_date:asc">Start date (earliest)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : items.length === 0 ? (
          <div className="empty-state">No direct-report leave requests match the current filter.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Decision action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{req.employee_name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {req.employee_code} · {req.designation}
                        </div>
                      </td>
                      <td>{req.leave_type_name}</td>
                      <td>
                        {formatHumanDate(req.start_date)} – {formatHumanDate(req.end_date)}
                      </td>
                      <td>{req.total_days}</td>
                      <td style={{ maxWidth: '240px' }}>{req.reason}</td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td>
                        {req.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openDecisionModal(req, 'APPROVED')}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => openDecisionModal(req, 'REJECTED')}
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Decided ({formatHumanDate(req.decided_at)})
                          </span>
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
        open={Boolean(decisionModal)}
        title={
          decisionModal?.decision === 'APPROVED'
            ? 'Approve leave request?'
            : 'Reject leave request?'
        }
        description={
          decisionModal
            ? `${decisionModal.req.employee_name} requested ${decisionModal.req.total_days} day(s) of ${
                decisionModal.req.leave_type_name
              } from ${formatHumanDate(decisionModal.req.start_date)} to ${formatHumanDate(
                decisionModal.req.end_date
              )}.`
            : ''
        }
        confirmLabel={decisionModal?.decision === 'APPROVED' ? 'Confirm approval' : 'Confirm rejection'}
        danger={decisionModal?.decision === 'REJECTED'}
        submitting={submitting}
        onConfirm={handleConfirmDecision}
        onCancel={() => setDecisionModal(null)}
      >
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="decision-comment" className="form-label">
            Manager comment {decisionModal?.decision === 'REJECTED' ? '(required) *' : '(optional)'}
          </label>
          <textarea
            id="decision-comment"
            rows={2}
            className={`form-textarea ${commentError ? 'has-error' : ''}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add context for the employee..."
          />
          {commentError && <div className="field-error">{commentError}</div>}
        </div>
      </ConfirmDialog>
    </div>
  );
}
