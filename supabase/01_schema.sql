-- =============================================================================
-- Mini Project 01 – Employee Self-Service Portal
-- File: supabase/01_schema.sql
-- Purpose: Extensions, domain types, tables, constraints, indexes, triggers,
--          Row Level Security (deny-by-default), and atomic PL/pgSQL RPCs.
-- Timezone Policy: All timestamps are stored as TIMESTAMPTZ in UTC.
-- Safe to run once in the Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- Force UTC session timezone for consistent storage
SET TIME ZONE 'UTC';

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. CUSTOM ENUM TYPES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'LOCKED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
    CREATE TYPE employment_status AS ENUM ('ACTIVE', 'ON_LEAVE', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_request_status') THEN
    CREATE TYPE leave_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payslip_status') THEN
    CREATE TYPE payslip_status AS ENUM ('ISSUED', 'ARCHIVED');
  END IF;
END$$;

-- 3. AUTOMATIC updated_at TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

-- 4. CORE TABLES

-- 4.1 users: Authentication & role identity
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  status user_status NOT NULL DEFAULT 'ACTIVE',
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_email_lower CHECK (email = lower(email) AND position('@' IN email) > 1),
  CONSTRAINT chk_users_bcrypt_format CHECK (password_hash ~ '^\$2[aby]\$1[2-9]\$.{53}$'),
  CONSTRAINT chk_users_failed_count CHECK (failed_login_count >= 0)
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.2 employee_profiles: Authoritative HR employee profile (read-only for employees)
CREATE TABLE IF NOT EXISTS employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  employee_code VARCHAR(32) NOT NULL,
  legal_name VARCHAR(150) NOT NULL,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  manager_id UUID NULL,
  phone_masked VARCHAR(32) NOT NULL DEFAULT '***-***-0000',
  national_id_masked VARCHAR(32) NOT NULL DEFAULT 'NID-****-0000',
  tax_pan_masked VARCHAR(32) NOT NULL DEFAULT 'PAN-****-000',
  bank_account_masked VARCHAR(32) NOT NULL DEFAULT 'XXXX-XXXX-0000',
  employment_status employment_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_employee_profiles_user UNIQUE (user_id),
  CONSTRAINT uq_employee_profiles_code UNIQUE (employee_code),
  CONSTRAINT fk_employee_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employee_profiles_manager FOREIGN KEY (manager_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT chk_employee_no_self_manager CHECK (manager_id IS NULL OR manager_id <> id),
  CONSTRAINT chk_employee_code_format CHECK (employee_code ~ '^EMP-[0-9]{4}$')
);

CREATE TRIGGER trg_employee_profiles_updated_at
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.3 addresses: Employee residential & mailing address with optimistic locking (version)
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  residential_line1 VARCHAR(200) NOT NULL,
  residential_line2 VARCHAR(200) NULL,
  residential_city VARCHAR(100) NOT NULL,
  residential_state VARCHAR(100) NOT NULL,
  residential_postal_code VARCHAR(20) NOT NULL,
  residential_country VARCHAR(2) NOT NULL DEFAULT 'NP',
  mailing_same_as_residential BOOLEAN NOT NULL DEFAULT FALSE,
  mailing_line1 VARCHAR(200) NOT NULL,
  mailing_line2 VARCHAR(200) NULL,
  mailing_city VARCHAR(100) NOT NULL,
  mailing_state VARCHAR(100) NOT NULL,
  mailing_postal_code VARCHAR(20) NOT NULL,
  mailing_country VARCHAR(2) NOT NULL DEFAULT 'NP',
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_addresses_employee UNIQUE (employee_id),
  CONSTRAINT fk_addresses_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT chk_addresses_version CHECK (version >= 1),
  CONSTRAINT chk_addresses_status CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  CONSTRAINT chk_addresses_res_postal CHECK (residential_postal_code ~ '^[A-Za-z0-9 -]{3,12}$'),
  CONSTRAINT chk_addresses_mail_postal CHECK (mailing_postal_code ~ '^[A-Za-z0-9 -]{3,12}$'),
  CONSTRAINT chk_addresses_country CHECK (residential_country ~ '^[A-Z]{2}$' AND mailing_country ~ '^[A-Z]{2}$')
);

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.4 leave_types: Reference configuration managed by System Admin
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  default_annual_quota INTEGER NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_leave_types_code UNIQUE (code),
  CONSTRAINT chk_leave_types_quota CHECK (default_annual_quota BETWEEN 1 AND 365),
  CONSTRAINT chk_leave_types_code CHECK (code ~ '^[A-Z_]{2,32}$')
);

