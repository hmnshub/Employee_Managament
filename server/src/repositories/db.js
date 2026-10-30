import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { hashPassword } from '../utils/crypto.js';

const require = createRequire(import.meta.url);
let createSupabaseClient = null;
try {
  ({ createClient: createSupabaseClient } = require('@supabase/supabase-js'));
} catch {
  createSupabaseClient = null;
}

/**
 * In-memory PostgreSQL + PL/pgSQL RPC + Supabase Query Builder adapter for automated tests
 * (`NODE_ENV=test`), pre-seeded with the exact fictional dataset from `supabase/02_seed.sql`
 * and enforcing all constraints, optimistic locking (`version`), and atomic rollbacks.
 */
export async function createInMemoryDatabase() {
  const adminHash = await hashPassword('AdminPortal#2026!', 4); // Fast cost in test seed while enforcing cost 12 on runtime hashPassword()
  const hrHash = await hashPassword('HrAdminPortal#2026!', 4);
  const mgr1Hash = await hashPassword('ManagerOne#2026!', 4);
  const mgr2Hash = await hashPassword('ManagerTwo#2026!', 4);
  const empHash = await hashPassword('EmployeePass#2026!', 4);

  const nowIso = () => new Date().toISOString();

  const tables = {
    users: [
      { id: '11111111-1111-4111-8111-111111111101', email: 'sysadmin@portal.demo', password_hash: adminHash, role: 'SYSTEM_ADMIN', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111102', email: 'hradmin@portal.demo', password_hash: hrHash, role: 'HR_ADMIN', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111103', email: 'suman.karki@portal.demo', password_hash: mgr1Hash, role: 'MANAGER', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111104', email: 'pratima.gurung@portal.demo', password_hash: mgr2Hash, role: 'MANAGER', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111105', email: 'aayush.shrestha@portal.demo', password_hash: empHash, role: 'EMPLOYEE', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111106', email: 'ashmita.poudel@portal.demo', password_hash: empHash, role: 'EMPLOYEE', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111107', email: 'dipesh.adhikari@portal.demo', password_hash: empHash, role: 'EMPLOYEE', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111108', email: 'kriti.maharjan@portal.demo', password_hash: empHash, role: 'EMPLOYEE', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111109', email: 'niraj.bhandari@portal.demo', password_hash: empHash, role: 'EMPLOYEE', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() },
      { id: '11111111-1111-4111-8111-111111111110', email: 'sabina.tamang@portal.demo', password_hash: empHash, role: 'EMPLOYEE', status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: null, created_at: nowIso(), updated_at: nowIso() }
    ],
    employee_profiles: [
      { id: '22222222-2222-4222-8222-222222222201', user_id: '11111111-1111-4111-8111-111111111101', employee_code: 'EMP-1001', legal_name: 'Rameshwar Thapa', department: 'Information Technology', designation: 'Principal Systems Administrator', joining_date: '2021-02-15', manager_id: null, phone_masked: '+977-98******01', national_id_masked: 'NID-****-1101', tax_pan_masked: 'PAN-****-901', bank_account_masked: 'XXXX-XXXX-4101', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222202', user_id: '11111111-1111-4111-8111-111111111102', employee_code: 'EMP-1002', legal_name: 'Bishnu Maya KC', department: 'People & Culture', designation: 'HR Operations Lead', joining_date: '2021-04-01', manager_id: null, phone_masked: '+977-98******02', national_id_masked: 'NID-****-1102', tax_pan_masked: 'PAN-****-902', bank_account_masked: 'XXXX-XXXX-4102', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222203', user_id: '11111111-1111-4111-8111-111111111103', employee_code: 'EMP-1003', legal_name: 'Suman Karki', department: 'Platform Engineering', designation: 'Engineering Manager', joining_date: '2021-06-10', manager_id: null, phone_masked: '+977-98******03', national_id_masked: 'NID-****-1103', tax_pan_masked: 'PAN-****-903', bank_account_masked: 'XXXX-XXXX-4103', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222204', user_id: '11111111-1111-4111-8111-111111111104', employee_code: 'EMP-1004', legal_name: 'Pratima Gurung', department: 'Product & Design', designation: 'Product Operations Manager', joining_date: '2021-08-20', manager_id: null, phone_masked: '+977-98******04', national_id_masked: 'NID-****-1104', tax_pan_masked: 'PAN-****-904', bank_account_masked: 'XXXX-XXXX-4104', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222205', user_id: '11111111-1111-4111-8111-111111111105', employee_code: 'EMP-1005', legal_name: 'Aayush Shrestha', department: 'Platform Engineering', designation: 'Senior Backend Engineer', joining_date: '2022-01-10', manager_id: '22222222-2222-4222-8222-222222222203', phone_masked: '+977-98******05', national_id_masked: 'NID-****-1105', tax_pan_masked: 'PAN-****-905', bank_account_masked: 'XXXX-XXXX-4105', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222206', user_id: '11111111-1111-4111-8111-111111111106', employee_code: 'EMP-1006', legal_name: 'Ashmita Poudel', department: 'Platform Engineering', designation: 'Cloud Reliability Engineer', joining_date: '2022-05-16', manager_id: '22222222-2222-4222-8222-222222222203', phone_masked: '+977-98******06', national_id_masked: 'NID-****-1106', tax_pan_masked: 'PAN-****-906', bank_account_masked: 'XXXX-XXXX-4106', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222207', user_id: '11111111-1111-4111-8111-111111111107', employee_code: 'EMP-1007', legal_name: 'Dipesh Adhikari', department: 'Platform Engineering', designation: 'Security Software Engineer', joining_date: '2023-02-01', manager_id: '22222222-2222-4222-8222-222222222203', phone_masked: '+977-98******07', national_id_masked: 'NID-****-1107', tax_pan_masked: 'PAN-****-907', bank_account_masked: 'XXXX-XXXX-4107', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222208', user_id: '11111111-1111-4111-8111-111111111108', employee_code: 'EMP-1008', legal_name: 'Kriti Maharjan', department: 'Product & Design', designation: 'Senior Product Designer', joining_date: '2022-03-14', manager_id: '22222222-2222-4222-8222-222222222204', phone_masked: '+977-98******08', national_id_masked: 'NID-****-1108', tax_pan_masked: 'PAN-****-908', bank_account_masked: 'XXXX-XXXX-4108', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222209', user_id: '11111111-1111-4111-8111-111111111109', employee_code: 'EMP-1009', legal_name: 'Niraj Bhandari', department: 'Product & Design', designation: 'Product Analyst', joining_date: '2023-07-03', manager_id: '22222222-2222-4222-8222-222222222204', phone_masked: '+977-98******09', national_id_masked: 'NID-****-1109', tax_pan_masked: 'PAN-****-909', bank_account_masked: 'XXXX-XXXX-4109', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '22222222-2222-4222-8222-222222222210', user_id: '11111111-1111-4111-8111-111111111110', employee_code: 'EMP-1010', legal_name: 'Sabina Tamang', department: 'Product & Design', designation: 'Quality Assurance Specialist', joining_date: '2024-01-15', manager_id: '22222222-2222-4222-8222-222222222204', phone_masked: '+977-98******10', national_id_masked: 'NID-****-1110', tax_pan_masked: 'PAN-****-910', bank_account_masked: 'XXXX-XXXX-4110', employment_status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() }
    ],
    addresses: [
      { id: '33333333-3333-4333-8333-333333333301', employee_id: '22222222-2222-4222-8222-222222222201', residential_line1: 'House 14, Lazimpat Sadak', residential_line2: 'Ward 2', residential_city: 'Kathmandu', residential_state: 'Bagmati', residential_postal_code: '44600', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 14, Lazimpat Sadak', mailing_line2: 'Ward 2', mailing_city: 'Kathmandu', mailing_state: 'Bagmati', mailing_postal_code: '44600', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333302', employee_id: '22222222-2222-4222-8222-222222222202', residential_line1: 'House 28, Jhamsikhel Marg', residential_line2: 'Ward 3', residential_city: 'Lalitpur', residential_state: 'Bagmati', residential_postal_code: '44700', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 28, Jhamsikhel Marg', mailing_line2: 'Ward 3', mailing_city: 'Lalitpur', mailing_state: 'Bagmati', mailing_postal_code: '44700', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333303', employee_id: '22222222-2222-4222-8222-222222222203', residential_line1: 'House 42, Maharajgunj Ring Road', residential_line2: 'Ward 4', residential_city: 'Kathmandu', residential_state: 'Bagmati', residential_postal_code: '44600', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 42, Maharajgunj Ring Road', mailing_line2: 'Ward 4', mailing_city: 'Kathmandu', mailing_state: 'Bagmati', mailing_postal_code: '44600', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333304', employee_id: '22222222-2222-4222-8222-222222222204', residential_line1: 'Lakeside Block B, Baidam Road', residential_line2: 'Ward 6', residential_city: 'Pokhara', residential_state: 'Gandaki', residential_postal_code: '33700', residential_country: 'NP', mailing_same_as_residential: false, mailing_line1: 'PO Box 194, New Baneshwor', mailing_line2: 'Ward 10', mailing_city: 'Kathmandu', mailing_state: 'Bagmati', mailing_postal_code: '44600', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333305', employee_id: '22222222-2222-4222-8222-222222222205', residential_line1: 'House 109, Sanepa Chowk', residential_line2: 'Ward 2', residential_city: 'Lalitpur', residential_state: 'Bagmati', residential_postal_code: '44700', residential_country: 'NP', mailing_same_as_residential: false, mailing_line1: 'Apt 4B, Kamaladi Complex', mailing_line2: 'Ward 28', mailing_city: 'Kathmandu', mailing_state: 'Bagmati', mailing_postal_code: '44600', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333306', employee_id: '22222222-2222-4222-8222-222222222206', residential_line1: 'House 7, Baluwatar Galli', residential_line2: 'Ward 4', residential_city: 'Kathmandu', residential_state: 'Bagmati', residential_postal_code: '44600', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 7, Baluwatar Galli', mailing_line2: 'Ward 4', mailing_city: 'Kathmandu', mailing_state: 'Bagmati', mailing_postal_code: '44600', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333307', employee_id: '22222222-2222-4222-8222-222222222207', residential_line1: 'House 19, Suryabinayak Chowk', residential_line2: 'Ward 8', residential_city: 'Bhaktapur', residential_state: 'Bagmati', residential_postal_code: '44800', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 19, Suryabinayak Chowk', mailing_line2: 'Ward 8', mailing_city: 'Bhaktapur', mailing_state: 'Bagmati', mailing_postal_code: '44800', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333308', employee_id: '22222222-2222-4222-8222-222222222208', residential_line1: 'House 53, Patan Dhoka', residential_line2: 'Ward 16', residential_city: 'Lalitpur', residential_state: 'Bagmati', residential_postal_code: '44700', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 53, Patan Dhoka', mailing_line2: 'Ward 16', mailing_city: 'Lalitpur', mailing_state: 'Bagmati', mailing_postal_code: '44700', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333309', employee_id: '22222222-2222-4222-8222-222222222209', residential_line1: 'House 88, Kalanki Mandir Road', residential_line2: 'Ward 14', residential_city: 'Kathmandu', residential_state: 'Bagmati', residential_postal_code: '44600', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 88, Kalanki Mandir Road', mailing_line2: 'Ward 14', mailing_city: 'Kathmandu', mailing_state: 'Bagmati', mailing_postal_code: '44600', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() },
      { id: '33333333-3333-4333-8333-333333333310', employee_id: '22222222-2222-4222-8222-222222222210', residential_line1: 'House 31, Boudha Tusal', residential_line2: 'Ward 6', residential_city: 'Kathmandu', residential_state: 'Bagmati', residential_postal_code: '44600', residential_country: 'NP', mailing_same_as_residential: true, mailing_line1: 'House 31, Boudha Tusal', mailing_line2: 'Ward 6', mailing_city: 'Kathmandu', mailing_state: 'Bagmati', mailing_postal_code: '44600', mailing_country: 'NP', version: 1, status: 'ACTIVE', created_at: nowIso(), updated_at: nowIso() }
    ],
    leave_types: [
      { id: '44444444-4444-4444-8444-444444444401', code: 'ANNUAL', name: 'Annual Privilege Leave', description: 'Paid annual vacation and personal rest leave', default_annual_quota: 18, is_paid: true, is_active: true, created_at: nowIso(), updated_at: nowIso() },
      { id: '44444444-4444-4444-8444-444444444402', code: 'SICK', name: 'Medical & Sick Leave', description: 'Paid leave for illness, injury, or medical appointments', default_annual_quota: 12, is_paid: true, is_active: true, created_at: nowIso(), updated_at: nowIso() },
      { id: '44444444-4444-4444-8444-444444444403', code: 'CASUAL', name: 'Casual / Festival Leave', description: 'Short-duration paid leave for urgent personal matters or festivals', default_annual_quota: 6, is_paid: true, is_active: true, created_at: nowIso(), updated_at: nowIso() },
      { id: '44444444-4444-4444-8444-444444444404', code: 'PARENTAL', name: 'Parental Care Leave', description: 'Paid family care leave for childbirth or adoption', default_annual_quota: 15, is_paid: true, is_active: true, created_at: nowIso(), updated_at: nowIso() }
    ],
    leave_balances: [],
    leave_requests: [
      { id: '55555555-5555-4555-8555-555555555501', employee_id: '22222222-2222-4222-8222-222222222205', leave_type_id: '44444444-4444-4444-8444-444444444401', start_date: '2026-08-10', end_date: '2026-08-12', total_days: 3, reason: 'Family gathering in Pokhara for annual ancestral ceremony', status: 'APPROVED', decided_by: '22222222-2222-4222-8222-222222222203', decided_at: '2026-08-03T10:15:00Z', decision_comment: 'Approved. Handover completed with Ashmita.', idempotency_key: null, version: 2, created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-03T10:15:00Z' },
      { id: '55555555-5555-4555-8555-555555555502', employee_id: '22222222-2222-4222-8222-222222222205', leave_type_id: '44444444-4444-4444-8444-444444444403', start_date: '2026-11-16', end_date: '2026-11-17', total_days: 2, reason: 'Attending sister wedding ceremony in Chitwan', status: 'PENDING', decided_by: null, decided_at: null, decision_comment: null, idempotency_key: null, version: 1, created_at: '2026-10-20T09:00:00Z', updated_at: '2026-10-20T09:00:00Z' },
      { id: '55555555-5555-4555-8555-555555555503', employee_id: '22222222-2222-4222-8222-222222222206', leave_type_id: '44444444-4444-4444-8444-444444444401', start_date: '2026-11-23', end_date: '2026-11-26', total_days: 4, reason: 'Trekking trip to Poon Hill and family visit', status: 'PENDING', decided_by: null, decided_at: null, decision_comment: null, idempotency_key: null, version: 1, created_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z' },
      { id: '55555555-5555-4555-8555-555555555504', employee_id: '22222222-2222-4222-8222-222222222208', leave_type_id: '44444444-4444-4444-8444-444444444402', start_date: '2026-09-14', end_date: '2026-09-15', total_days: 2, reason: 'Seasonal viral fever and medical checkup', status: 'APPROVED', decided_by: '22222222-2222-4222-8222-222222222204', decided_at: '2026-09-14T08:30:00Z', decision_comment: 'Wishing you a speedy recovery.', idempotency_key: null, version: 2, created_at: '2026-09-13T18:00:00Z', updated_at: '2026-09-14T08:30:00Z' },
      { id: '55555555-5555-4555-8555-555555555505', employee_id: '22222222-2222-4222-8222-222222222209', leave_type_id: '44444444-4444-4444-8444-444444444401', start_date: '2026-12-01', end_date: '2026-12-03', total_days: 3, reason: 'Personal travel to Ilam with family', status: 'PENDING', decided_by: null, decided_at: null, decision_comment: null, idempotency_key: null, version: 1, created_at: '2026-10-25T11:00:00Z', updated_at: '2026-10-25T11:00:00Z' },
      { id: '55555555-5555-4555-8555-555555555506', employee_id: '22222222-2222-4222-8222-222222222207', leave_type_id: '44444444-4444-4444-8444-444444444403', start_date: '2026-07-20', end_date: '2026-07-21', total_days: 2, reason: 'Municipal documentation renewal', status: 'REJECTED', decided_by: '22222222-2222-4222-8222-222222222203', decided_at: '2026-07-18T14:00:00Z', decision_comment: 'Conflicts with scheduled security release window; rescheduled to August.', idempotency_key: null, version: 2, created_at: '2026-07-15T10:00:00Z', updated_at: '2026-07-18T14:00:00Z' }
    ],
    payslips: [],
    sessions: [],
    login_attempts: [],
    audit_events: []
  };

  // Populate leave_balances for all 10 employees x 4 leave types
  for (const ep of tables.employee_profiles) {
    for (const lt of tables.leave_types) {
      let used = 0;
      let pending = 0;
      if (ep.id === '22222222-2222-4222-8222-222222222205' && lt.code === 'ANNUAL') used = 3;
      if (ep.id === '22222222-2222-4222-8222-222222222208' && lt.code === 'SICK') used = 2;
      if (ep.id === '22222222-2222-4222-8222-222222222205' && lt.code === 'CASUAL') pending = 2;
      if (ep.id === '22222222-2222-4222-8222-222222222206' && lt.code === 'ANNUAL') pending = 4;
      if (ep.id === '22222222-2222-4222-8222-222222222209' && lt.code === 'ANNUAL') pending = 3;

      tables.leave_balances.push({
        id: crypto.randomUUID(),
        employee_id: ep.id,
        leave_type_id: lt.id,
        year: 2026,
        allocated_days: lt.default_annual_quota,
        used_days: used,
        pending_days: pending,
        version: 1,
        created_at: nowIso(),
        updated_at: nowIso()
      });
    }
  }

  // Populate 3 months of payslips per employee
  const periods = [
    { yr: 2026, mo: 8, start: '2026-08-01', end: '2026-08-31', pay: '2026-08-31', suffix: '08' },
    { yr: 2026, mo: 9, start: '2026-09-01', end: '2026-09-30', pay: '2026-09-30', suffix: '09' },
    { yr: 2026, mo: 10, start: '2026-10-01', end: '2026-10-31', pay: '2026-10-30', suffix: '10' }
  ];
  const salaryMap = {
    'EMP-1001': 110000, 'EMP-1002': 95000, 'EMP-1003': 125000, 'EMP-1004': 120000,
    'EMP-1005': 90000, 'EMP-1006': 85000, 'EMP-1007': 82000, 'EMP-1008': 88000,
    'EMP-1009': 74000, 'EMP-1010': 70000
  };
  for (const ep of tables.employee_profiles) {
    const basic = salaryMap[ep.employee_code] || 75000;
    const hra = Math.round(basic * 0.25);
    const gross = basic + hra + 15000;
    const tax = Math.round(basic * 0.12);
    const pf = Math.round(basic * 0.10);
    const sst = Math.round(basic * 0.01);
    const profTax = 500;
    const deductions = tax + pf + sst + profTax;
    const net = gross - deductions;
    for (const p of periods) {
      const empNum = ep.employee_code.slice(-2).padStart(6, '0');
      tables.payslips.push({
        id: `66666666-6666-4666-8666-6666${p.suffix}${empNum}`,
        employee_id: ep.id,
        pay_period_year: p.yr,
        pay_period_month: p.mo,
        pay_period_start: p.start,
        pay_period_end: p.end,
        payment_date: p.pay,
        currency: 'NPR',
        basic_salary: basic,
        hra,
        transport_allowance: 5000,
        medical_allowance: 3500,
        special_allowance: 6500,
        gross_earnings: gross,
        income_tax: tax,
        provident_fund: pf,
        social_security_tax: sst,
        professional_tax: profTax,
        total_deductions: deductions,
        net_pay: net,
        bank_account_masked: ep.bank_account_masked,
        status: 'ISSUED',
        created_at: nowIso(),
        updated_at: nowIso()
      });
    }
  }

  // Mutex lock for atomic RPC simulation (prevents race conditions during concurrent test calls)
  let rpcQueue = Promise.resolve();
  function runAtomic(fn) {
    const next = rpcQueue.then(() => fn());
    rpcQueue = next.catch(() => {});
    return next;
  }

  return {
    isMock: true,
    tables,
    async rpc(fnName, params) {
      return runAtomic(async () => {
        try {
          if (fnName === 'rpc_update_employee_address') {
            const addr = tables.addresses.find((a) => a.employee_id === params.p_employee_id);
            if (!addr) {
              return { data: null, error: { code: 'P0002', message: 'ADDRESS_NOT_FOUND' } };
            }
            if (addr.version !== params.p_expected_version) {
              return {
                data: null,
                error: { code: '40001', message: `VERSION_CONFLICT: Expected version ${params.p_expected_version}, found ${addr.version}` }
              };
            }
            const before = {
              residential_line1: addr.residential_line1,
              residential_line2: addr.residential_line2,
              residential_city: addr.residential_city,
              residential_state: addr.residential_state,
              residential_postal_code: addr.residential_postal_code,
              residential_country: addr.residential_country,
              mailing_same_as_residential: addr.mailing_same_as_residential,
              mailing_line1: addr.mailing_line1,
              mailing_line2: addr.mailing_line2,
              mailing_city: addr.mailing_city,
              mailing_state: addr.mailing_state,
              mailing_postal_code: addr.mailing_postal_code,
              mailing_country: addr.mailing_country,
              version: addr.version
            };

            addr.residential_line1 = params.p_residential_line1;
            addr.residential_line2 = params.p_residential_line2;
            addr.residential_city = params.p_residential_city;
            addr.residential_state = params.p_residential_state;
            addr.residential_postal_code = params.p_residential_postal_code;
            addr.residential_country = params.p_residential_country;
            addr.mailing_same_as_residential = params.p_mailing_same_as_residential;
            addr.mailing_line1 = params.p_mailing_same_as_residential ? params.p_residential_line1 : params.p_mailing_line1;
            addr.mailing_line2 = params.p_mailing_same_as_residential ? params.p_residential_line2 : params.p_mailing_line2;
            addr.mailing_city = params.p_mailing_same_as_residential ? params.p_residential_city : params.p_mailing_city;
            addr.mailing_state = params.p_mailing_same_as_residential ? params.p_residential_state : params.p_mailing_state;
            addr.mailing_postal_code = params.p_mailing_same_as_residential ? params.p_residential_postal_code : params.p_mailing_postal_code;
            addr.mailing_country = params.p_mailing_same_as_residential ? params.p_residential_country : params.p_mailing_country;
            addr.version += 1;
            addr.updated_at = nowIso();

            const after = {
              residential_line1: addr.residential_line1,
              residential_line2: addr.residential_line2,
              residential_city: addr.residential_city,
              residential_state: addr.residential_state,
              residential_postal_code: addr.residential_postal_code,
              residential_country: addr.residential_country,
              mailing_same_as_residential: addr.mailing_same_as_residential,
              mailing_line1: addr.mailing_line1,
              mailing_line2: addr.mailing_line2,
              mailing_city: addr.mailing_city,
              mailing_state: addr.mailing_state,
              mailing_postal_code: addr.mailing_postal_code,
              mailing_country: addr.mailing_country,
              version: addr.version
            };

            tables.audit_events.push({
              id: crypto.randomUUID(),
              actor_user_id: params.p_actor_user_id,
              actor_role: params.p_actor_role,
              action: 'ADDRESS_UPDATED',
              target_type: 'address',
              target_id: addr.id,
              correlation_id: params.p_correlation_id,
              ip_address: params.p_ip_address,
              metadata: { employee_id: params.p_employee_id, before, after },
              created_at: nowIso(),
              updated_at: nowIso()
            });

            return { data: { ...addr }, error: null };
          }

          if (fnName === 'rpc_create_leave_request') {
            if (params.p_end_date < params.p_start_date) {
              return { data: null, error: { code: '22007', message: 'INVALID_DATES: End date must be on or after start date' } };
            }
            if (params.p_idempotency_key) {
              const dup = tables.leave_requests.find(
                (r) => r.employee_id === params.p_employee_id && r.idempotency_key === params.p_idempotency_key
              );
              if (dup) {
                return { data: null, error: { code: '23505', message: 'DUPLICATE_SUBMISSION: Leave request already submitted' } };
              }
            }

            const startMs = Date.parse(`${params.p_start_date}T00:00:00Z`);
            const endMs = Date.parse(`${params.p_end_date}T00:00:00Z`);
            const totalDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
            const year = Number(params.p_start_date.slice(0, 4));

            const bal = tables.leave_balances.find(
              (b) => b.employee_id === params.p_employee_id && b.leave_type_id === params.p_leave_type_id && b.year === year
            );
            if (!bal) {
              return { data: null, error: { code: 'P0002', message: `BALANCE_NOT_FOUND: No leave balance configured for year ${year}` } };
            }

            const available = bal.allocated_days - bal.used_days - bal.pending_days;
            if (available < totalDays) {
              return {
                data: null,
                error: { code: 'P0001', message: `INSUFFICIENT_BALANCE: Requested ${totalDays} days, but only ${available} available` }
              };
            }

            const overlap = tables.leave_requests.some((r) => {
              if (r.employee_id !== params.p_employee_id) return false;
              if (r.status !== 'PENDING' && r.status !== 'APPROVED') return false;
              return !(params.p_end_date < r.start_date || params.p_start_date > r.end_date);
            });
            if (overlap) {
              return {
                data: null,
                error: { code: '23P01', message: 'LEAVE_OVERLAP: Requested dates overlap with an existing pending or approved leave request' }
              };
            }

            bal.pending_days += totalDays;
            bal.version += 1;
            bal.updated_at = nowIso();

            const created = {
              id: crypto.randomUUID(),
              employee_id: params.p_employee_id,
              leave_type_id: params.p_leave_type_id,
              start_date: params.p_start_date,
              end_date: params.p_end_date,
              total_days: totalDays,
              reason: params.p_reason,
              status: 'PENDING',
              decided_by: null,
              decided_at: null,
              decision_comment: null,
              idempotency_key: params.p_idempotency_key || null,
              version: 1,
              created_at: nowIso(),
              updated_at: nowIso()
            };
            tables.leave_requests.push(created);

            tables.audit_events.push({
              id: crypto.randomUUID(),
              actor_user_id: params.p_actor_user_id,
              actor_role: params.p_actor_role,
              action: 'LEAVE_REQUEST_CREATED',
              target_type: 'leave_request',
              target_id: created.id,
              correlation_id: params.p_correlation_id,
              ip_address: params.p_ip_address,
              metadata: {
                employee_id: params.p_employee_id,
                leave_type_id: params.p_leave_type_id,
                start_date: params.p_start_date,
                end_date: params.p_end_date,
                total_days: totalDays,
                status: 'PENDING'
              },
              created_at: nowIso(),
              updated_at: nowIso()
            });

            return { data: { ...created }, error: null };
          }

          if (fnName === 'rpc_decide_leave_request') {
            const req = tables.leave_requests.find((r) => r.id === params.p_leave_request_id);
            if (!req) {
              return { data: null, error: { code: 'P0002', message: 'LEAVE_NOT_FOUND' } };
            }
            const emp = tables.employee_profiles.find((e) => e.id === req.employee_id);
            if (!emp || emp.manager_id !== params.p_manager_employee_id) {
              return { data: null, error: { code: '42501', message: 'NOT_DIRECT_REPORT: Manager can only decide leave requests for direct reports' } };
            }
            if (req.status !== 'PENDING') {
              return { data: null, error: { code: '40001', message: `INVALID_WORKFLOW_STATE: Only PENDING requests can be decided (current: ${req.status})` } };
            }
            if (params.p_expected_version !== null && params.p_expected_version !== undefined && req.version !== params.p_expected_version) {
              return { data: null, error: { code: '40001', message: `VERSION_CONFLICT: Expected version ${params.p_expected_version}, found ${req.version}` } };
            }

            const year = Number(req.start_date.slice(0, 4));
            const bal = tables.leave_balances.find(
              (b) => b.employee_id === req.employee_id && b.leave_type_id === req.leave_type_id && b.year === year
            );

            if (params.p_decision === 'APPROVED') {
              if (bal.allocated_days - bal.used_days < req.total_days) {
                return { data: null, error: { code: 'P0001', message: 'INSUFFICIENT_BALANCE_ON_APPROVAL' } };
              }
              bal.pending_days = Math.max(0, bal.pending_days - req.total_days);
              bal.used_days += req.total_days;
              bal.version += 1;
              bal.updated_at = nowIso();
            } else {
              bal.pending_days = Math.max(0, bal.pending_days - req.total_days);
              bal.version += 1;
              bal.updated_at = nowIso();
            }

            const prevVersion = req.version;
            req.status = params.p_decision;
            req.decided_by = params.p_manager_employee_id;
            req.decided_at = nowIso();
            req.decision_comment = params.p_decision_comment;
            req.version += 1;
            req.updated_at = nowIso();

            tables.audit_events.push({
              id: crypto.randomUUID(),
              actor_user_id: params.p_actor_user_id,
              actor_role: params.p_actor_role,
              action: `LEAVE_REQUEST_${params.p_decision}`,
              target_type: 'leave_request',
              target_id: req.id,
              correlation_id: params.p_correlation_id,
              ip_address: params.p_ip_address,
              metadata: {
                employee_id: req.employee_id,
                decided_by: params.p_manager_employee_id,
                decision: params.p_decision,
                total_days: req.total_days,
                previous_version: prevVersion,
                new_version: req.version
              },
              created_at: nowIso(),
              updated_at: nowIso()
            });

            return { data: { ...req }, error: null };
          }

          if (fnName === 'rpc_cancel_leave_request') {
            const req = tables.leave_requests.find((r) => r.id === params.p_leave_request_id);
            if (!req) {
              return { data: null, error: { code: 'P0002', message: 'LEAVE_NOT_FOUND' } };
            }
            if (req.employee_id !== params.p_employee_id) {
              return { data: null, error: { code: '42501', message: 'FORBIDDEN_NOT_OWNER' } };
            }
            if (req.status !== 'PENDING') {
              return { data: null, error: { code: '40001', message: `INVALID_WORKFLOW_STATE: Only PENDING requests can be cancelled (current: ${req.status})` } };
            }
            if (params.p_expected_version !== null && params.p_expected_version !== undefined && req.version !== params.p_expected_version) {
              return { data: null, error: { code: '40001', message: `VERSION_CONFLICT: Expected version ${params.p_expected_version}, found ${req.version}` } };
            }

            const year = Number(req.start_date.slice(0, 4));
            const bal = tables.leave_balances.find(
              (b) => b.employee_id === req.employee_id && b.leave_type_id === req.leave_type_id && b.year === year
            );
            if (bal) {
              bal.pending_days = Math.max(0, bal.pending_days - req.total_days);
              bal.version += 1;
              bal.updated_at = nowIso();
            }

            const prevVersion = req.version;
            req.status = 'CANCELLED';
            req.version += 1;
            req.updated_at = nowIso();

            tables.audit_events.push({
              id: crypto.randomUUID(),
              actor_user_id: params.p_actor_user_id,
              actor_role: params.p_actor_role,
              action: 'LEAVE_REQUEST_CANCELLED',
              target_type: 'leave_request',
              target_id: req.id,
              correlation_id: params.p_correlation_id,
              ip_address: params.p_ip_address,
              metadata: {
                employee_id: req.employee_id,
                total_days: req.total_days,
                previous_version: prevVersion,
                new_version: req.version
              },
              created_at: nowIso(),
              updated_at: nowIso()
            });

            return { data: { ...req }, error: null };
          }

          return { data: null, error: { code: '42883', message: `Unknown RPC ${fnName}` } };
        } catch (err) {
          return { data: null, error: { code: 'XX000', message: err.message } };
        }
      });
    }
  };
}

/**
 * Creates the database repository layer.
 * In production/development (`NODE_ENV !== 'test'`), wraps `@supabase/supabase-js`
 * initialized with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
 * In test mode (`NODE_ENV === 'test'`), uses the transactional in-memory database.
 */
export async function createRepository(config) {
  if (config.isTest) {
    const mem = await createInMemoryDatabase();
    return buildRepositoryAdapter(mem);
  }

  if (!createSupabaseClient) {
    throw new Error('@supabase/supabase-js is not installed. Run `npm install` first.');
  }

  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return buildSupabaseRepository(supabase);
}

/**
 * Repository implementation backed by live Supabase (@supabase/supabase-js)
 */
function buildSupabaseRepository(supabase) {
  return {
    async checkHealth() {
      const { error } = await supabase.from('leave_types').select('id').limit(1);
      if (error) throw new Error(error.message);
      return true;
    },

    async findUserByEmail(email) {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async findUserById(id) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async updateUserLoginState(userId, updates) {
      const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select('*').single();
      if (error) throw new Error(error.message);
      return data;
    },

    async recordLoginAttempt({ email, ip_address, succeeded }) {
      const { error } = await supabase.from('login_attempts').insert({ email, ip_address, succeeded });
      if (error) throw new Error(error.message);
    },

    async countRecentFailedLoginsByIp(ip_address, sinceIso) {
      const { count, error } = await supabase
        .from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ip_address)
        .eq('succeeded', false)
        .gte('attempted_at', sinceIso);
      if (error) throw new Error(error.message);
      return count || 0;
    },

    async createSession(sessionData) {
      const { data, error } = await supabase.from('sessions').insert(sessionData).select('*').single();
      if (error) throw new Error(error.message);
      return data;
    },

    async findSessionByTokenHash(tokenHash) {
      const { data, error } = await supabase.from('sessions').select('*').eq('token_hash', tokenHash).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async touchSessionIdleExpiry(sessionId, idleExpiresAtIso) {
      const { error } = await supabase.from('sessions').update({ idle_expires_at: idleExpiresAtIso }).eq('id', sessionId);
      if (error) throw new Error(error.message);
    },

    async revokeSession(sessionId) {
      const { error } = await supabase.from('sessions').update({ revoked_at: new Date().toISOString() }).eq('id', sessionId);
      if (error) throw new Error(error.message);
    },

    async revokeAllUserSessions(userId) {
      const { error } = await supabase
        .from('sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null);
      if (error) throw new Error(error.message);
    },

    async findEmployeeByUserId(userId) {
      const { data, error } = await supabase.from('employee_profiles').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async findEmployeeById(employeeId) {
      const { data, error } = await supabase.from('employee_profiles').select('*').eq('id', employeeId).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async findAddressByEmployeeId(employeeId) {
      const { data, error } = await supabase.from('addresses').select('*').eq('employee_id', employeeId).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async updateAddressAtomic(params) {
      const { data, error } = await supabase.rpc('rpc_update_employee_address', params);
      return { data, error };
    },

    async listLeaveTypes(onlyActive = true) {
      let q = supabase.from('leave_types').select('*').order('code', { ascending: true });
      if (onlyActive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },

    async getLeaveBalances(employeeId, year = new Date().getFullYear()) {
      const activeTypes = await this.listLeaveTypes(true);
      let { data: balances, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', year);
      if (error) throw new Error(error.message);

      balances = balances || [];
      const existingTypeIds = new Set(balances.map((b) => b.leave_type_id));
      const missingTypes = activeTypes.filter((t) => !existingTypeIds.has(t.id));

      if (missingTypes.length > 0) {
        const rowsToInsert = missingTypes.map((t) => ({
          employee_id: employeeId,
          leave_type_id: t.id,
          year,
          allocated_days: t.default_annual_quota || 0,
          used_days: 0,
          pending_days: 0,
          version: 1
        }));
        await supabase.from('leave_balances').upsert(rowsToInsert, {
          onConflict: 'employee_id,leave_type_id,year',
          ignoreDuplicates: true
        });

        const { data: updatedBalances, error: refetchErr } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('year', year);
        if (!refetchErr && updatedBalances) {
          balances = updatedBalances;
        }
      }

      const allTypes = await this.listLeaveTypes(false);
      const typeMap = new Map(allTypes.map((t) => [t.id, t]));
      return balances.map((b) => {
        const lt = typeMap.get(b.leave_type_id) || {};
        return {
          ...b,
          leave_type_code: lt.code,
          leave_type_name: lt.name,
          description: lt.description,
          is_paid: lt.is_paid,
          available_days: b.allocated_days - b.used_days - b.pending_days
        };
      });
    },

    async createLeaveRequestAtomic(params) {
      const { data, error } = await supabase.rpc('rpc_create_leave_request', params);
      return { data, error };
    },

    async decideLeaveRequestAtomic(params) {
      const { data, error } = await supabase.rpc('rpc_decide_leave_request', params);
      return { data, error };
    },

    async cancelLeaveRequestAtomic(params) {
      const { data, error } = await supabase.rpc('rpc_cancel_leave_request', params);
      return { data, error };
    },

    async findLeaveRequestById(id) {
      const { data, error } = await supabase.from('leave_requests').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async listEmployeeLeaves(employeeId, { page, pageSize, sortBy, sortOrder, filters }) {
      let q = supabase.from('leave_requests').select('*', { count: 'exact' }).eq('employee_id', employeeId);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.leave_type_id) q = q.eq('leave_type_id', filters.leave_type_id);
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw new Error(error.message);
      const types = await this.listLeaveTypes(false);
      const typeMap = new Map(types.map((t) => [t.id, t]));
      const items = (data || []).map((r) => ({
        ...r,
        leave_type_code: typeMap.get(r.leave_type_id)?.code || 'UNKNOWN',
        leave_type_name: typeMap.get(r.leave_type_id)?.name || 'Leave'
      }));
      return { items, total: count || 0 };
    },

    async listTeamLeaves(managerEmployeeId, { page, pageSize, sortBy, sortOrder, filters }) {
      const { data: reports, error: repErr } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('manager_id', managerEmployeeId);
      if (repErr) throw new Error(repErr.message);
      const reportMap = new Map((reports || []).map((r) => [r.id, r]));
      const reportIds = Array.from(reportMap.keys());
      if (reportIds.length === 0) return { items: [], total: 0 };

      let q = supabase.from('leave_requests').select('*', { count: 'exact' }).in('employee_id', reportIds);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.employee_id) q = q.eq('employee_id', filters.employee_id);
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw new Error(error.message);
      const types = await this.listLeaveTypes(false);
      const typeMap = new Map(types.map((t) => [t.id, t]));
      const items = (data || []).map((r) => {
        const emp = reportMap.get(r.employee_id) || {};
        return {
          ...r,
          employee_name: emp.legal_name,
          employee_code: emp.employee_code,
          department: emp.department,
          designation: emp.designation,
          leave_type_code: typeMap.get(r.leave_type_id)?.code || 'UNKNOWN',
          leave_type_name: typeMap.get(r.leave_type_id)?.name || 'Leave'
        };
      });
      return { items, total: count || 0 };
    },

    async listEmployeePayslips(employeeId, { page, pageSize, sortBy, sortOrder, filters }) {
      let q = supabase.from('payslips').select('*', { count: 'exact' }).eq('employee_id', employeeId);
      if (filters.year) q = q.eq('pay_period_year', filters.year);
      if (filters.month) q = q.eq('pay_period_month', filters.month);
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      if (sortBy === 'pay_period_year') {
        q = q.order('pay_period_month', { ascending: sortOrder === 'asc' });
      }
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw new Error(error.message);
      return { items: data || [], total: count || 0 };
    },

    async findPayslipById(id) {
      const { data, error } = await supabase.from('payslips').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async listHrEmployees({ page, pageSize, sortBy, sortOrder, filters }) {
      let q = supabase.from('employee_profiles').select('*', { count: 'exact' });
      if (filters.department) q = q.eq('department', filters.department);
      if (filters.employment_status) q = q.eq('employment_status', filters.employment_status);
      if (filters.search) {
        q = q.or(`legal_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`);
      }
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw new Error(error.message);
      return { items: data || [], total: count || 0 };
    },

    async listHrLeaves({ page, pageSize, sortBy, sortOrder, filters }) {
      let q = supabase.from('leave_requests').select('*', { count: 'exact' });
      if (filters.status) q = q.eq('status', filters.status);
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw new Error(error.message);
      const { data: emps } = await supabase.from('employee_profiles').select('id,legal_name,employee_code,department');
      const empMap = new Map((emps || []).map((e) => [e.id, e]));
      const types = await this.listLeaveTypes(false);
      const typeMap = new Map(types.map((t) => [t.id, t]));
      const items = (data || []).map((r) => {
        const emp = empMap.get(r.employee_id) || {};
        return {
          ...r,
          employee_name: emp.legal_name,
          employee_code: emp.employee_code,
          department: emp.department,
          leave_type_code: typeMap.get(r.leave_type_id)?.code || 'UNKNOWN',
          leave_type_name: typeMap.get(r.leave_type_id)?.name || 'Leave'
        };
      });
      return { items, total: count || 0 };
    },

    async listAdminUsers({ page, pageSize, sortBy, sortOrder, filters }) {
      let q = supabase
        .from('users')
        .select('id,email,role,status,failed_login_count,locked_until,last_login_at,created_at,updated_at', { count: 'exact' });
      if (filters.role) q = q.eq('role', filters.role);
      if (filters.status) q = q.eq('status', filters.status);
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw new Error(error.message);

      const userIds = (data || []).map((u) => u.id);
      let profileMap = new Map();
      let managerIds = new Set();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('id,user_id,employee_code,legal_name,department,designation,manager_id')
          .in('user_id', userIds);
        for (const p of profiles || []) {
          profileMap.set(p.user_id, p);
          if (p.manager_id) managerIds.add(p.manager_id);
        }
      }

      let managerMap = new Map();
      if (managerIds.size > 0) {
        const { data: managers } = await supabase
          .from('employee_profiles')
          .select('id,legal_name,employee_code')
          .in('id', Array.from(managerIds));
        for (const m of managers || []) {
          managerMap.set(m.id, m);
        }
      }

      const items = (data || []).map((u) => {
        const p = profileMap.get(u.id);
        const mgr = p && p.manager_id ? managerMap.get(p.manager_id) : null;
        return {
          ...u,
          employee: p
            ? {
                id: p.id,
                employee_code: p.employee_code,
                legal_name: p.legal_name,
                department: p.department,
                designation: p.designation,
                manager_id: p.manager_id,
                manager_name: mgr ? mgr.legal_name : null,
                manager_code: mgr ? mgr.employee_code : null
              }
            : null
        };
      });

      return { items, total: count || 0 };
    },

    async listManagers() {
      const { data: managerUsers, error: uErr } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'MANAGER');
      if (uErr) throw new Error(uErr.message);
      const managerUserIds = (managerUsers || []).map((u) => u.id);
      if (managerUserIds.length === 0) return [];
      const { data: profiles, error: pErr } = await supabase
        .from('employee_profiles')
        .select('id,user_id,employee_code,legal_name,department,designation')
        .in('user_id', managerUserIds)
        .order('legal_name', { ascending: true });
      if (pErr) throw new Error(pErr.message);
      return profiles || [];
    },

    async createAdminUser({ email, password_hash, role, legal_name, department, designation, employee_code, manager_id }) {
      const { data: user, error: uErr } = await supabase
        .from('users')
        .insert({ email, password_hash, role, status: 'ACTIVE' })
        .select('id,email,role,status,created_at,updated_at')
        .single();
      if (uErr) {
        const err = new Error(uErr.message);
        err.code = uErr.code;
        throw err;
      }

      const { data: profile, error: pErr } = await supabase
        .from('employee_profiles')
        .insert({
          user_id: user.id,
          employee_code,
          legal_name,
          department,
          designation,
          joining_date: new Date().toISOString().slice(0, 10),
          manager_id: manager_id || null
        })
        .select('*')
        .single();
      if (pErr) {
        const err = new Error(pErr.message);
        err.code = pErr.code;
        throw err;
      }

      await supabase.from('addresses').insert({
        employee_id: profile.id,
        residential_line1: 'Pending Address Update',
        residential_city: 'Kathmandu',
        residential_state: 'Bagmati',
        residential_postal_code: '44600',
        residential_country: 'NP',
        mailing_same_as_residential: true,
        mailing_line1: 'Pending Address Update',
        mailing_city: 'Kathmandu',
        mailing_state: 'Bagmati',
        mailing_postal_code: '44600',
        mailing_country: 'NP'
      });

      const { data: activeTypes } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true);
      const currentYear = new Date().getFullYear();
      if (activeTypes && activeTypes.length > 0) {
        const balanceInserts = activeTypes.map((lt) => ({
          employee_id: profile.id,
          leave_type_id: lt.id,
          year: currentYear,
          allocated_days: lt.default_annual_quota || 0,
          used_days: 0,
          pending_days: 0,
          version: 1
        }));
        await supabase.from('leave_balances').insert(balanceInserts);
      }

      return { user, profile };
    },

    async updateAdminUser(userId, updates) {
      const userPayload = {};
      if (updates.role !== undefined) userPayload.role = updates.role;
      if (updates.status !== undefined) {
        userPayload.status = updates.status;
        if (updates.status === 'ACTIVE') {
          userPayload.failed_login_count = 0;
          userPayload.locked_until = null;
        }
      }

      let updatedUser = null;
      if (Object.keys(userPayload).length > 0) {
        const { data, error } = await supabase
          .from('users')
          .update(userPayload)
          .eq('id', userId)
          .select('id,email,role,status,failed_login_count,locked_until,last_login_at,created_at,updated_at')
          .single();
        if (error) throw new Error(error.message);
        updatedUser = data;
      } else {
        const { data, error } = await supabase
          .from('users')
          .select('id,email,role,status,failed_login_count,locked_until,last_login_at,created_at,updated_at')
          .eq('id', userId)
          .single();
        if (error) throw new Error(error.message);
        updatedUser = data;
      }

      if (updates.manager_id !== undefined) {
        const { error: pErr } = await supabase
          .from('employee_profiles')
          .update({ manager_id: updates.manager_id })
          .eq('user_id', userId);
        if (pErr) throw new Error(pErr.message);
      }

      return updatedUser;
    },

    async createLeaveType(input) {
      const { data, error } = await supabase.from('leave_types').insert(input).select('*').single();
      if (error) throw new Error(error.message);
      return data;
    },

    async recordAuditEvent(event) {
      const { error } = await supabase.from('audit_events').insert(event);
      if (error) throw new Error(error.message);
    },

    async listAuditEvents({ page, pageSize, sortBy, sortOrder, filters }) {
      let q = supabase.from('audit_events').select('*', { count: 'exact' });
      if (filters.action) q = q.eq('action', filters.action);
      q = q.order(sortBy, { ascending: sortOrder === 'asc' });
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await q.range(from, to);
      if (error) throw new Error(error.message);
      return { items: data || [], total: count || 0 };
    }
  };
}

/**
 * Repository implementation backed by the transactional in-memory database
 */
function buildRepositoryAdapter(mem) {
  const { tables } = mem;

  function sortAndPaginate(list, { page = 1, pageSize = 10, sortBy = 'created_at', sortOrder = 'desc' }) {
    const sorted = [...list].sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (va === vb) {
        if (sortBy === 'pay_period_year' && a.pay_period_month !== b.pay_period_month) {
          return sortOrder === 'asc'
            ? a.pay_period_month - b.pay_period_month
            : b.pay_period_month - a.pay_period_month;
        }
        return 0;
      }
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = va < vb ? -1 : 1;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize).map((item) => ({ ...item }));
    return { items, total };
  }

  return {
    isMock: true,
    tables,
    async checkHealth() {
      return true;
    },

    async findUserByEmail(email) {
      const u = tables.users.find((x) => x.email === email);
      return u ? { ...u } : null;
    },

    async findUserById(id) {
      const u = tables.users.find((x) => x.id === id);
      return u ? { ...u } : null;
    },

    async updateUserLoginState(userId, updates) {
      const u = tables.users.find((x) => x.id === userId);
      if (!u) return null;
      Object.assign(u, updates, { updated_at: new Date().toISOString() });
      return { ...u };
    },

    async recordLoginAttempt({ email, ip_address, succeeded }) {
      tables.login_attempts.push({
        id: crypto.randomUUID(),
        email,
        ip_address,
        succeeded,
        attempted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    },

    async countRecentFailedLoginsByIp(ip_address, sinceIso) {
      return tables.login_attempts.filter(
        (a) => a.ip_address === ip_address && !a.succeeded && a.attempted_at >= sinceIso
      ).length;
    },

    async createSession(sessionData) {
      const record = {
        id: crypto.randomUUID(),
        ...sessionData,
        revoked_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      tables.sessions.push(record);
      return { ...record };
    },

    async findSessionByTokenHash(tokenHash) {
      const s = tables.sessions.find((x) => x.token_hash === tokenHash);
      return s ? { ...s } : null;
    },

    async touchSessionIdleExpiry(sessionId, idleExpiresAtIso) {
      const s = tables.sessions.find((x) => x.id === sessionId);
      if (s) {
        s.idle_expires_at = idleExpiresAtIso;
        s.updated_at = new Date().toISOString();
      }
    },

    async revokeSession(sessionId) {
      const s = tables.sessions.find((x) => x.id === sessionId);
      if (s) {
        s.revoked_at = new Date().toISOString();
        s.updated_at = new Date().toISOString();
      }
    },

    async revokeAllUserSessions(userId) {
      const now = new Date().toISOString();
      for (const s of tables.sessions) {
        if (s.user_id === userId && !s.revoked_at) {
          s.revoked_at = now;
          s.updated_at = now;
        }
      }
    },

    async findEmployeeByUserId(userId) {
      const ep = tables.employee_profiles.find((x) => x.user_id === userId);
      return ep ? { ...ep } : null;
    },

    async findEmployeeById(employeeId) {
      const ep = tables.employee_profiles.find((x) => x.id === employeeId);
      return ep ? { ...ep } : null;
    },

    async findAddressByEmployeeId(employeeId) {
      const a = tables.addresses.find((x) => x.employee_id === employeeId);
      return a ? { ...a } : null;
    },

    async updateAddressAtomic(params) {
      return mem.rpc('rpc_update_employee_address', params);
    },

    async listLeaveTypes(onlyActive = true) {
      return tables.leave_types
        .filter((t) => (!onlyActive ? true : t.is_active))
        .map((t) => ({ ...t }));
    },

    async getLeaveBalances(employeeId, year = new Date().getFullYear()) {
      const activeTypes = tables.leave_types.filter((t) => t.is_active);
      const existingTypeIds = new Set(
        tables.leave_balances
          .filter((b) => b.employee_id === employeeId && b.year === year)
          .map((b) => b.leave_type_id)
      );

      for (const lt of activeTypes) {
        if (!existingTypeIds.has(lt.id)) {
          tables.leave_balances.push({
            id: crypto.randomUUID(),
            employee_id: employeeId,
            leave_type_id: lt.id,
            year,
            allocated_days: lt.default_annual_quota || 0,
            used_days: 0,
            pending_days: 0,
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      const balances = tables.leave_balances.filter(
        (b) => b.employee_id === employeeId && b.year === year
      );
      return balances.map((b) => {
        const lt = tables.leave_types.find((t) => t.id === b.leave_type_id) || {};
        return {
          ...b,
          leave_type_code: lt.code,
          leave_type_name: lt.name,
          description: lt.description,
          is_paid: lt.is_paid,
          available_days: b.allocated_days - b.used_days - b.pending_days
        };
      });
    },

    async createLeaveRequestAtomic(params) {
      return mem.rpc('rpc_create_leave_request', params);
    },

    async decideLeaveRequestAtomic(params) {
      return mem.rpc('rpc_decide_leave_request', params);
    },

    async cancelLeaveRequestAtomic(params) {
      return mem.rpc('rpc_cancel_leave_request', params);
    },

    async findLeaveRequestById(id) {
      const r = tables.leave_requests.find((x) => x.id === id);
      return r ? { ...r } : null;
    },

    async listEmployeeLeaves(employeeId, { page, pageSize, sortBy, sortOrder, filters }) {
      let filtered = tables.leave_requests.filter((r) => r.employee_id === employeeId);
      if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
      if (filters.leave_type_id) filtered = filtered.filter((r) => r.leave_type_id === filters.leave_type_id);
      const { items, total } = sortAndPaginate(filtered, { page, pageSize, sortBy, sortOrder });
      const enriched = items.map((r) => {
        const lt = tables.leave_types.find((t) => t.id === r.leave_type_id) || {};
        return {
          ...r,
          leave_type_code: lt.code || 'UNKNOWN',
          leave_type_name: lt.name || 'Leave'
        };
      });
      return { items: enriched, total };
    },

    async listTeamLeaves(managerEmployeeId, { page, pageSize, sortBy, sortOrder, filters }) {
      const reports = tables.employee_profiles.filter((e) => e.manager_id === managerEmployeeId);
      const reportMap = new Map(reports.map((r) => [r.id, r]));
      let filtered = tables.leave_requests.filter((r) => reportMap.has(r.employee_id));
      if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
      if (filters.employee_id) filtered = filtered.filter((r) => r.employee_id === filters.employee_id);
      const { items, total } = sortAndPaginate(filtered, { page, pageSize, sortBy, sortOrder });
      const enriched = items.map((r) => {
        const emp = reportMap.get(r.employee_id) || {};
        const lt = tables.leave_types.find((t) => t.id === r.leave_type_id) || {};
        return {
          ...r,
          employee_name: emp.legal_name,
          employee_code: emp.employee_code,
          department: emp.department,
          designation: emp.designation,
          leave_type_code: lt.code || 'UNKNOWN',
          leave_type_name: lt.name || 'Leave'
        };
      });
      return { items: enriched, total };
    },

    async listEmployeePayslips(employeeId, { page, pageSize, sortBy, sortOrder, filters }) {
      let filtered = tables.payslips.filter((p) => p.employee_id === employeeId);
      if (filters.year) filtered = filtered.filter((p) => p.pay_period_year === filters.year);
      if (filters.month) filtered = filtered.filter((p) => p.pay_period_month === filters.month);
      return sortAndPaginate(filtered, { page, pageSize, sortBy, sortOrder });
    },

    async findPayslipById(id) {
      const p = tables.payslips.find((x) => x.id === id);
      return p ? { ...p } : null;
    },

    async listHrEmployees({ page, pageSize, sortBy, sortOrder, filters }) {
      let filtered = [...tables.employee_profiles];
      if (filters.department) filtered = filtered.filter((e) => e.department === filters.department);
      if (filters.employment_status) filtered = filtered.filter((e) => e.employment_status === filters.employment_status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(
          (e) => e.legal_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q)
        );
      }
      return sortAndPaginate(filtered, { page, pageSize, sortBy, sortOrder });
    },

    async listHrLeaves({ page, pageSize, sortBy, sortOrder, filters }) {
      let filtered = [...tables.leave_requests];
      if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
      const { items, total } = sortAndPaginate(filtered, { page, pageSize, sortBy, sortOrder });
      const enriched = items.map((r) => {
        const emp = tables.employee_profiles.find((e) => e.id === r.employee_id) || {};
        const lt = tables.leave_types.find((t) => t.id === r.leave_type_id) || {};
        return {
          ...r,
          employee_name: emp.legal_name,
          employee_code: emp.employee_code,
          department: emp.department,
          leave_type_code: lt.code || 'UNKNOWN',
          leave_type_name: lt.name || 'Leave'
        };
      });
      return { items: enriched, total };
    },

    async listAdminUsers({ page, pageSize, sortBy, sortOrder, filters }) {
      const empMap = new Map(tables.employee_profiles.map((e) => [e.user_id, e]));
      const profileById = new Map(tables.employee_profiles.map((e) => [e.id, e]));
      let filtered = tables.users.map((u) => {
        const { password_hash, ...safeUser } = u;
        const p = empMap.get(u.id);
        const mgr = p && p.manager_id ? profileById.get(p.manager_id) : null;
        return {
          ...safeUser,
          employee: p
            ? {
                id: p.id,
                employee_code: p.employee_code,
                legal_name: p.legal_name,
                department: p.department,
                designation: p.designation,
                manager_id: p.manager_id,
                manager_name: mgr ? mgr.legal_name : null,
                manager_code: mgr ? mgr.employee_code : null
              }
            : null
        };
      });
      if (filters.role) filtered = filtered.filter((u) => u.role === filters.role);
      if (filters.status) filtered = filtered.filter((u) => u.status === filters.status);
      return sortAndPaginate(filtered, { page, pageSize, sortBy, sortOrder });
    },

    async listManagers() {
      const managerUserIds = new Set(tables.users.filter((u) => u.role === 'MANAGER').map((u) => u.id));
      return tables.employee_profiles
        .filter((e) => managerUserIds.has(e.user_id))
        .map((e) => ({
          id: e.id,
          user_id: e.user_id,
          employee_code: e.employee_code,
          legal_name: e.legal_name,
          department: e.department,
          designation: e.designation
        }));
    },

    async createAdminUser({ email, password_hash, role, legal_name, department, designation, employee_code, manager_id }) {
      if (tables.users.some((u) => u.email === email)) {
        const err = new Error('DUPLICATE_EMAIL');
        err.code = '23505';
        throw err;
      }
      if (tables.employee_profiles.some((e) => e.employee_code === employee_code)) {
        const err = new Error('DUPLICATE_EMPLOYEE_CODE');
        err.code = '23505';
        throw err;
      }
      const now = new Date().toISOString();
      const newUser = {
        id: crypto.randomUUID(),
        email,
        password_hash,
        role,
        status: 'ACTIVE',
        failed_login_count: 0,
        locked_until: null,
        last_login_at: null,
        created_at: now,
        updated_at: now
      };
      tables.users.push(newUser);

      const newProfile = {
        id: crypto.randomUUID(),
        user_id: newUser.id,
        employee_code,
        legal_name,
        department,
        designation,
        joining_date: now.slice(0, 10),
        manager_id: manager_id || null,
        phone_masked: '+977-98******99',
        national_id_masked: 'NID-****-1999',
        tax_pan_masked: 'PAN-****-999',
        bank_account_masked: 'XXXX-XXXX-4999',
        employment_status: 'ACTIVE',
        created_at: now,
        updated_at: now
      };
      tables.employee_profiles.push(newProfile);

      tables.addresses.push({
        id: crypto.randomUUID(),
        employee_id: newProfile.id,
        residential_line1: 'Pending Address Update',
        residential_line2: null,
        residential_city: 'Kathmandu',
        residential_state: 'Bagmati',
        residential_postal_code: '44600',
        residential_country: 'NP',
        mailing_same_as_residential: true,
        mailing_line1: 'Pending Address Update',
        mailing_line2: null,
        mailing_city: 'Kathmandu',
        mailing_state: 'Bagmati',
        mailing_postal_code: '44600',
        mailing_country: 'NP',
        version: 1,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      });

      const currentYear = new Date().getFullYear();
      const activeTypes = tables.leave_types.filter((t) => t.is_active);
      for (const lt of activeTypes) {
        tables.leave_balances.push({
          id: crypto.randomUUID(),
          employee_id: newProfile.id,
          leave_type_id: lt.id,
          year: currentYear,
          allocated_days: lt.default_annual_quota || 0,
          used_days: 0,
          pending_days: 0,
          version: 1,
          created_at: now,
          updated_at: now
        });
      }

      const { password_hash: _ph, ...safeUser } = newUser;
      return { user: safeUser, profile: { ...newProfile } };
    },

    async updateAdminUser(userId, updates) {
      const u = tables.users.find((x) => x.id === userId);
      if (!u) return null;
      Object.assign(u, updates, { updated_at: new Date().toISOString() });
      if (updates.status === 'ACTIVE') {
        u.failed_login_count = 0;
        u.locked_until = null;
      }
      if (updates.manager_id !== undefined) {
        const p = tables.employee_profiles.find((x) => x.user_id === userId);
        if (p) {
          p.manager_id = updates.manager_id || null;
          p.updated_at = new Date().toISOString();
        }
      }
      const { password_hash, ...safeUser } = u;
      return safeUser;
    },

    async createLeaveType(input) {
      if (tables.leave_types.some((t) => t.code === input.code)) {
        const err = new Error('DUPLICATE_LEAVE_TYPE_CODE');
        err.code = '23505';
        throw err;
      }
      const now = new Date().toISOString();
      const record = {
        id: crypto.randomUUID(),
        ...input,
        is_active: true,
        created_at: now,
        updated_at: now
      };
      tables.leave_types.push(record);
      return { ...record };
    },

    async recordAuditEvent(event) {
      const now = new Date().toISOString();
      tables.audit_events.push({
        id: crypto.randomUUID(),
        actor_user_id: event.actor_user_id || null,
        actor_role: event.actor_role || null,
        action: event.action,
        target_type: event.target_type,
        target_id: event.target_id || null,
        correlation_id: event.correlation_id,
        ip_address: event.ip_address || '127.0.0.1',
        metadata: event.metadata || {},
        created_at: now,
        updated_at: now
      });
    },

    async listAuditEvents({ page, pageSize, sortBy, sortOrder, filters }) {
      let filtered = [...tables.audit_events];
      if (filters.action) filtered = filtered.filter((a) => a.action === filters.action);
      return sortAndPaginate(filtered, { page, pageSize, sortBy, sortOrder });
    }
  };
}
