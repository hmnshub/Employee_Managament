-- =============================================================================
-- Mini Project 01 – Employee Self-Service Portal
-- File: supabase/02_seed.sql
-- Purpose: Deterministic FICTIONAL demo seed data using pgcrypto bcrypt (cost 12).
--Includes:
--   - 1 System Admin, 1 HR Admin, 2 Managers, 6 Employees (with manager hierarchy)
--   - Addresses for all profiles
--   - 4 Leave types & current-year leave balances for all 10 employees
--   - Sample leave requests (APPROVED, PENDING, REJECTED)
--   - 3 months of payslips per employee (30 payslips total)
-- Demo Passwords (all 12+ characters, non-sensitive, documented in README):
--   - System Admin (sysadmin@portal.demo)       : AdminPortal#2026!
--   - HR Admin     (hradmin@portal.demo)        : HrAdminPortal#2026!
--   - Manager 1    (suman.karki@portal.demo)    : ManagerOne#2026!
--   - Manager 2    (pratima.gurung@portal.demo) : ManagerTwo#2026!
--   - All 6 Employees                           : EmployeePass#2026!
-- =============================================================================

BEGIN;

SET TIME ZONE 'UTC';

-- 1. USERS (bcrypt cost 12 via pgcrypto)
INSERT INTO users (id, email, password_hash, role, status) VALUES
  ('11111111-1111-4111-8111-111111111101', 'sysadmin@portal.demo',       crypt('AdminPortal#2026!',    gen_salt('bf', 12)), 'SYSTEM_ADMIN', 'ACTIVE'),
  ('11111111-1111-4111-8111-111111111102', 'hradmin@portal.demo',        crypt('HrAdminPortal#2026!',  gen_salt('bf', 12)), 'HR_ADMIN',     'ACTIVE'),
  ('11111111-1111-4111-8111-111111111103', 'suman.karki@portal.demo',    crypt('ManagerOne#2026!',     gen_salt('bf', 12)), 'MANAGER',      'ACTIVE'),
  ('11111111-1111-4111-8111-111111111104', 'pratima.gurung@portal.demo', crypt('ManagerTwo#2026!',     gen_salt('bf', 12)), 'MANAGER',      'ACTIVE'),
  ('11111111-1111-4111-8111-111111111105', 'aayush.shrestha@portal.demo',crypt('EmployeePass#2026!',   gen_salt('bf', 12)), 'EMPLOYEE',     'ACTIVE'),
  ('11111111-1111-4111-8111-111111111106', 'ashmita.poudel@portal.demo', crypt('EmployeePass#2026!',   gen_salt('bf', 12)), 'EMPLOYEE',     'ACTIVE'),
  ('11111111-1111-4111-8111-111111111107', 'dipesh.adhikari@portal.demo',crypt('EmployeePass#2026!',   gen_salt('bf', 12)), 'EMPLOYEE',     'ACTIVE'),
  ('11111111-1111-4111-8111-111111111108', 'kriti.maharjan@portal.demo', crypt('EmployeePass#2026!',   gen_salt('bf', 12)), 'EMPLOYEE',     'ACTIVE'),
  ('11111111-1111-4111-8111-111111111109', 'niraj.bhandari@portal.demo', crypt('EmployeePass#2026!',   gen_salt('bf', 12)), 'EMPLOYEE',     'ACTIVE'),
  ('11111111-1111-4111-8111-111111111110', 'sabina.tamang@portal.demo',  crypt('EmployeePass#2026!',   gen_salt('bf', 12)), 'EMPLOYEE',     'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 2. EMPLOYEE PROFILES (Fictional Nepali names, hierarchy: EMP-1003 manages 1005..1007; EMP-1004 manages 1008..1010)
INSERT INTO employee_profiles (
  id, user_id, employee_code, legal_name, department, designation, joining_date,
  manager_id, phone_masked, national_id_masked, tax_pan_masked, bank_account_masked, employment_status
) VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'EMP-1001', 'Rameshwar Thapa', 'Information Technology', 'Principal Systems Administrator',
    '2021-02-15', NULL, '+977-98******01', 'NID-****-1101', 'PAN-****-901', 'XXXX-XXXX-4101', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111102',
    'EMP-1002', 'Bishnu Maya KC', 'People & Culture', 'HR Operations Lead',
    '2021-04-01', NULL, '+977-98******02', 'NID-****-1102', 'PAN-****-902', 'XXXX-XXXX-4102', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111103',
    'EMP-1003', 'Suman Karki', 'Platform Engineering', 'Engineering Manager',
    '2021-06-10', NULL, '+977-98******03', 'NID-****-1103', 'PAN-****-903', 'XXXX-XXXX-4103', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111104',
    'EMP-1004', 'Pratima Gurung', 'Product & Design', 'Product Operations Manager',
    '2021-08-20', NULL, '+977-98******04', 'NID-****-1104', 'PAN-****-904', 'XXXX-XXXX-4104', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '11111111-1111-4111-8111-111111111105',
    'EMP-1005', 'Aayush Shrestha', 'Platform Engineering', 'Senior Backend Engineer',
    '2022-01-10', '22222222-2222-4222-8222-222222222203', '+977-98******05', 'NID-****-1105', 'PAN-****-905', 'XXXX-XXXX-4105', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '11111111-1111-4111-8111-111111111106',
    'EMP-1006', 'Ashmita Poudel', 'Platform Engineering', 'Cloud Reliability Engineer',
    '2022-05-16', '22222222-2222-4222-8222-222222222203', '+977-98******06', 'NID-****-1106', 'PAN-****-906', 'XXXX-XXXX-4106', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    '11111111-1111-4111-8111-111111111107',
    'EMP-1007', 'Dipesh Adhikari', 'Platform Engineering', 'Security Software Engineer',
    '2023-02-01', '22222222-2222-4222-8222-222222222203', '+977-98******07', 'NID-****-1107', 'PAN-****-907', 'XXXX-XXXX-4107', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222208',
    '11111111-1111-4111-8111-111111111108',
    'EMP-1008', 'Kriti Maharjan', 'Product & Design', 'Senior Product Designer',
    '2022-03-14', '22222222-2222-4222-8222-222222222204', '+977-98******08', 'NID-****-1108', 'PAN-****-908', 'XXXX-XXXX-4108', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222209',
    '11111111-1111-4111-8111-111111111109',
    'EMP-1009', 'Niraj Bhandari', 'Product & Design', 'Product Analyst',
    '2023-07-03', '22222222-2222-4222-8222-222222222204', '+977-98******09', 'NID-****-1109', 'PAN-****-909', 'XXXX-XXXX-4109', 'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222210',
    '11111111-1111-4111-8111-111111111110',
    'EMP-1010', 'Sabina Tamang', 'Product & Design', 'Quality Assurance Specialist',
    '2024-01-15', '22222222-2222-4222-8222-222222222204', '+977-98******10', 'NID-****-1110', 'PAN-****-910', 'XXXX-XXXX-4110', 'ACTIVE'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. ADDRESSES (Fictional Nepali residential and mailing addresses)
INSERT INTO addresses (
  id, employee_id,
  residential_line1, residential_line2, residential_city, residential_state, residential_postal_code, residential_country,
  mailing_same_as_residential,
  mailing_line1, mailing_line2, mailing_city, mailing_state, mailing_postal_code, mailing_country,
  version
) VALUES
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'House 14, Lazimpat Sadak', 'Ward 2', 'Kathmandu', 'Bagmati', '44600', 'NP', TRUE,  'House 14, Lazimpat Sadak', 'Ward 2', 'Kathmandu', 'Bagmati', '44600', 'NP', 1),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'House 28, Jhamsikhel Marg', 'Ward 3', 'Lalitpur', 'Bagmati', '44700', 'NP', TRUE,  'House 28, Jhamsikhel Marg', 'Ward 3', 'Lalitpur', 'Bagmati', '44700', 'NP', 1),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203', 'House 42, Maharajgunj Ring Road', 'Ward 4', 'Kathmandu', 'Bagmati', '44600', 'NP', TRUE, 'House 42, Maharajgunj Ring Road', 'Ward 4', 'Kathmandu', 'Bagmati', '44600', 'NP', 1),
  ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222204', 'Lakeside Block B, Baidam Road', 'Ward 6', 'Pokhara', 'Gandaki', '33700', 'NP', FALSE, 'PO Box 194, New Baneshwor', 'Ward 10', 'Kathmandu', 'Bagmati', '44600', 'NP', 1),
  ('33333333-3333-4333-8333-333333333305', '22222222-2222-4222-8222-222222222205', 'House 109, Sanepa Chowk', 'Ward 2', 'Lalitpur', 'Bagmati', '44700', 'NP', FALSE, 'Apt 4B, Kamaladi Complex', 'Ward 28', 'Kathmandu', 'Bagmati', '44600', 'NP', 1),
  ('33333333-3333-4333-8333-333333333306', '22222222-2222-4222-8222-222222222206', 'House 7, Baluwatar Galli', 'Ward 4', 'Kathmandu', 'Bagmati', '44600', 'NP', TRUE,  'House 7, Baluwatar Galli', 'Ward 4', 'Kathmandu', 'Bagmati', '44600', 'NP', 1),
  ('33333333-3333-4333-8333-333333333307', '22222222-2222-4222-8222-222222222207', 'House 19, Suryabinayak Chowk', 'Ward 8', 'Bhaktapur', 'Bagmati', '44800', 'NP', TRUE, 'House 19, Suryabinayak Chowk', 'Ward 8', 'Bhaktapur', 'Bagmati', '44800', 'NP', 1),
  ('33333333-3333-4333-8333-333333333308', '22222222-2222-4222-8222-222222222208', 'House 53, Patan Dhoka', 'Ward 16', 'Lalitpur', 'Bagmati', '44700', 'NP', TRUE,  'House 53, Patan Dhoka', 'Ward 16', 'Lalitpur', 'Bagmati', '44700', 'NP', 1),
  ('33333333-3333-4333-8333-333333333309', '22222222-2222-4222-8222-222222222209', 'House 88, Kalanki Mandir Road', 'Ward 14', 'Kathmandu', 'Bagmati', '44600', 'NP', TRUE, 'House 88, Kalanki Mandir Road', 'Ward 14', 'Kathmandu', 'Bagmati', '44600', 'NP', 1),
  ('33333333-3333-4333-8333-333333333310', '22222222-2222-4222-8222-222222222210', 'House 31, Boudha Tusal', 'Ward 6', 'Kathmandu', 'Bagmati', '44600', 'NP', TRUE,  'House 31, Boudha Tusal', 'Ward 6', 'Kathmandu', 'Bagmati', '44600', 'NP', 1)
