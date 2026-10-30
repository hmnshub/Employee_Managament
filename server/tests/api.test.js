import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestHarness } from './helpers.js';

describe('API & Acceptance Criteria Tests (AC-01 through AC-05)', () => {
  let harness;

  before(async () => {
    harness = await createTestHarness();
  });

  after(async () => {
    await harness.close();
  });

  it('Health check endpoint confirms database connection and returns correlationId', async () => {
    const agent = harness.createAgent();
    const res = await agent.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.correlationId);
  });

  it('AC-01: Employee can update a valid address, persist optimistic lock version, see it after re-login, and generate a clean before/after audit event', async () => {
    const agent = harness.createAgent();

    // 1. Login as Employee (Aayush Shrestha)
    const loginRes = await agent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'EmployeePass#2026!' }
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.data.user.role, 'EMPLOYEE');
    assert.equal(loginRes.body.data.user.landingRoute, '/dashboard');
    assert.ok(loginRes.body.data.csrfToken);
    assert.match(loginRes.setCookieHeader, /HttpOnly/i);
    assert.match(loginRes.setCookieHeader, /SameSite=Strict/i);

    // 2. Fetch own profile & initial address
    const meRes = await agent.get('/api/employees/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.profile.employee_code, 'EMP-1005');
    assert.deepEqual(meRes.body.data.profile.readOnlyFields, [
      'employee_code',
      'legal_name',
      'department',
      'designation',
      'joining_date',
      'manager'
    ]);
    const initialVersion = meRes.body.data.address.version;
    assert.equal(initialVersion, 1);

    // 3. Update address via PATCH /api/employees/me/address
    const patchRes = await agent.patch('/api/employees/me/address', {
      body: {
        version: initialVersion,
        residential_line1: 'House 205, Pulchowk Road',
        residential_line2: 'Ward 3',
        residential_city: 'Lalitpur',
        residential_state: 'Bagmati',
        residential_postal_code: '44700',
        residential_country: 'NP',
        mailing_same_as_residential: true,
        mailing_line1: 'House 205, Pulchowk Road',
        mailing_line2: 'Ward 3',
        mailing_city: 'Lalitpur',
        mailing_state: 'Bagmati',
        mailing_postal_code: '44700',
        mailing_country: 'NP'
      }
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.address.residential_line1, 'House 205, Pulchowk Road');
    assert.equal(patchRes.body.data.address.version, 2);

    // 4. Stale version update returns 409 Conflict (Optimistic Locking)
    const conflictRes = await agent.patch('/api/employees/me/address', {
      body: {
        version: initialVersion, // stale version 1
        residential_line1: 'House 999, Stale Road',
        residential_city: 'Lalitpur',
        residential_state: 'Bagmati',
        residential_postal_code: '44700',
        residential_country: 'NP',
        mailing_same_as_residential: true
      }
    });
    assert.equal(conflictRes.status, 409);
    assert.equal(conflictRes.body.error.code, 'VERSION_CONFLICT');

    // 5. Logout and re-login to verify persistence (AC-01)
    const logoutRes = await agent.post('/api/auth/logout');
    assert.equal(logoutRes.status, 200);

    const reloginRes = await agent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'EmployeePass#2026!' }
    });
    assert.equal(reloginRes.status, 200);

    const afterReloginProfile = await agent.get('/api/employees/me');
    assert.equal(afterReloginProfile.status, 200);
    assert.equal(afterReloginProfile.body.data.address.residential_line1, 'House 205, Pulchowk Road');
    assert.equal(afterReloginProfile.body.data.address.version, 2);

    // 6. Verify before/after audit event exists and contains no sensitive fields
    const auditEvent = harness.repo.tables.audit_events.find((e) => e.action === 'ADDRESS_UPDATED');
    assert.ok(auditEvent);
    assert.equal(auditEvent.metadata.before.residential_line1, 'House 109, Sanepa Chowk');
    assert.equal(auditEvent.metadata.after.residential_line1, 'House 205, Pulchowk Road');
    assert.equal('password_hash' in auditEvent.metadata, false);
    assert.equal('bank_account_masked' in auditEvent.metadata.after, false);
  });

  it('AC-03: Rejects invalid or overlapping leave dates with clear field-level errors, and creates valid requests atomically', async () => {
    const agent = harness.createAgent();
    await agent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'EmployeePass#2026!' }
    });

    // 1. Invalid dates (end_date < start_date) -> 400 with fieldErrors.end_date
    const invalidDatesRes = await agent.post('/api/leaves', {
      body: {
        leave_type_id: '44444444-4444-4444-8444-444444444401',
        start_date: '2026-10-15',
        end_date: '2026-10-12',
        reason: 'Invalid date order test'
      }
    });
    assert.equal(invalidDatesRes.status, 400);
    assert.ok(invalidDatesRes.body.error.fieldErrors.end_date);

    // 2. Overlapping with existing APPROVED leave (2026-08-10 to 2026-08-12) -> 409 LEAVE_OVERLAP
    const overlapApprovedRes = await agent.post('/api/leaves', {
      body: {
        leave_type_id: '44444444-4444-4444-8444-444444444401',
        start_date: '2026-08-11',
        end_date: '2026-08-14',
        reason: 'Overlaps with August approved leave'
      }
    });
    assert.equal(overlapApprovedRes.status, 409);
    assert.equal(overlapApprovedRes.body.error.code, 'LEAVE_OVERLAP');
    assert.ok(overlapApprovedRes.body.error.fieldErrors.start_date);

    // 3. Overlapping with existing PENDING leave (2026-11-16 to 2026-11-17) -> 409 LEAVE_OVERLAP
    const overlapPendingRes = await agent.post('/api/leaves', {
      body: {
        leave_type_id: '44444444-4444-4444-8444-444444444401',
        start_date: '2026-11-15',
        end_date: '2026-11-16',
        reason: 'Overlaps with November pending leave'
      }
    });
    assert.equal(overlapPendingRes.status, 409);
    assert.equal(overlapPendingRes.body.error.code, 'LEAVE_OVERLAP');

    // 4. Valid non-overlapping leave request -> 201 Created and increments pending_days
    const validRes = await agent.post('/api/leaves', {
      body: {
        leave_type_id: '44444444-4444-4444-8444-444444444401',
        start_date: '2026-12-14',
        end_date: '2026-12-16',
        reason: 'Year-end family trip to Bandipur',
        idempotency_key: 'idem-test-001'
      }
    });
    assert.equal(validRes.status, 201);
    assert.equal(validRes.body.data.leaveRequest.total_days, 3);
    assert.equal(validRes.body.data.leaveRequest.status, 'PENDING');

    // 5. Cancel the newly created pending leave request -> restores balance
    const createdId = validRes.body.data.leaveRequest.id;
    const cancelRes = await agent.post(`/api/leaves/${createdId}/cancel`, {
      body: { version: 1 }
    });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.leaveRequest.status, 'CANCELLED');
  });

  it('AC-04: Manager can decide requests belonging to their direct reports and balance is updated atomically', async () => {
    const mgrAgent = harness.createAgent();
    await mgrAgent.post('/api/auth/login', {
      body: { email: 'suman.karki@portal.demo', password: 'ManagerOne#2026!' }
    });

    // List pending requests for Suman's direct reports
    const teamRes = await mgrAgent.get('/api/leaves/team?status=PENDING');
    assert.equal(teamRes.status, 200);
    assert.ok(teamRes.body.pagination);
    // Request 55555555-5555-4555-8555-555555555502 belongs to Aayush (direct report of Suman)
    const targetReq = teamRes.body.data.find((r) => r.id === '55555555-5555-4555-8555-555555555502');
    assert.ok(targetReq);

    // Approve request
    const approveRes = await mgrAgent.patch(`/api/leaves/${targetReq.id}/decision`, {
      body: {
        decision: 'APPROVED',
        comment: 'Approved. Enjoy the wedding!',
        version: targetReq.version
      }
    });
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.data.leaveRequest.status, 'APPROVED');

    // Verify Aayush's CASUAL leave balance now has used_days = 2, pending_days = 0
    const empAgent = harness.createAgent();
    await empAgent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'EmployeePass#2026!' }
    });
    const balRes = await empAgent.get('/api/leaves/balance');
    const casualBal = balRes.body.data.balances.find((b) => b.leave_type_code === 'CASUAL');
    assert.equal(casualBal.used_days, 2);
    assert.equal(casualBal.pending_days, 0);
    assert.equal(casualBal.available_days, 4);
  });

  it('AC-05: Payslip download has correct content type, safe attachment filename, and no-store cache headers', async () => {
    const agent = harness.createAgent();
    await agent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'EmployeePass#2026!' }
    });

    const listRes = await agent.get('/api/payslips?page=1&pageSize=10');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 3);
    assert.ok(listRes.body.pagination);

    const ownPayslipId = listRes.body.data[0].id;
    const dlRes = await agent.get(`/api/payslips/${ownPayslipId}/download`);
    assert.equal(dlRes.status, 200);
    assert.equal(dlRes.headers.get('content-type'), 'application/pdf');
    assert.match(dlRes.headers.get('content-disposition'), /^attachment; filename="Payslip_EMP-1005_2026_\d{2}\.pdf"$/);
    assert.match(dlRes.headers.get('cache-control'), /no-store/);
    assert.match(dlRes.headers.get('cache-control'), /private/);
    assert.equal(dlRes.rawBuffer.subarray(0, 5).toString('ascii'), '%PDF-');
  });

  it('Supports HR Admin read-only directory/leave overview and System Admin user/reference management', async () => {
    // HR Admin
    const hrAgent = harness.createAgent();
    await hrAgent.post('/api/auth/login', {
      body: { email: 'hradmin@portal.demo', password: 'HrAdminPortal#2026!' }
    });
    const dirRes = await hrAgent.get('/api/hr/employees?search=Aayush');
    assert.equal(dirRes.status, 200);
    assert.equal(dirRes.body.data.length, 1);
    assert.equal(dirRes.body.data[0].employee_code, 'EMP-1005');

    const hrLeavesRes = await hrAgent.get('/api/hr/leaves');
    assert.equal(hrLeavesRes.status, 200);
    assert.ok(hrLeavesRes.body.pagination.totalItems >= 6);

    // System Admin
    const sysAgent = harness.createAgent();
    await sysAgent.post('/api/auth/login', {
      body: { email: 'sysadmin@portal.demo', password: 'AdminPortal#2026!' }
    });
    const usersRes = await sysAgent.get('/api/admin/users');
    assert.equal(usersRes.status, 200);
    assert.equal(usersRes.body.data.length, 10);
    // Ensure password_hash is never exposed in admin user list
    assert.equal('password_hash' in usersRes.body.data[0], false);

    const newLeaveTypeRes = await sysAgent.post('/api/admin/leave-types', {
      body: {
        code: 'BEREAVEMENT',
        name: 'Bereavement Leave',
        description: 'Paid compassionate leave for immediate family bereavement',
        default_annual_quota: 7,
        is_paid: true
      }
    });
    assert.equal(newLeaveTypeRes.status, 201);
    assert.equal(newLeaveTypeRes.body.data.leaveType.code, 'BEREAVEMENT');
  });
});