CREATE TRIGGER trg_leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.5 leave_balances: Per-employee annual leave balance with optimistic locking
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL,
  year INTEGER NOT NULL,
  allocated_days INTEGER NOT NULL,
  used_days INTEGER NOT NULL DEFAULT 0,
  pending_days INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_leave_balances_emp_type_year UNIQUE (employee_id, leave_type_id, year),
  CONSTRAINT fk_leave_balances_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_leave_balances_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
  CONSTRAINT chk_leave_balances_year CHECK (year BETWEEN 2020 AND 2100),
  CONSTRAINT chk_leave_balances_days CHECK (
    allocated_days >= 0 AND
    used_days >= 0 AND
    pending_days >= 0 AND
    used_days <= allocated_days
  ),
  CONSTRAINT chk_leave_balances_version CHECK (version >= 1)
);

CREATE TRIGGER trg_leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.6 leave_requests: Leave workflow with date checks, optimistic locking & btree_gist EXCLUDE overlap protection
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  leave_type_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status leave_request_status NOT NULL DEFAULT 'PENDING',
  decided_by UUID NULL,
  decided_at TIMESTAMPTZ NULL,
  decision_comment VARCHAR(500) NULL,
  idempotency_key VARCHAR(100) NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_leave_requests_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_leave_requests_decider FOREIGN KEY (decided_by) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT chk_leave_requests_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_leave_requests_total_days CHECK (total_days = (end_date - start_date + 1) AND total_days > 0),
  CONSTRAINT chk_leave_requests_reason_len CHECK (char_length(trim(reason)) >= 5),
  CONSTRAINT chk_leave_requests_version CHECK (version >= 1),
  CONSTRAINT uq_leave_requests_idempotency UNIQUE (employee_id, idempotency_key),
  -- Prevent overlapping active (PENDING or APPROVED) leave requests per employee at the database layer
  CONSTRAINT excl_leave_requests_no_overlap EXCLUDE USING gist (
    employee_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status IN ('PENDING', 'APPROVED'))
);

CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.7 payslips: Confidential payroll records rendered on-demand to PDF
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  pay_period_year INTEGER NOT NULL,
  pay_period_month INTEGER NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NPR',
  basic_salary NUMERIC(12, 2) NOT NULL,
  hra NUMERIC(12, 2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  medical_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  special_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gross_earnings NUMERIC(12, 2) NOT NULL,
  income_tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  provident_fund NUMERIC(12, 2) NOT NULL DEFAULT 0,
  social_security_tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  professional_tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12, 2) NOT NULL,
  net_pay NUMERIC(12, 2) NOT NULL,
  bank_account_masked VARCHAR(32) NOT NULL,
  status payslip_status NOT NULL DEFAULT 'ISSUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_payslips_emp_period UNIQUE (employee_id, pay_period_year, pay_period_month),
  CONSTRAINT fk_payslips_employee FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT chk_payslips_month CHECK (pay_period_month BETWEEN 1 AND 12),
  CONSTRAINT chk_payslips_year CHECK (pay_period_year BETWEEN 2020 AND 2100),
  CONSTRAINT chk_payslips_dates CHECK (pay_period_end >= pay_period_start),
  CONSTRAINT chk_payslips_amounts CHECK (
    basic_salary >= 0 AND
    gross_earnings = (basic_salary + hra + transport_allowance + medical_allowance + special_allowance) AND
    total_deductions = (income_tax + provident_fund + social_security_tax + professional_tax) AND
    net_pay = (gross_earnings - total_deductions) AND
    net_pay >= 0
  )
);