ON CONFLICT (id) DO NOTHING;

-- 4. LEAVE TYPES
INSERT INTO leave_types (id, code, name, description, default_annual_quota, is_paid, is_active) VALUES
  ('44444444-4444-4444-8444-444444444401', 'ANNUAL',   'Annual Privilege Leave', 'Paid annual vacation and personal rest leave', 18, TRUE, TRUE),
  ('44444444-4444-4444-8444-444444444402', 'SICK',     'Medical & Sick Leave',   'Paid leave for illness, injury, or medical appointments', 12, TRUE, TRUE),
  ('44444444-4444-4444-8444-444444444403', 'CASUAL',   'Casual / Festival Leave','Short-duration paid leave for urgent personal matters or festivals', 6, TRUE, TRUE),
  ('44444444-4444-4444-8444-444444444404', 'PARENTAL', 'Parental Care Leave',    'Paid family care leave for childbirth or adoption', 15, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5. LEAVE BALANCES (Year 2026 for all 10 employees across active leave types)
INSERT INTO leave_balances (employee_id, leave_type_id, year, allocated_days, used_days, pending_days, version)
SELECT
  ep.id,
  lt.id,
  2026,
  lt.default_annual_quota,
  CASE
    WHEN ep.id = '22222222-2222-4222-8222-222222222205' AND lt.code = 'ANNUAL' THEN 3
    WHEN ep.id = '22222222-2222-4222-8222-222222222208' AND lt.code = 'SICK'   THEN 2
    ELSE 0
  END AS used_days,
  CASE
    WHEN ep.id = '22222222-2222-4222-8222-222222222205' AND lt.code = 'CASUAL' THEN 2
    WHEN ep.id = '22222222-2222-4222-8222-222222222206' AND lt.code = 'ANNUAL' THEN 4
    WHEN ep.id = '22222222-2222-4222-8222-222222222209' AND lt.code = 'ANNUAL' THEN 3
    ELSE 0
  END AS pending_days,
  1
FROM employee_profiles ep
CROSS JOIN leave_types lt
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

-- 6. SAMPLE LEAVE REQUESTS (Matching used_days and pending_days above)
INSERT INTO leave_requests (
  id, employee_id, leave_type_id, start_date, end_date, total_days,
  reason, status, decided_by, decided_at, decision_comment, version
) VALUES
  (
    '55555555-5555-4555-8555-555555555501',
    '22222222-2222-4222-8222-222222222205', -- Aayush Shrestha (reports to Suman Karki)
    '44444444-4444-4444-8444-444444444401', -- ANNUAL
    '2026-08-10', '2026-08-12', 3,
    'Family gathering in Pokhara for annual ancestral ceremony',
    'APPROVED',
    '22222222-2222-4222-8222-222222222203',
    '2026-08-03T10:15:00Z',
    'Approved. Handover completed with Ashmita.',
    2
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '22222222-2222-4222-8222-222222222205', -- Aayush Shrestha (reports to Suman Karki)
    '44444444-4444-4444-8444-444444444403', -- CASUAL
    '2026-11-16', '2026-11-17', 2,
    'Attending sister wedding ceremony in Chitwan',
    'PENDING',
    NULL, NULL, NULL,
    1
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '22222222-2222-4222-8222-222222222206', -- Ashmita Poudel (reports to Suman Karki)
    '44444444-4444-4444-8444-444444444401', -- ANNUAL
    '2026-11-23', '2026-11-26', 4,
    'Trekking trip to Poon Hill and family visit',
    'PENDING',
    NULL, NULL, NULL,
    1
  ),
  (
    '55555555-5555-4555-8555-555555555504',
    '22222222-2222-4222-8222-222222222208', -- Kriti Maharjan (reports to Pratima Gurung)
    '44444444-4444-4444-8444-444444444402', -- SICK
    '2026-09-14', '2026-09-15', 2,
    'Seasonal viral fever and medical checkup',
    'APPROVED',
    '22222222-2222-4222-8222-222222222204',
    '2026-09-14T08:30:00Z',
    'Wishing you a speedy recovery.',
    2
  ),
  (
    '55555555-5555-4555-8555-555555555505',
    '22222222-2222-4222-8222-222222222209', -- Niraj Bhandari (reports to Pratima Gurung)
    '44444444-4444-4444-8444-444444444401', -- ANNUAL
    '2026-12-01', '2026-12-03', 3,
    'Personal travel to Ilam with family',
    'PENDING',
    NULL, NULL, NULL,
    1
  ),
  (
    '55555555-5555-4555-8555-555555555506',
    '22222222-2222-4222-8222-222222222207', -- Dipesh Adhikari (reports to Suman Karki)
    '44444444-4444-4444-8444-444444444403', -- CASUAL
    '2026-07-20', '2026-07-21', 2,
    'Municipal documentation renewal',
    'REJECTED',
    '22222222-2222-4222-8222-222222222203',
    '2026-07-18T14:00:00Z',
    'Conflicts with scheduled security release window; rescheduled to August.',
    2
  )
ON CONFLICT (id) DO NOTHING;

-- 7. PAYSLIPS (3 months: Aug, Sep, Oct 2026 for all 10 employees = 30 records)
WITH periods AS (
  SELECT 2026 AS yr, 8  AS mo, DATE '2026-08-01' AS p_start, DATE '2026-08-31' AS p_end, DATE '2026-08-31' AS pay_dt, '08' AS suffix UNION ALL
  SELECT 2026 AS yr, 9  AS mo, DATE '2026-09-01' AS p_start, DATE '2026-09-30' AS p_end, DATE '2026-09-30' AS pay_dt, '09' AS suffix UNION ALL
  SELECT 2026 AS yr, 10 AS mo, DATE '2026-10-01' AS p_start, DATE '2026-10-31' AS p_end, DATE '2026-10-30' AS pay_dt, '10' AS suffix
),
comp_table AS (
  SELECT
    id AS employee_id,
    employee_code,
    bank_account_masked,
    CASE employee_code
      WHEN 'EMP-1001' THEN 110000.00
      WHEN 'EMP-1002' THEN 95000.00
      WHEN 'EMP-1003' THEN 125000.00
      WHEN 'EMP-1004' THEN 120000.00
      WHEN 'EMP-1005' THEN 90000.00
      WHEN 'EMP-1006' THEN 85000.00
      WHEN 'EMP-1007' THEN 82000.00
      WHEN 'EMP-1008' THEN 88000.00
      WHEN 'EMP-1009' THEN 74000.00
      ELSE 70000.00
    END AS basic_salary
  FROM employee_profiles
)
INSERT INTO payslips (
  id, employee_id, pay_period_year, pay_period_month,
  pay_period_start, pay_period_end, payment_date, currency,
  basic_salary, hra, transport_allowance, medical_allowance, special_allowance, gross_earnings,
  income_tax, provident_fund, social_security_tax, professional_tax, total_deductions, net_pay,
  bank_account_masked, status
)
SELECT
  (
    '66666666-6666-4666-8666-6666' ||
    p.suffix ||
    lpad(right(c.employee_code, 2), 6, '0')
  )::UUID AS id,
  c.employee_id,
  p.yr,
  p.mo,
  p.p_start,
  p.p_end,
  p.pay_dt,
  'NPR',
  c.basic_salary,
  round(c.basic_salary * 0.25, 2) AS hra,
  5000.00 AS transport_allowance,
  3500.00 AS medical_allowance,
  6500.00 AS special_allowance,
  (c.basic_salary + round(c.basic_salary * 0.25, 2) + 15000.00) AS gross_earnings,
  round(c.basic_salary * 0.12, 2) AS income_tax,
  round(c.basic_salary * 0.10, 2) AS provident_fund,
  round(c.basic_salary * 0.01, 2) AS social_security_tax,
  500.00 AS professional_tax,
  (round(c.basic_salary * 0.12, 2) + round(c.basic_salary * 0.10, 2) + round(c.basic_salary * 0.01, 2) + 500.00) AS total_deductions,
  (
    (c.basic_salary + round(c.basic_salary * 0.25, 2) + 15000.00) -
    (round(c.basic_salary * 0.12, 2) + round(c.basic_salary * 0.10, 2) + round(c.basic_salary * 0.01, 2) + 500.00)
  ) AS net_pay,
  c.bank_account_masked,
  'ISSUED'
FROM comp_table c
CROSS JOIN periods p
ON CONFLICT (employee_id, pay_period_year, pay_period_month) DO NOTHING;

COMMIT;
