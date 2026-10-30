import React, { useEffect, useState, useCallback } from 'react';
import { UserPlus, PlusCircle, UserCheck, Shuffle, Sparkles } from 'lucide-react';
import { apiRequest, formatHumanDate } from '../api/client.js';
import {
  ConfirmDialog,
  ErrorBanner,
  PaginationControls,
  StatusBadge,
  SuccessBanner,
  TableSkeleton
} from '../components/AppShell.jsx';

function getNextSequentialCode(userList) {
  const codes = (userList || [])
    .map((u) => u.employee?.employee_code)
    .filter(Boolean);
  const numbers = codes
    .map((c) => {
      const match = String(c).match(/^EMP-(\d{4})$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => n !== null);

  const highest = numbers.length > 0 ? Math.max(...numbers) : 1010;
  const next = highest < 9999 ? highest + 1 : 1001;
  return `EMP-${String(next).padStart(4, '0')}`;
}

function getRandomCode(userList) {
  const existingCodes = new Set(
    (userList || [])
      .map((u) => u.employee?.employee_code)
      .filter(Boolean)
  );

  for (let attempts = 0; attempts < 500; attempts++) {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const candidate = `EMP-${randNum}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }
  return `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managers, setManagers] = useState([]);

  // Create user form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [employeeCode, setEmployeeCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [department, setDepartment] = useState('Platform Engineering');
  const [designation, setDesignation] = useState('Software Engineer');
  const [managerId, setManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Change manager modal
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [selectedUserForManager, setSelectedUserForManager] = useState(null);
  const [newManagerId, setNewManagerId] = useState('');
  const [managerSubmitting, setManagerSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const fetchManagers = useCallback(async () => {
    try {
      const res = await apiRequest('/api/admin/managers');
      setManagers(res.data || []);
    } catch {
      // Graceful fallback if managers list cannot be retrieved
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/admin/users', {
        query: {
          page,
          pageSize: 10,
          role: roleFilter || undefined,
          status: statusFilter || undefined
        }
      });
      const fetched = res.data || [];
      setUsers(fetched);
      setPagination(res.pagination || null);
      setEmployeeCode((current) => current || getNextSequentialCode(fetched));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
    fetchManagers();
  }, [fetchUsers, fetchManagers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: {
          email,
          password,
          role,
          employee_code: employeeCode,
          legal_name: legalName,
          department,
          designation,
          manager_id: managerId || undefined
        }
      });
      setEmail('');
      setPassword('');
      setLegalName('');
      setManagerId('');
      setSuccessMsg('New account and employee profile provisioned successfully.');
      
      const res = await apiRequest('/api/admin/users', {
        query: {
          page,
          pageSize: 10,
          role: roleFilter || undefined,
          status: statusFilter || undefined
        }
      });
      const updatedList = res.data || [];
      setUsers(updatedList);
      setPagination(res.pagination || null);
      setEmployeeCode(getNextSequentialCode(updatedList));
      await fetchManagers();
    } catch (err) {
      setError(err);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (u) => {
    const nextStatus = u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    setError(null);
    setSuccessMsg('');
    try {
      await apiRequest(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: { status: nextStatus }
      });
      setSuccessMsg(`Updated status for ${u.email} to ${nextStatus}.`);
      await fetchUsers();
    } catch (err) {
      setError(err);
    }
  };

  const handleOpenManagerModal = (u) => {
    setSelectedUserForManager(u);
    setNewManagerId(u.employee?.manager_id || '');
    setManagerModalOpen(true);
  };

  const handleSaveManager = async () => {
    if (!selectedUserForManager) return;
    setManagerSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/api/admin/users/${selectedUserForManager.id}`, {
        method: 'PATCH',
        body: { manager_id: newManagerId || null }
      });
      setSuccessMsg(`Reporting manager updated for ${selectedUserForManager.employee?.legal_name || selectedUserForManager.email}.`);
      setManagerModalOpen(false);
      setSelectedUserForManager(null);
      await fetchUsers();
    } catch (err) {
      setError(err);
    } finally {
      setManagerSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">System Administration: Users & Roles</h2>
          <p className="page-description">
            Manage authentication accounts, role boundaries, and reporting manager hierarchies.
          </p>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={fetchUsers} />
      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

      {/* Provision User Form */}
      <section className="card">
        <div className="card-header">
          <h3 className="card-title">Provision new user account</h3>
        </div>
        <form onSubmit={handleCreateUser} noValidate>
          <div className="grid-4">
            <div className="form-group">
              <label htmlFor="adm-email" className="form-label">Work email *</label>
              <input
                id="adm-email"
                type="email"
                className={`form-input ${fieldErrors.email ? 'has-error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@portal.demo"
                disabled={submitting}
              />
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="adm-pass" className="form-label">Initial password (12+ chars) *</label>
              <input
                id="adm-pass"
                type="password"
                className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="StrongPass#2026!"
                disabled={submitting}
              />
              {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="adm-code" className="form-label" style={{ margin: 0 }}>
                  Employee ID (EMP-XXXX) *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', lineHeight: '1.4' }}
                    onClick={() => setEmployeeCode(getNextSequentialCode(users))}
                    title="Auto-fill next sequential ID"
                  >
                    <Sparkles size={11} style={{ marginRight: '3px' }} /> Sequential
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', lineHeight: '1.4' }}
                    onClick={() => setEmployeeCode(getRandomCode(users))}
                    title="Auto-fill random unused 4-digit ID"
                  >
                    <Shuffle size={11} style={{ marginRight: '3px' }} /> Random
                  </button>
                </div>
              </div>
              <input
                id="adm-code"
                type="text"
                className={`form-input ${fieldErrors.employee_code ? 'has-error' : ''}`}
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="EMP-1011"
                disabled={submitting}
              />
              {fieldErrors.employee_code && <div className="field-error">{fieldErrors.employee_code}</div>}
              <div style={{ fontSize: '11px', color: 'var(--color-muted-grey, #777A70)', marginTop: '4px' }}>
                Auto-assigned sequentially. Click <strong>Random</strong> or <strong>Sequential</strong> to toggle.
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="adm-role" className="form-label">Role *</label>
              <select
                id="adm-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={submitting}
              >
                <option value="EMPLOYEE">EMPLOYEE</option>
                <option value="MANAGER">MANAGER</option>
                <option value="HR_ADMIN">HR_ADMIN</option>
                <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
              </select>
            </div>
          </div>

          <div className="grid-4">
            <div className="form-group">
              <label htmlFor="adm-name" className="form-label">Legal name *</label>
              <input
                id="adm-name"
                type="text"
                className={`form-input ${fieldErrors.legal_name ? 'has-error' : ''}`}
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Bikash Thapa"
                disabled={submitting}
              />
              {fieldErrors.legal_name && <div className="field-error">{fieldErrors.legal_name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="adm-dept" className="form-label">Department *</label>
              <input
                id="adm-dept"
                type="text"
                className={`form-input ${fieldErrors.department ? 'has-error' : ''}`}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={submitting}
              />
              {fieldErrors.department && <div className="field-error">{fieldErrors.department}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="adm-desig" className="form-label">Designation *</label>
              <input
                id="adm-desig"
                type="text"
                className={`form-input ${fieldErrors.designation ? 'has-error' : ''}`}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                disabled={submitting}
              />
              {fieldErrors.designation && <div className="field-error">{fieldErrors.designation}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="adm-manager" className="form-label">
                Reporting Manager (Optional)
              </label>
              <select
                id="adm-manager"
                className="form-select"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                disabled={submitting}
              >
                <option value="">No manager (Top level / Unassigned)</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.legal_name} ({m.employee_code} – {m.department})
                  </option>
                ))}
              </select>
              {fieldErrors.manager_id && <div className="field-error">{fieldErrors.manager_id}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <UserPlus size={15} />
              <span>{submitting ? 'Provisioning...' : 'Create user account'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Users Table */}
      <section className="card">
        <div className="table-toolbar">
          <h3 className="card-title">Registered user accounts</h3>
          <div className="table-filters">
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="MANAGER">MANAGER</option>
              <option value="HR_ADMIN">HR_ADMIN</option>
              <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="LOCKED">LOCKED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Reporting Manager</th>
                    <th>Status</th>
                    <th>Failed logins</th>
                    <th>Last sign-in</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.email}</td>
                      <td>
                        {u.employee ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.employee.legal_name}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              {u.employee.employee_code} &bull; {u.employee.designation}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <code>{u.role}</code>
                      </td>
                      <td>
                        {u.employee?.manager_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <UserCheck size={14} style={{ color: 'var(--accent-orange)' }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{u.employee.manager_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {u.employee.manager_code}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={u.status} />
                      </td>
                      <td>{u.failed_login_count}</td>
                      <td>{formatHumanDate(u.last_login_at, true)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenManagerModal(u)}
                            title="Reassign or change reporting manager"
                          >
                            Change Manager
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleLock(u)}
                          >
                            {u.status === 'ACTIVE' ? 'Lock account' : 'Unlock account'}
                          </button>
                        </div>
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

      {/* Change Manager Modal Dialog */}
      <ConfirmDialog
        open={managerModalOpen}
        title="Change Reporting Manager"
        description={`Assign or change the direct reporting manager for ${selectedUserForManager?.employee?.legal_name || selectedUserForManager?.email} (${selectedUserForManager?.employee?.employee_code || selectedUserForManager?.role}).`}
        confirmLabel="Save manager assignment"
        onConfirm={handleSaveManager}
        onCancel={() => {
          setManagerModalOpen(false);
          setSelectedUserForManager(null);
        }}
        submitting={managerSubmitting}
      >
        <div className="form-group" style={{ marginTop: '14px', marginBottom: '8px' }}>
          <label htmlFor="modal-manager-select" className="form-label">
            Designated Reporting Manager
          </label>
          <select
            id="modal-manager-select"
            className="form-select"
            value={newManagerId}
            onChange={(e) => setNewManagerId(e.target.value)}
            disabled={managerSubmitting}
          >
            <option value="">No manager (Top level / Unassigned)</option>
            {managers
              .filter((m) => m.id !== selectedUserForManager?.employee?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.legal_name} ({m.employee_code} – {m.department})
                </option>
              ))}
          </select>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Current manager:{' '}
            <strong>
              {selectedUserForManager?.employee?.manager_name
                ? `${selectedUserForManager.employee.manager_name} (${selectedUserForManager.employee.manager_code})`
                : 'None (Unassigned)'}
            </strong>
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

export function AdminReferencePage() {
  const [types, setTypes] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quota, setQuota] = useState(10);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/admin/leave-types');
      setTypes(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await apiRequest('/api/admin/leave-types', {
        method: 'POST',
        body: {
          code,
          name,
          description,
          default_annual_quota: Number(quota),
          is_paid: true
        }
      });
      setCode('');
      setName('');
      setDescription('');
      setSuccessMsg('Reference leave type created.');
      await loadTypes();
    } catch (err) {
      setError(err);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Reference Configuration: Leave Types</h2>
          <p className="page-description">
            Manage organization-wide leave type definitions and default annual quotas.
          </p>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={loadTypes} />
      <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />

      <section className="card">
        <div className="card-header">
          <h3 className="card-title">Add leave type definition</h3>
        </div>
        <form onSubmit={handleCreate} noValidate>
          <div className="grid-3">
            <div className="form-group">
              <label htmlFor="lt-code" className="form-label">Code (uppercase) *</label>
              <input
                id="lt-code"
                type="text"
                className={`form-input ${fieldErrors.code ? 'has-error' : ''}`}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="STUDY_LEAVE"
                disabled={submitting}
              />
              {fieldErrors.code && <div className="field-error">{fieldErrors.code}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="lt-name" className="form-label">Display name *</label>
              <input
                id="lt-name"
                type="text"
                className={`form-input ${fieldErrors.name ? 'has-error' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sabbatical / Study Leave"
                disabled={submitting}
              />
              {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="lt-quota" className="form-label">Default annual quota (days) *</label>
              <input
                id="lt-quota"
                type="number"
                min={1}
                max={365}
                className={`form-input ${fieldErrors.default_annual_quota ? 'has-error' : ''}`}
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                disabled={submitting}
              />
              {fieldErrors.default_annual_quota && (
                <div className="field-error">{fieldErrors.default_annual_quota}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lt-desc" className="form-label">Description *</label>
            <input
              id="lt-desc"
              type="text"
              className={`form-input ${fieldErrors.description ? 'has-error' : ''}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Policy description for employees..."
              disabled={submitting}
            />
            {fieldErrors.description && <div className="field-error">{fieldErrors.description}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <PlusCircle size={15} />
              <span>{submitting ? 'Saving...' : 'Add leave type'}</span>
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h3 className="card-title">Configured leave types</h3>
        </div>
        {loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Annual quota</th>
                  <th>Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.code}</code></td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>{t.description}</td>
                    <td>{t.default_annual_quota} days</td>
                    <td>{t.is_paid ? 'Yes' : 'No'}</td>
                    <td><StatusBadge status={t.is_active ? 'ACTIVE' : 'ARCHIVED'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminAuditPage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/admin/audit-events', {
        query: { page, pageSize: 15, action: actionFilter || undefined }
      });
      setEvents(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Security & Workflow Audit Log</h2>
          <p className="page-description">
            Immutable record of authentication events, access denials, address updates, leave decisions, and payslip downloads with correlation IDs.
          </p>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={loadAudit} />

      <section className="card">
        <div className="table-toolbar">
          <h3 className="card-title">Audit trail</h3>
          <div className="table-filters">
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px' }}
              aria-label="Filter by audit action"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All audit actions</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="ADDRESS_UPDATED">ADDRESS_UPDATED</option>
              <option value="LEAVE_REQUEST_CREATED">LEAVE_REQUEST_CREATED</option>
              <option value="LEAVE_REQUEST_APPROVED">LEAVE_REQUEST_APPROVED</option>
              <option value="LEAVE_REQUEST_REJECTED">LEAVE_REQUEST_REJECTED</option>
              <option value="PAYSLIP_DOWNLOADED">PAYSLIP_DOWNLOADED</option>
              <option value="ACCESS_DENIED_ROLE">ACCESS_DENIED_ROLE</option>
              <option value="ACCESS_DENIED_CSRF">ACCESS_DENIED_CSRF</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : events.length === 0 ? (
          <div className="empty-state">No audit events recorded yet.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>Action</th>
                    <th>Actor role</th>
                    <th>Target</th>
                    <th>IP address</th>
                    <th>Correlation ID</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{formatHumanDate(ev.created_at, true)}</td>
                      <td><code>{ev.action}</code></td>
                      <td>{ev.actor_role || 'ANONYMOUS'}</td>
                      <td>{ev.target_type}</td>
                      <td><code>{ev.ip_address}</code></td>
                      <td><code style={{ fontSize: '11px' }}>{ev.correlation_id}</code></td>
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