CREATE TRIGGER trg_payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.8 sessions: Server-side opaque sessions (stores SHA-256 hash only)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token CHAR(64) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  user_agent VARCHAR(500) NOT NULL DEFAULT 'unknown',
  expires_at TIMESTAMPTZ NOT NULL,
  idle_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_sessions_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.9 login_attempts: Rate-limiting & lockout tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER trg_login_attempts_updated_at
  BEFORE UPDATE ON login_attempts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4.10 audit_events: Immutable security & workflow audit log
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL,
  actor_role VARCHAR(32) NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id UUID NULL,
  correlation_id VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT fk_audit_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_audit_events_updated_at
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 5. INDEXES FOR PERFORMANCE & AUDIT QUERIES
CREATE INDEX IF NOT EXISTS idx_employee_profiles_manager ON employee_profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON leave_requests(employee_id, status, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status_created ON leave_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_period ON payslips(employee_id, pay_period_year DESC, pay_period_month DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_user_id, created_at DESC);

-- 6. ROW LEVEL SECURITY (DEFENSE IN DEPTH: DENY BY DEFAULT FOR ANON/AUTHENTICATED)
-- The Node API connects exclusively via SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- Zero policies are created for anon or authenticated roles, ensuring total lock-down
-- even if the project URL and anon key are ever exposed.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- =============================================================================
-- 7. ATOMIC PL/pgSQL TRANSACTIONAL FUNCTIONS (CALLED VIA supabase.rpc())
-- =============================================================================

-- 7.1 rpc_update_employee_address
-- Atomically verifies optimistic lock version, updates address, and writes
-- a before/after audit event containing only non-sensitive address fields.
CREATE OR REPLACE FUNCTION rpc_update_employee_address(
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_employee_id UUID,
  p_expected_version INTEGER,
  p_residential_line1 TEXT,
  p_residential_line2 TEXT,
  p_residential_city TEXT,
  p_residential_state TEXT,
  p_residential_postal_code TEXT,
  p_residential_country TEXT,
  p_mailing_same_as_residential BOOLEAN,
  p_mailing_line1 TEXT,
  p_mailing_line2 TEXT,
  p_mailing_city TEXT,
  p_mailing_state TEXT,
  p_mailing_postal_code TEXT,
  p_mailing_country TEXT,
  p_correlation_id TEXT,
  p_ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current addresses%ROWTYPE;
  v_updated addresses%ROWTYPE;
  v_before JSONB;
  v_after JSONB;
BEGIN
  SELECT * INTO v_current
  FROM addresses
  WHERE employee_id = p_employee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_current.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: Expected version %, found %', p_expected_version, v_current.version
      USING ERRCODE = '40001';
  END IF;

  v_before := jsonb_build_object(
    'residential_line1', v_current.residential_line1,
    'residential_line2', v_current.residential_line2,
    'residential_city', v_current.residential_city,
    'residential_state', v_current.residential_state,
    'residential_postal_code', v_current.residential_postal_code,
    'residential_country', v_current.residential_country,
    'mailing_same_as_residential', v_current.mailing_same_as_residential,
    'mailing_line1', v_current.mailing_line1,
    'mailing_line2', v_current.mailing_line2,
    'mailing_city', v_current.mailing_city,
    'mailing_state', v_current.mailing_state,
    'mailing_postal_code', v_current.mailing_postal_code,
    'mailing_country', v_current.mailing_country,
    'version', v_current.version
  );

  UPDATE addresses
  SET
    residential_line1 = p_residential_line1,
    residential_line2 = p_residential_line2,
    residential_city = p_residential_city,
    residential_state = p_residential_state,
    residential_postal_code = p_residential_postal_code,
    residential_country = p_residential_country,
    mailing_same_as_residential = p_mailing_same_as_residential,
    mailing_line1 = CASE WHEN p_mailing_same_as_residential THEN p_residential_line1 ELSE p_mailing_line1 END,
    mailing_line2 = CASE WHEN p_mailing_same_as_residential THEN p_residential_line2 ELSE p_mailing_line2 END,
    mailing_city = CASE WHEN p_mailing_same_as_residential THEN p_residential_city ELSE p_mailing_city END,
    mailing_state = CASE WHEN p_mailing_same_as_residential THEN p_residential_state ELSE p_mailing_state END,
    mailing_postal_code = CASE WHEN p_mailing_same_as_residential THEN p_residential_postal_code ELSE p_mailing_postal_code END,
    mailing_country = CASE WHEN p_mailing_same_as_residential THEN p_residential_country ELSE p_mailing_country END,
    version = v_current.version + 1
  WHERE id = v_current.id
  RETURNING * INTO v_updated;

  v_after := jsonb_build_object(
    'residential_line1', v_updated.residential_line1,
    'residential_line2', v_updated.residential_line2,
    'residential_city', v_updated.residential_city,
    'residential_state', v_updated.residential_state,
    'residential_postal_code', v_updated.residential_postal_code,
    'residential_country', v_updated.residential_country,
    'mailing_same_as_residential', v_updated.mailing_same_as_residential,
    'mailing_line1', v_updated.mailing_line1,
    'mailing_line2', v_updated.mailing_line2,
    'mailing_city', v_updated.mailing_city,
    'mailing_state', v_updated.mailing_state,
    'mailing_postal_code', v_updated.mailing_postal_code,
    'mailing_country', v_updated.mailing_country,
    'version', v_updated.version
  );

  INSERT INTO audit_events (
    actor_user_id, actor_role, action, target_type, target_id, correlation_id, ip_address, metadata
  ) VALUES (
    p_actor_user_id, p_actor_role, 'ADDRESS_UPDATED', 'address', v_updated.id, p_correlation_id, p_ip_address,
    jsonb_build_object('employee_id', p_employee_id, 'before', v_before, 'after', v_after)
  );

  RETURN to_jsonb(v_updated);
END;
$$;

-- 7.2 rpc_create_leave_request
-- Atomically locks balance row, checks available balance and date overlap,
-- increments pending_days, inserts the leave request, and logs an audit event.
CREATE OR REPLACE FUNCTION rpc_create_leave_request(
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_employee_id UUID,
  p_leave_type_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_reason TEXT,
  p_idempotency_key TEXT,
  p_correlation_id TEXT,
  p_ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_days INTEGER;
  v_year INTEGER;
  v_balance leave_balances%ROWTYPE;
  v_overlap_count INTEGER;
  v_existing leave_requests%ROWTYPE;
  v_created leave_requests%ROWTYPE;
BEGIN
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'INVALID_DATES: End date must be on or after start date' USING ERRCODE = '22007';
  END IF;

  v_total_days := (p_end_date - p_start_date) + 1;
  v_year := EXTRACT(YEAR FROM p_start_date)::INTEGER;

  -- Check idempotency key first
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM leave_requests
    WHERE employee_id = p_employee_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RAISE EXCEPTION 'DUPLICATE_SUBMISSION: Leave request already submitted' USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Lock leave balance row for update
  SELECT * INTO v_balance
  FROM leave_balances
  WHERE employee_id = p_employee_id
    AND leave_type_id = p_leave_type_id
    AND year = v_year
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BALANCE_NOT_FOUND: No leave balance configured for year %', v_year USING ERRCODE = 'P0002';
  END IF;

  -- Verify sufficient available balance (allocated - used - pending)
  IF (v_balance.allocated_days - v_balance.used_days - v_balance.pending_days) < v_total_days THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Requested % days, but only % available',
      v_total_days, (v_balance.allocated_days - v_balance.used_days - v_balance.pending_days)
      USING ERRCODE = 'P0001';
  END IF;

  -- Explicit overlap check before insert (backed by EXCLUDE constraint)
  SELECT COUNT(*) INTO v_overlap_count
  FROM leave_requests
  WHERE employee_id = p_employee_id
    AND status IN ('PENDING', 'APPROVED')
    AND daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]');

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'LEAVE_OVERLAP: Requested dates overlap with an existing pending or approved leave request'
      USING ERRCODE = '23P01';
  END IF;

  UPDATE leave_balances
  SET
    pending_days = pending_days + v_total_days,
    version = version + 1
  WHERE id = v_balance.id;

  INSERT INTO leave_requests (
    employee_id, leave_type_id, start_date, end_date, total_days, reason, status, idempotency_key
  ) VALUES (
    p_employee_id, p_leave_type_id, p_start_date, p_end_date, v_total_days, p_reason, 'PENDING', p_idempotency_key
  ) RETURNING * INTO v_created;

  INSERT INTO audit_events (
    actor_user_id, actor_role, action, target_type, target_id, correlation_id, ip_address, metadata
  ) VALUES (
    p_actor_user_id, p_actor_role, 'LEAVE_REQUEST_CREATED', 'leave_request', v_created.id, p_correlation_id, p_ip_address,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'leave_type_id', p_leave_type_id,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'total_days', v_total_days,
      'status', 'PENDING'
    )
  );

  RETURN to_jsonb(v_created);
END;
$$;

-- 7.3 rpc_decide_leave_request
-- Atomically verifies manager-direct-report relationship, pending status,
-- and optimistic lock version; updates leave status; adjusts used_days/pending_days;
-- and writes an audit event.
CREATE OR REPLACE FUNCTION rpc_decide_leave_request(
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_manager_employee_id UUID,
  p_leave_request_id UUID,
  p_decision TEXT,
  p_decision_comment TEXT,
  p_expected_version INTEGER,
  p_correlation_id TEXT,
  p_ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req leave_requests%ROWTYPE;
  v_emp employee_profiles%ROWTYPE;
  v_balance leave_balances%ROWTYPE;
  v_year INTEGER;
  v_updated leave_requests%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'INVALID_DECISION: Decision must be APPROVED or REJECTED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_req
  FROM leave_requests
  WHERE id = p_leave_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_emp
  FROM employee_profiles
  WHERE id = v_req.employee_id;

  -- Enforce direct report relationship in database transaction as well
  IF v_emp.manager_id IS DISTINCT FROM p_manager_employee_id THEN
    RAISE EXCEPTION 'NOT_DIRECT_REPORT: Manager can only decide leave requests for direct reports'
      USING ERRCODE = '42501';
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'INVALID_WORKFLOW_STATE: Only PENDING requests can be decided (current: %)', v_req.status
      USING ERRCODE = '40001';
  END IF;

  IF p_expected_version IS NOT NULL AND v_req.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: Expected version %, found %', p_expected_version, v_req.version
      USING ERRCODE = '40001';
  END IF;

  v_year := EXTRACT(YEAR FROM v_req.start_date)::INTEGER;

  SELECT * INTO v_balance
  FROM leave_balances
  WHERE employee_id = v_req.employee_id
    AND leave_type_id = v_req.leave_type_id
    AND year = v_year
  FOR UPDATE;

  IF p_decision = 'APPROVED' THEN
    IF (v_balance.allocated_days - v_balance.used_days) < v_req.total_days THEN
      RAISE EXCEPTION 'INSUFFICIENT_BALANCE_ON_APPROVAL' USING ERRCODE = 'P0001';
    END IF;

    UPDATE leave_balances
    SET
      pending_days = GREATEST(0, pending_days - v_req.total_days),
      used_days = used_days + v_req.total_days,
      version = version + 1
    WHERE id = v_balance.id;
  ELSE
    -- REJECTED: release pending_days without reducing available balance
    UPDATE leave_balances
    SET
      pending_days = GREATEST(0, pending_days - v_req.total_days),
      version = version + 1
    WHERE id = v_balance.id;
  END IF;

  UPDATE leave_requests
  SET
    status = p_decision::leave_request_status,
    decided_by = p_manager_employee_id,
    decided_at = clock_timestamp(),
    decision_comment = p_decision_comment,
    version = v_req.version + 1
  WHERE id = v_req.id
  RETURNING * INTO v_updated;

  INSERT INTO audit_events (
    actor_user_id, actor_role, action, target_type, target_id, correlation_id, ip_address, metadata
  ) VALUES (
    p_actor_user_id, p_actor_role, 'LEAVE_REQUEST_' || p_decision, 'leave_request', v_updated.id, p_correlation_id, p_ip_address,
    jsonb_build_object(
      'employee_id', v_req.employee_id,
      'decided_by', p_manager_employee_id,
      'decision', p_decision,
      'total_days', v_req.total_days,
      'previous_version', v_req.version,
      'new_version', v_updated.version
    )
  );

  RETURN to_jsonb(v_updated);
END;
$$;

-- 7.4 rpc_cancel_leave_request
-- Allows an employee to cancel their own PENDING leave request atomically.
CREATE OR REPLACE FUNCTION rpc_cancel_leave_request(
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_employee_id UUID,
  p_leave_request_id UUID,
  p_expected_version INTEGER,
  p_correlation_id TEXT,
  p_ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req leave_requests%ROWTYPE;
  v_year INTEGER;
  v_updated leave_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM leave_requests
  WHERE id = p_leave_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_req.employee_id <> p_employee_id THEN
    RAISE EXCEPTION 'FORBIDDEN_NOT_OWNER' USING ERRCODE = '42501';
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'INVALID_WORKFLOW_STATE: Only PENDING requests can be cancelled (current: %)', v_req.status
      USING ERRCODE = '40001';
  END IF;

  IF p_expected_version IS NOT NULL AND v_req.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: Expected version %, found %', p_expected_version, v_req.version
      USING ERRCODE = '40001';
  END IF;

  v_year := EXTRACT(YEAR FROM v_req.start_date)::INTEGER;

  UPDATE leave_balances
  SET
    pending_days = GREATEST(0, pending_days - v_req.total_days),
    version = version + 1
  WHERE employee_id = v_req.employee_id
    AND leave_type_id = v_req.leave_type_id
    AND year = v_year;

  UPDATE leave_requests
  SET
    status = 'CANCELLED',
    version = v_req.version + 1
  WHERE id = v_req.id
  RETURNING * INTO v_updated;

  INSERT INTO audit_events (
    actor_user_id, actor_role, action, target_type, target_id, correlation_id, ip_address, metadata
  ) VALUES (
    p_actor_user_id, p_actor_role, 'LEAVE_REQUEST_CANCELLED', 'leave_request', v_updated.id, p_correlation_id, p_ip_address,
    jsonb_build_object(
      'employee_id', v_req.employee_id,
      'total_days', v_req.total_days,
      'previous_version', v_req.version,
      'new_version', v_updated.version
    )
  );

  RETURN to_jsonb(v_updated);
END;
$$;

COMMIT;
