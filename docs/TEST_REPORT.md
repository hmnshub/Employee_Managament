# Automated Test & Acceptance Criteria Report (`docs/TEST_REPORT.md`)

## 1. Execution Summary

- **Command**: `npm test` (executes `node --test tests/*.test.js` in `server/`)
- **Total Suites**: 3 (`unit.test.js`, `api.test.js`, `security.test.js`)
- **Total Tests**: 30
- **Passed**: 30 (100%)
- **Failed**: 0

## 2. Mapping to PDF Acceptance Criteria (`AC-01` to `AC-05`)

| Acceptance Criterion ID | PDF Requirement | Automated Test Evidence | Status |
| :--- | :--- | :--- | :--- |
| **AC-01** | Employee can update a valid address and see it after re-login. | `server/tests/api.test.js` — *"AC-01: Employee can update a valid address, persist optimistic lock version, see it after re-login, and generate a clean before/after audit event"* | **PASS** |
| **AC-02** | Unauthorized users receive 401; users attempting another employee resource receive 403 or 404. | `server/tests/security.test.js` — *"1. Authentication Bypass & AC-02: Unauthenticated requests to every protected endpoint return 401"* & *"4. BOLA: Employee cannot download another employee payslip or cancel another employee leave (AC-02)"* | **PASS** |
| **AC-03** | Invalid or overlapping leave dates are rejected with clear field-level errors. | `server/tests/api.test.js` — *"AC-03: Rejects invalid or overlapping leave dates with clear field-level errors, and creates valid requests atomically"* & `server/tests/unit.test.js` (#5) | **PASS** |
| **AC-04** | Manager can decide only requests belonging to their reporting employees. | `server/tests/api.test.js` — *"AC-04: Manager can decide requests belonging to their direct reports and balance is updated atomically"* & `server/tests/security.test.js` — *"6. Manager Relationship Violation (AC-04): Manager cannot decide a leave request belonging to a non-direct-report employee"* | **PASS** |
| **AC-05** | Payslip download has correct content type, safe filename, and no cacheable public URL. | `server/tests/api.test.js` — *"AC-05: Payslip download has correct content type, safe attachment filename, and no-store cache headers"* & `server/tests/unit.test.js` (#12) | **PASS** |

## 3. Negative Security Test Coverage Matrix (PDF Section 8 & Prompt)

| # | Required Negative Security Test | Test File & Test Name | Expected Behavior Verified | Result |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Authentication bypass on protected endpoints | `server/tests/security.test.js` (#1) | Every protected route returns `401 Unauthorized` when called without a cookie or with a forged 64-hex token. | **PASS** |
| **2** | Weak password rejection & user enumeration resistance | `server/tests/security.test.js` (#2), `unit.test.js` (#4) | Passwords `< 12` chars or lacking complexity return `400`; unknown email vs wrong password return identical `401` payload and run equal-time bcrypt verification (`DUMMY_BCRYPT_HASH`). | **PASS** |
| **3** | Session fixation, idle expiry, and logout invalidation | `server/tests/security.test.js` (#3) | Login replaces any pre-existing cookie; logout revokes session in DB so replaying the cookie returns `401`; expired `idle_expires_at` returns `401`. | **PASS** |
| **4** | Broken Object-Level Authorization (BOLA) on leaves and payslips | `server/tests/security.test.js` (#4) | Employee `EMP-1005` requesting `EMP-1006`'s payslip download or cancelling `EMP-1006`'s leave receives `403 Forbidden` + audit event. | **PASS** |
| **5** | Broken Function-Level Authorization (BFLA) & Separation of Duties | `server/tests/security.test.js` (#5) | Employee calling Manager/HR/Admin endpoints receives `403`; `SYSTEM_ADMIN` calling `/api/payslips` or `/api/leaves/balance` receives `403`. | **PASS** |
| **6** | Manager deciding a non-direct-report's leave request | `server/tests/security.test.js` (#6) | Manager `EMP-1003` attempting to approve leave for `EMP-1009` (who reports to `EMP-1004`) receives `403 Forbidden` + `ACCESS_DENIED_NOT_DIRECT_REPORT` audit event. | **PASS** |
| **7** | SQL/NoSQL injection via sort, filter, and path parameters | `server/tests/security.test.js` (#7), `unit.test.js` (#8) | `sortBy=created_at; DROP TABLE users;--`, `status=PENDING' OR '1'='1`, and invalid UUID path params are rejected with `400 Bad Request`. | **PASS** |
| **8** | Stored & reflected XSS payloads in address and leave reason | `server/tests/security.test.js` (#8), `unit.test.js` (#9) | `<script>` and `<img onerror=...>` payloads in address lines and leave reasons are rejected with `400`; `Content-Security-Policy` header is enforced. | **PASS** |
| **9** | CSRF protection without header or with mismatched token | `server/tests/security.test.js` (#9), `unit.test.js` (#3) | `PATCH /api/employees/me/address` without `X-CSRF-Token` or with wrong token returns `403 Forbidden (CSRF_INVALID)` and logs `ACCESS_DENIED_CSRF`. | **PASS** |
| **10** | Sensitive data exposure in URLs, logs, errors, and API responses | `server/tests/security.test.js` (#10), `unit.test.js` (#10) | `?token=...` in URL returns `400 (SENSITIVE_QUERY_PARAM)`; malformed JSON returns clean `400` with `correlationId` and no stack trace; `password_hash` is never returned; logs redact secrets. | **PASS** |
| **11** | Race conditions & duplicate submissions on leave creation and decision | `server/tests/security.test.js` (#11) | Parallel `POST /api/leaves` with identical `idempotency_key` and parallel `PATCH /api/leaves/:id/decision` result in `[201, 409]` and `[200, 409]`, deducting balance exactly once. | **PASS** |
| **12** | Login rate limiting & account lockout backoff | `server/tests/security.test.js` (#12) | Repeated failed logins lock the account (`locked_until`) so subsequent attempts fail even with the valid password; IP flood returns `429 Too Many Requests`. | **PASS** |
