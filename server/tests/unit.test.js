import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSessionCredentials,
  hashPassword,
  hashSessionToken,
  verifyCsrfTokenConstantTime,
  verifyPassword
} from '../src/utils/crypto.js';
import {
  sanitizePlainText,
  validateAddressUpdateInput,
  validateCreateLeaveInput,
  validateLeaveDecisionInput,
  validateListQuery,
  validateLoginInput,
  validatePasswordStrength
} from '../src/validators/schemas.js';
import { buildSafePayslipFilename, generatePayslipPdfBuffer } from '../src/utils/pdf.js';
import { redactSensitiveData } from '../src/utils/logger.js';
import { loadConfig } from '../src/config/index.js';

describe('Unit Tests: Cryptography, Validators, Business Rules & PDF Engine', () => {
  it('hashes and verifies passwords with bcrypt cost 12 ($2a$12$)', async () => {
    const hash = await hashPassword('StrongPass#2026!', 12);
    assert.match(hash, /^\$2[ab]\$12\$.{53}$/);
    assert.equal(await verifyPassword('StrongPass#2026!', hash), true);
    assert.equal(await verifyPassword('WrongPass#2026!', hash), false);
  });

  it('generates 256-bit opaque session tokens and SHA-256 hashes', () => {
    const creds = generateSessionCredentials();
    assert.equal(creds.rawToken.length, 64);
    assert.equal(creds.tokenHash.length, 64);
    assert.equal(creds.csrfToken.length, 64);
    assert.notEqual(creds.rawToken, creds.tokenHash);
    assert.equal(hashSessionToken(creds.rawToken), creds.tokenHash);
  });

  it('compares CSRF tokens in constant time and rejects length or value mismatches', () => {
    const token = 'a'.repeat(64);
    assert.equal(verifyCsrfTokenConstantTime(token, token), true);
    assert.equal(verifyCsrfTokenConstantTime('b'.repeat(64), token), false);
    assert.equal(verifyCsrfTokenConstantTime('short', token), false);
    assert.equal(verifyCsrfTokenConstantTime('', token), false);
    assert.equal(verifyCsrfTokenConstantTime(null, token), false);
  });

  it('enforces minimum 12-character password policy with complexity', () => {
    assert.equal(validatePasswordStrength('Short1!').valid, false);
    assert.equal(validatePasswordStrength('alllowercase123!').valid, false);
    assert.equal(validatePasswordStrength('ValidPassword#2026').valid, true);

    assert.throws(
      () => validateLoginInput({ email: 'user@portal.demo', password: 'short' }),
      (err) => err.statusCode === 400 && Boolean(err.fieldErrors.password)
    );
  });

  it('validates leave dates and rejects end_date earlier than start_date', () => {
    assert.throws(
      () =>
        validateCreateLeaveInput({
          leave_type_id: '44444444-4444-4444-8444-444444444401',
          start_date: '2026-11-20',
          end_date: '2026-11-18',
          reason: 'Family event in Pokhara'
        }),
      (err) =>
        err.statusCode === 400 &&
        err.fieldErrors?.end_date === 'End date must be on or after the start date.'
    );

    const valid = validateCreateLeaveInput({
      leave_type_id: '44444444-4444-4444-8444-444444444401',
      start_date: '2026-11-18',
      end_date: '2026-11-20',
      reason: 'Family event in Pokhara'
    });
    assert.equal(valid.total_days, 3);
  });

  it('rejects attempts to modify read-only employee profile fields in address update', () => {
    assert.throws(
      () =>
        validateAddressUpdateInput({
          version: 1,
          residential_line1: 'House 10, Patan',
          residential_city: 'Lalitpur',
          residential_state: 'Bagmati',
          residential_postal_code: '44700',
          residential_country: 'NP',
          mailing_same_as_residential: true,
          department: 'Executive Hacked',
          legal_name: 'Fake Name'
        }),
      (err) =>
        err.statusCode === 400 &&
        Boolean(err.fieldErrors.department) &&
        Boolean(err.fieldErrors.legal_name)
    );
  });

  it('requires a comment when a manager rejects a leave request', () => {
    assert.throws(
      () => validateLeaveDecisionInput({ decision: 'REJECTED', comment: '' }),
      (err) => err.statusCode === 400 && Boolean(err.fieldErrors.comment)
    );
    const okApprove = validateLeaveDecisionInput({ decision: 'APPROVED' });
    assert.equal(okApprove.decision, 'APPROVED');
  });

  it('enforces strict allow-lists on pagination, sortBy, and filter parameters', () => {
    assert.throws(
      () =>
        validateListQuery(
          { sortBy: 'password_hash; DROP TABLE users;--' },
          { allowedSortFields: ['created_at', 'start_date'] }
        ),
      (err) => err.statusCode === 400 && Boolean(err.fieldErrors.sortBy)
    );
  });

  it('sanitizes XSS payloads and rejects angle brackets in text fields', () => {
    const cleaned = sanitizePlainText('<script>alert(1)</script>Hello <b>World</b> javascript:evil()');
    assert.equal(cleaned.includes('<script>'), false);
    assert.equal(cleaned.includes('javascript:'), false);
  });

  it('redacts sensitive keys and bcrypt hashes from structured logs', () => {
    const redacted = redactSensitiveData({
      email: 'aayush.shrestha@portal.demo',
      password: 'EmployeePass#2026!',
      csrfToken: 'secret-csrf',
      nested: {
        token_hash: 'abcdef',
        unlabeledValue: '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW'
      }
    });
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.csrfToken, '[REDACTED]');
    assert.equal(redacted.nested.token_hash, '[REDACTED]');
    assert.equal(redacted.nested.unlabeledValue, '[REDACTED_HASH]');
  });

  it('fails startup config validation with clear human message when SUPABASE vars are missing', () => {
    assert.throws(
      () => loadConfig({ NODE_ENV: 'development', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }),
      (err) =>
        err.code === 'CONFIG_VALIDATION_ERROR' &&
        err.message.includes('SUPABASE_URL') &&
        err.message.includes('SUPABASE_SERVICE_ROLE_KEY')
    );
  });

  it('generates valid PDF 1.4 binary buffer and safe attachment filename on demand', async () => {
    const fname = buildSafePayslipFilename('EMP-1005/../../etc/passwd', 2026, 10);
    assert.equal(fname, 'Payslip_EMP-1005etcpasswd_2026_10.pdf');
    assert.equal(fname.includes('/'), false);
    assert.equal(fname.includes('..'), false);

    const pdfBuf = await generatePayslipPdfBuffer({
      payslip: {
        id: '66666666-6666-4666-8666-666610000005',
        pay_period_year: 2026,
        pay_period_month: 10,
        pay_period_start: '2026-10-01',
        pay_period_end: '2026-10-31',
        payment_date: '2026-10-30',
        currency: 'NPR',
        basic_salary: 90000,
        hra: 22500,
        transport_allowance: 5000,
        medical_allowance: 3500,
        special_allowance: 6500,
        gross_earnings: 127500,
        income_tax: 10800,
        provident_fund: 9000,
        social_security_tax: 900,
        professional_tax: 500,
        total_deductions: 21200,
        net_pay: 106300,
        bank_account_masked: 'XXXX-XXXX-4105',
        status: 'ISSUED'
      },
      employee: {
        legal_name: 'Aayush Shrestha',
        employee_code: 'EMP-1005',
        department: 'Platform Engineering',
        designation: 'Senior Backend Engineer',
        tax_pan_masked: 'PAN-****-905'
      }
    });

    assert.equal(Buffer.isBuffer(pdfBuf), true);
    assert.equal(pdfBuf.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.equal(pdfBuf.includes(Buffer.from('Aayush Shrestha')), true);
  });
});
