import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest, formatHumanDate } from '../api/client.js';
import {
  ErrorBanner,
  PaginationControls,
  StatusBadge,
  TableSkeleton
} from '../components/AppShell.jsx';

export function HrDirectoryPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('employee_code');
  const [sortOrder, setSortOrder] = useState('asc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/hr/employees', {
        query: {
          page,
          pageSize: 10,
          search: search.trim() || undefined,
          employment_status: statusFilter || undefined,
          sortBy,
          sortOrder
        }
      });
      setItems(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">HR Employee Directory (Read-Only)</h2>
          <p className="page-description">
            Authorized HR overview of employee profiles within scope. Sensitive identifiers remain masked.
          </p>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={fetchDirectory} />

      <section className="card">
        <div className="table-toolbar">
          <div className="table-filters">
            <input
              type="search"
              className="form-input"
              style={{ width: '240px', padding: '5px 10px' }}
              placeholder="Search name or EMP-XXXX..."
              aria-label="Search employees by name or employee code"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              aria-label="Filter by employment status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All employment statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="table-filters">
            <label htmlFor="hr-dir-sort" style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Sort:
            </label>
            <select
              id="hr-dir-sort"
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
              <option value="employee_code:asc">Employee ID (A–Z)</option>
              <option value="legal_name:asc">Legal name (A–Z)</option>
              <option value="department:asc">Department (A–Z)</option>
              <option value="joining_date:desc">Joining date (newest)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : items.length === 0 ? (
          <div className="empty-state">No employees match the current search filter.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Legal name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Joining date</th>
                    <th>Phone (masked)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <code>{emp.employee_code}</code>
                      </td>
                      <td style={{ fontWeight: 600 }}>{emp.legal_name}</td>
                      <td>{emp.department}</td>
                      <td>{emp.designation}</td>
                      <td>{formatHumanDate(emp.joining_date)}</td>
                      <td>{emp.phone_masked}</td>
                      <td>
                        <StatusBadge status={emp.employment_status} />
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
    </div>
  );
}

export function HrLeavesPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/hr/leaves', {
        query: { page, pageSize: 10, status: statusFilter || undefined, sortBy, sortOrder }
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
    fetchLeaves();
  }, [fetchLeaves]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Organization Leave Overview (Read-Only)</h2>
          <p className="page-description">
            Read-only HR compliance view of leave requests across departments. Only direct reporting managers can approve or reject requests.
          </p>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={fetchLeaves} />

      <section className="card">
        <div className="table-toolbar">
          <h3 className="card-title">All employee leave records</h3>

          <div className="table-filters">
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              aria-label="Filter by leave status"
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

            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              aria-label="Sort leave records"
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':');
                setSortBy(f);
                setSortOrder(o);
                setPage(1);
              }}
            >
              <option value="created_at:desc">Submitted (newest)</option>
              <option value="start_date:desc">Start date (newest)</option>
              <option value="total_days:desc">Duration (longest)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : items.length === 0 ? (
          <div className="empty-state">No leave records found.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.employee_name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {r.employee_code}
                        </div>
                      </td>
                      <td>{r.department}</td>
                      <td>{r.leave_type_name}</td>
                      <td>
                        {formatHumanDate(r.start_date)} – {formatHumanDate(r.end_date)}
                      </td>
                      <td>{r.total_days}</td>
                      <td>
                        <StatusBadge status={r.status} />
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
    </div>
  );
}
