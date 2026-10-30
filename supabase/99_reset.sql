-- =============================================================================
-- Mini Project 01 – Employee Self-Service Portal
-- File: supabase/99_reset.sql
-- Purpose: Drops all functions, tables, and custom types for clean dev reset.
-- WARNING: For development / testing use only!
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS rpc_cancel_leave_request(UUID, TEXT, UUID, UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS rpc_decide_leave_request(UUID, TEXT, UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS rpc_create_leave_request(UUID, TEXT, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS rpc_update_employee_address(UUID, TEXT, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE;

DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_types CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS employee_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS payslip_status CASCADE;
DROP TYPE IF EXISTS leave_request_status CASCADE;
DROP TYPE IF EXISTS employment_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

COMMIT;
