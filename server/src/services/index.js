import { AppError } from '../utils/errors.js';
import {
  DUMMY_BCRYPT_HASH,
  generateSessionCredentials,
  hashPassword,
  verifyPassword
} from '../utils/crypto.js';
import { buildSafePayslipFilename, generatePayslipPdfBuffer } from '../utils/pdf.js';

/**
 * Maps role to default landing route on the client
 */
export function getLandingRouteForRole(role) {
  switch (role) {
    case 'SYSTEM_ADMIN':
      return '/admin/users';
    case 'HR_ADMIN':
      return '/hr/employees';
    case 'MANAGER':
      return '/manager/approvals';
    case 'EMPLOYEE':
    default:
      return '/dashboard';
  }
}

/**
 * Builds pagination metadata object required on all collection responses
 */
export function buildPaginationMeta({ page, pageSize, total }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    totalItems: total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

/**
 * Creates all domain services (`authService`, `employeeService`, `leaveService`,
 * `payslipService`, `hrService`, `adminService`).
 */
export function createServices({ repo, config }) {
  // ---------------------------------------------------------------------------
  // 1. AUTHENTICATION SERVICE
  // ---------------------------------------------------------------------------
  const authService = {
    async login({ email, password, ipAddress, userAgent, correlationId }) {
      const user = await repo.findUserByEmail(email);

      // Equal-time password verification: even if user does not exist or is locked,
      // always run bcrypt verification against either the user's hash or DUMMY_BCRYPT_HASH.
      const targetHash = user ? user.password_hash : DUMMY_BCRYPT_HASH;
      const passwordMatches = await verifyPassword(password, targetHash);

      const now = Date.now();

      if (!user) {
        await repo.recordLoginAttempt({ email, ip_address: ipAddress, succeeded: false });
        await repo.recordAuditEvent({
          actor_user_id: null,
          actor_role: null,
          action: 'LOGIN_FAILURE',
          target_type: 'user',
          target_id: null,
          correlation_id: correlationId,
          ip_address: ipAddress,
          metadata: { reason: 'INVALID_CREDENTIALS' }
        });
        throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      // Check account status and temporary lockout window
      const isLockedWindow = user.locked_until && Date.parse(user.locked_until) > now;
      if (user.status === 'ARCHIVED' || user.status === 'LOCKED' || isLockedWindow) {
        await repo.recordLoginAttempt({ email, ip_address: ipAddress, succeeded: false });
        await repo.recordAuditEvent({
          actor_user_id: user.id,
          actor_role: user.role,
          action: 'LOGIN_FAILURE',
          target_type: 'user',
          target_id: user.id,
          correlation_id: correlationId,
          ip_address: ipAddress,
          metadata: { reason: 'ACCOUNT_LOCKED_OR_INACTIVE' }
        });
        // Generic message so attackers cannot distinguish locked/unknown accounts
        throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      if (!passwordMatches) {
        const newFailedCount = (user.failed_login_count || 0) + 1;
        const shouldLock = newFailedCount >= config.security.loginLockoutThreshold;
        const lockedUntilIso = shouldLock
          ? new Date(now + config.security.loginLockoutMs).toISOString()
          : null;

        await repo.updateUserLoginState(user.id, {
          failed_login_count: newFailedCount,
          locked_until: lockedUntilIso
        });
        await repo.recordLoginAttempt({ email, ip_address: ipAddress, succeeded: false });
        await repo.recordAuditEvent({
          actor_user_id: user.id,
          actor_role: user.role,
          action: shouldLock ? 'ACCOUNT_LOCKED_BACKOFF' : 'LOGIN_FAILURE',
          target_type: 'user',
          target_id: user.id,
          correlation_id: correlationId,
          ip_address: ipAddress,
          metadata: { failed_login_count: newFailedCount, locked: shouldLock }
        });
        throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      // Successful login: reset failed count & generate a fresh session ID (prevents session fixation)
      await repo.updateUserLoginState(user.id, {
        failed_login_count: 0,
        locked_until: null,
        last_login_at: new Date(now).toISOString()
      });
      await repo.recordLoginAttempt({ email, ip_address: ipAddress, succeeded: true });

      const { rawToken, tokenHash, csrfToken } = generateSessionCredentials();
      const expiresAtIso = new Date(now + config.session.ttlMs).toISOString();
      const idleExpiresAtIso = new Date(now + config.session.idleTimeoutMs).toISOString();

      const session = await repo.createSession({
        user_id: user.id,
        token_hash: tokenHash,
        csrf_token: csrfToken,
        ip_address: ipAddress,
        user_agent: String(userAgent || 'unknown').slice(0, 500),
        expires_at: expiresAtIso,
        idle_expires_at: idleExpiresAtIso
      });

      const employee = await repo.findEmployeeByUserId(user.id);

      await repo.recordAuditEvent({
        actor_user_id: user.id,
        actor_role: user.role,
        action: 'LOGIN_SUCCESS',
        target_type: 'session',
        target_id: session.id,
        correlation_id: correlationId,
        ip_address: ipAddress,
        metadata: { role: user.role }
      });

      return {
        rawToken,
        csrfToken,
        expiresAt: expiresAtIso,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          landingRoute: getLandingRouteForRole(user.role),
          employee: employee
            ? {
                id: employee.id,
                employee_code: employee.employee_code,
                legal_name: employee.legal_name,
                department: employee.department,
                designation: employee.designation
              }
            : null
        }
      };
    },

    async logout({ session, user, ipAddress, correlationId }) {
      if (session?.id) {
        await repo.revokeSession(session.id);
      }
      await repo.recordAuditEvent({
        actor_user_id: user?.id || null,
        actor_role: user?.role || null,
        action: 'LOGOUT',
        target_type: 'session',
        target_id: session?.id || null,
        correlation_id: correlationId,
        ip_address: ipAddress,
        metadata: {}
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 2. EMPLOYEE PROFILE & ADDRESS SERVICE
  // ---------------------------------------------------------------------------
  const employeeService = {
    async getOwnProfile({ user, employee }) {
      if (!employee) {
        throw AppError.notFound('Employee profile not found');
      }
      const address = await repo.findAddressByEmployeeId(employee.id);
      let managerSummary = null;
      if (employee.manager_id) {
        const mgr = await repo.findEmployeeById(employee.manager_id);
        if (mgr) {
          managerSummary = {
            id: mgr.id,
            employee_code: mgr.employee_code,
            legal_name: mgr.legal_name,
            designation: mgr.designation,
            department: mgr.department
          };
        }
      }

      // Return DTO with explicit readOnlyLocks metadata so UI clearly marks locked fields
      return {
        profile: {
          id: employee.id,
          employee_code: employee.employee_code,
          legal_name: employee.legal_name,
          email: user.email,
          role: user.role,
          department: employee.department,
          designation: employee.designation,
          joining_date: employee.joining_date,
          employment_status: employee.employment_status,
          phone_masked: employee.phone_masked,
          national_id_masked: employee.national_id_masked,
          tax_pan_masked: employee.tax_pan_masked,
          bank_account_masked: employee.bank_account_masked,
          manager: managerSummary,
          readOnlyFields: [
            'employee_code',
            'legal_name',
            'department',
            'designation',
            'joining_date',
            'manager'
          ]
        },
        address: address
          ? {
              id: address.id,
              residential_line1: address.residential_line1,
              residential_line2: address.residential_line2,
              residential_city: address.residential_city,
              residential_state: address.residential_state,
              residential_postal_code: address.residential_postal_code,
              residential_country: address.residential_country,
              mailing_same_as_residential: address.mailing_same_as_residential,
              mailing_line1: address.mailing_line1,
              mailing_line2: address.mailing_line2,
              mailing_city: address.mailing_city,
              mailing_state: address.mailing_state,
              mailing_postal_code: address.mailing_postal_code,
              mailing_country: address.mailing_country,
              version: address.version,
              updated_at: address.updated_at
            }
          : null
      };
    },

    async updateOwnAddress({ user, employee, validatedAddress, correlationId, ipAddress }) {
      const { data, error } = await repo.updateAddressAtomic({
        p_actor_user_id: user.id,
        p_actor_role: user.role,
        p_employee_id: employee.id,
        p_expected_version: validatedAddress.version,
        p_residential_line1: validatedAddress.residential_line1,
        p_residential_line2: validatedAddress.residential_line2,
        p_residential_city: validatedAddress.residential_city,
        p_residential_state: validatedAddress.residential_state,
        p_residential_postal_code: validatedAddress.residential_postal_code,
        p_residential_country: validatedAddress.residential_country,
        p_mailing_same_as_residential: validatedAddress.mailing_same_as_residential,
        p_mailing_line1: validatedAddress.mailing_line1,
        p_mailing_line2: validatedAddress.mailing_line2,
        p_mailing_city: validatedAddress.mailing_city,
        p_mailing_state: validatedAddress.mailing_state,
        p_mailing_postal_code: validatedAddress.mailing_postal_code,
        p_mailing_country: validatedAddress.mailing_country,
        p_correlation_id: correlationId,
        p_ip_address: ipAddress
      });

      if (error) {
        if (error.code === '40001' || String(error.message).includes('VERSION_CONFLICT')) {
          throw AppError.conflict(
            'Address was modified in another session. Please refresh and try again.',
            'VERSION_CONFLICT'
          );
        }
        if (error.code === 'P0002') {
          throw AppError.notFound('Address record not found');
        }
        throw AppError.internal('Failed to update address');
      }

      return {
        id: data.id,
        residential_line1: data.residential_line1,
        residential_line2: data.residential_line2,
        residential_city: data.residential_city,
        residential_state: data.residential_state,
        residential_postal_code: data.residential_postal_code,
        residential_country: data.residential_country,
        mailing_same_as_residential: data.mailing_same_as_residential,
        mailing_line1: data.mailing_line1,
        mailing_line2: data.mailing_line2,
        mailing_city: data.mailing_city,
        mailing_state: data.mailing_state,
        mailing_postal_code: data.mailing_postal_code,
        mailing_country: data.mailing_country,
        version: data.version,
        updated_at: data.updated_at
      };
    }
  };

  // ---------------------------------------------------------------------------
  // 3. LEAVE SERVICE
  // ---------------------------------------------------------------------------
  const leaveService = {
    async getBalances({ employee, year }) {
      const targetYear = Number.isInteger(year) ? year : new Date().getFullYear();
      const items = await repo.getLeaveBalances(employee.id, targetYear);
      const types = await repo.listLeaveTypes(true);
      return { year: targetYear, balances: items, leaveTypes: types };
    },

    async createRequest({ user, employee, input, correlationId, ipAddress }) {
      const leaveYear = input.start_date ? new Date(input.start_date).getFullYear() : new Date().getFullYear();
      if (Number.isInteger(leaveYear)) {
        await repo.getLeaveBalances(employee.id, leaveYear);
      }
      const { data, error } = await repo.createLeaveRequestAtomic({
        p_actor_user_id: user.id,
        p_actor_role: user.role,
        p_employee_id: employee.id,
        p_leave_type_id: input.leave_type_id,
        p_start_date: input.start_date,
        p_end_date: input.end_date,
        p_reason: input.reason,
        p_idempotency_key: input.idempotency_key,
        p_correlation_id: correlationId,
        p_ip_address: ipAddress
      });

      if (error) {
        const msg = String(error.message || '');
        if (error.code === '23505' || msg.includes('DUPLICATE_SUBMISSION')) {
          throw AppError.conflict('Duplicate leave submission detected.', 'DUPLICATE_SUBMISSION');
        }
        if (error.code === '23P01' || msg.includes('LEAVE_OVERLAP')) {
          throw AppError.conflict(
            'Requested dates overlap with an existing pending or approved leave request.',
            'LEAVE_OVERLAP',
            { start_date: 'Overlaps with an existing active leave request', end_date: 'Overlaps with an existing active leave request' }
          );
        }
        if (error.code === 'P0001' || msg.includes('INSUFFICIENT_BALANCE')) {
          throw AppError.unprocessable(
            'Insufficient available leave balance for the selected leave type.',
            { leave_type_id: 'Insufficient available balance for requested days' },
            'INSUFFICIENT_BALANCE'
          );
        }
        if (error.code === 'P0002' || msg.includes('BALANCE_NOT_FOUND')) {
          throw AppError.badRequest(
            'Leave type or balance not found for the selected year.',
            { leave_type_id: 'No leave balance configured for this leave type' }
          );
        }
        throw AppError.internal('Could not create leave request');
      }

      return data;
    },

    async listOwnRequests({ employee, queryParams }) {
      const { items, total } = await repo.listEmployeeLeaves(employee.id, queryParams);
      return {
        items,
        pagination: buildPaginationMeta({
          page: queryParams.page,
          pageSize: queryParams.pageSize,
          total
        })
      };
    },

    async listTeamRequests({ managerEmployee, queryParams }) {
      const { items, total } = await repo.listTeamLeaves(managerEmployee.id, queryParams);
      return {
        items,
        pagination: buildPaginationMeta({
          page: queryParams.page,
          pageSize: queryParams.pageSize,
          total
        })
      };
    },

    async decideRequest({ user, managerEmployee, leaveId, decisionInput, correlationId, ipAddress }) {
      const { data, error } = await repo.decideLeaveRequestAtomic({
        p_actor_user_id: user.id,
        p_actor_role: user.role,
        p_manager_employee_id: managerEmployee.id,
        p_leave_request_id: leaveId,
        p_decision: decisionInput.decision,
        p_decision_comment: decisionInput.comment,
        p_expected_version: decisionInput.version,
        p_correlation_id: correlationId,
        p_ip_address: ipAddress
      });

      if (error) {
        const msg = String(error.message || '');
        if (error.code === 'P0002' || msg.includes('LEAVE_NOT_FOUND')) {
          throw AppError.notFound('Leave request not found');
        }
        if (error.code === '42501' || msg.includes('NOT_DIRECT_REPORT')) {
          await repo.recordAuditEvent({
            actor_user_id: user.id,
            actor_role: user.role,
            action: 'ACCESS_DENIED_NOT_DIRECT_REPORT',
            target_type: 'leave_request',
            target_id: leaveId,
            correlation_id: correlationId,
            ip_address: ipAddress,
            metadata: { manager_employee_id: managerEmployee.id }
          });
          throw AppError.forbidden(
            'You can only approve or reject leave requests belonging to your direct reports.',
            'ACCESS_DENIED_LOGGED'
          );
        }
        if (msg.includes('VERSION_CONFLICT')) {
          throw AppError.conflict(
            'This leave request was already modified by another action. Please refresh.',
            'VERSION_CONFLICT'
          );
        }
        if (msg.includes('INVALID_WORKFLOW_STATE')) {
          throw AppError.conflict(
            'Only pending leave requests can be approved or rejected.',
            'INVALID_WORKFLOW_STATE'
          );
        }
        if (msg.includes('INSUFFICIENT_BALANCE_ON_APPROVAL')) {
          throw AppError.unprocessable('Employee does not have sufficient balance to approve this request.');
        }
        throw AppError.internal('Could not process leave decision');
      }

      return data;
    },

    async cancelRequest({ user, employee, leaveId, expectedVersion, correlationId, ipAddress }) {
      const { data, error } = await repo.cancelLeaveRequestAtomic({
        p_actor_user_id: user.id,
        p_actor_role: user.role,
        p_employee_id: employee.id,
        p_leave_request_id: leaveId,
        p_expected_version: expectedVersion ?? null,
        p_correlation_id: correlationId,
        p_ip_address: ipAddress
      });

      if (error) {
        const msg = String(error.message || '');
        if (error.code === 'P0002' || msg.includes('LEAVE_NOT_FOUND')) {
          throw AppError.notFound('Leave request not found');
        }
        if (error.code === '42501' || msg.includes('FORBIDDEN_NOT_OWNER')) {
          await repo.recordAuditEvent({
            actor_user_id: user.id,
            actor_role: user.role,
            action: 'ACCESS_DENIED_BOLA_LEAVE_CANCEL',
            target_type: 'leave_request',
            target_id: leaveId,
            correlation_id: correlationId,
            ip_address: ipAddress,
            metadata: { employee_id: employee.id }
          });
          throw AppError.forbidden('You can only cancel your own leave requests.', 'ACCESS_DENIED_LOGGED');
        }
        if (msg.includes('VERSION_CONFLICT')) {
          throw AppError.conflict('Leave request version conflict.', 'VERSION_CONFLICT');
        }
        if (msg.includes('INVALID_WORKFLOW_STATE')) {
          throw AppError.conflict('Only pending leave requests can be cancelled.', 'INVALID_WORKFLOW_STATE');
        }
        throw AppError.internal('Could not cancel leave request');
      }

      return data;
    }
  };

  // ---------------------------------------------------------------------------
  // 4. PAYSLIP SERVICE
  // ---------------------------------------------------------------------------
  const payslipService = {
    async listOwnPayslips({ user, employee, queryParams, correlationId, ipAddress }) {
      const { items, total } = await repo.listEmployeePayslips(employee.id, queryParams);

      await repo.recordAuditEvent({
        actor_user_id: user.id,
        actor_role: user.role,
        action: 'PAYSLIP_LIST_VIEWED',
        target_type: 'payslip_collection',
        target_id: employee.id,
        correlation_id: correlationId,
        ip_address: ipAddress,
        metadata: { count: items.length, page: queryParams.page }
      });

      // Return summary DTOs without raw internal metadata
      const summaries = items.map((p) => ({
        id: p.id,
        pay_period_year: p.pay_period_year,
        pay_period_month: p.pay_period_month,
        pay_period_start: p.pay_period_start,
        pay_period_end: p.pay_period_end,
        payment_date: p.payment_date,
        currency: p.currency,
        gross_earnings: Number(p.gross_earnings),
        total_deductions: Number(p.total_deductions),
        net_pay: Number(p.net_pay),
        bank_account_masked: p.bank_account_masked,
        status: p.status
      }));

      return {
        items: summaries,
        pagination: buildPaginationMeta({
          page: queryParams.page,
          pageSize: queryParams.pageSize,
          total
        })
      };
    },

    async downloadOwnPayslipPdf({ user, employee, payslipId, correlationId, ipAddress }) {
      const payslip = await repo.findPayslipById(payslipId);
      if (!payslip) {
        throw AppError.notFound('Payslip not found');
      }

      // Strict BOLA ownership check: only the owning employee can download their payslip
      if (payslip.employee_id !== employee.id) {
        await repo.recordAuditEvent({
          actor_user_id: user.id,
          actor_role: user.role,
          action: 'ACCESS_DENIED_BOLA_PAYSLIP',
          target_type: 'payslip',
          target_id: payslipId,
          correlation_id: correlationId,
          ip_address: ipAddress,
          metadata: { attempted_payslip_id: payslipId, requester_employee_id: employee.id }
        });
        throw AppError.forbidden('You do not have permission to access this payslip', 'ACCESS_DENIED_LOGGED');
      }

      const pdfBuffer = await generatePayslipPdfBuffer({ payslip, employee });
      const filename = buildSafePayslipFilename(
        employee.employee_code,
        payslip.pay_period_year,
        payslip.pay_period_month
      );

      await repo.recordAuditEvent({
        actor_user_id: user.id,
        actor_role: user.role,
        action: 'PAYSLIP_DOWNLOADED',
        target_type: 'payslip',
        target_id: payslip.id,
        correlation_id: correlationId,
        ip_address: ipAddress,
        metadata: {
          pay_period_year: payslip.pay_period_year,
          pay_period_month: payslip.pay_period_month,
          filename
        }
      });

      return { pdfBuffer, filename };
    }
  };

  // ---------------------------------------------------------------------------
  // 5. HR ADMIN SERVICE (Read-Only Directory & Leave Overview)
  // ---------------------------------------------------------------------------
  const hrService = {
    async listDirectory({ queryParams }) {
      const { items, total } = await repo.listHrEmployees(queryParams);
      return {
        items: items.map((e) => ({
          id: e.id,
          employee_code: e.employee_code,
          legal_name: e.legal_name,
          department: e.department,
          designation: e.designation,
          joining_date: e.joining_date,
          employment_status: e.employment_status,
          phone_masked: e.phone_masked,
          manager_id: e.manager_id
        })),
        pagination: buildPaginationMeta({
          page: queryParams.page,
          pageSize: queryParams.pageSize,
          total
        })
      };
    },

    async listLeaveOverview({ queryParams }) {
      const { items, total } = await repo.listHrLeaves(queryParams);
      return {
        items,
        pagination: buildPaginationMeta({
          page: queryParams.page,
          pageSize: queryParams.pageSize,
          total
        })
      };
    }
  };

  // ---------------------------------------------------------------------------
  // 6. SYSTEM ADMIN SERVICE (User/Role Management, Reference Data & Audit Logs)
  //    Strict Separation of Duties: NO access to payslips or leave requests!
  // ---------------------------------------------------------------------------
  const adminService = {
    async listUsers({ queryParams }) {
      const { items, total } = await repo.listAdminUsers(queryParams);
      return {
        items,
        pagination: buildPaginationMeta({
          page: queryParams.page,
          pageSize: queryParams.pageSize,
          total
        })
      };
    },

    async listManagers() {
      return repo.listManagers();
    },

    async createUser({ actorUser, input, correlationId, ipAddress }) {
      const password_hash = await hashPassword(input.password, config.security.bcryptCost);
      try {
        const result = await repo.createAdminUser({
          email: input.email,
          password_hash,
          role: input.role,
          legal_name: input.legal_name,
          department: input.department,
          designation: input.designation,
          employee_code: input.employee_code,
          manager_id: input.manager_id || null
        });

        await repo.recordAuditEvent({
          actor_user_id: actorUser.id,
          actor_role: actorUser.role,
          action: 'ADMIN_USER_CREATED',
          target_type: 'user',
          target_id: result.user.id,
          correlation_id: correlationId,
          ip_address: ipAddress,
          metadata: {
            email: input.email,
            role: input.role,
            employee_code: input.employee_code,
            manager_id: input.manager_id || null
          }
        });

        return result;
      } catch (err) {
        if (
          err.code === '23505' ||
          String(err.message).toUpperCase().includes('DUPLICATE') ||
          String(err.message).toLowerCase().includes('unique constraint') ||
          String(err.message).toLowerCase().includes('already exists')
        ) {
          throw AppError.conflict('A user with this email or employee code already exists.');
        }
        throw err;
      }
    },

    async updateUser({ actorUser, targetUserId, updates, correlationId, ipAddress }) {
      const updated = await repo.updateAdminUser(targetUserId, updates);
      if (!updated) {
        throw AppError.notFound('User not found');
      }
      if (updates.status && updates.status !== 'ACTIVE') {
        await repo.revokeAllUserSessions(targetUserId);
      }

      await repo.recordAuditEvent({
        actor_user_id: actorUser.id,
        actor_role: actorUser.role,
        action: 'ADMIN_USER_UPDATED',
        target_type: 'user',
        target_id: targetUserId,
        correlation_id: correlationId,
        ip_address: ipAddress,
        metadata: updates
      });

      return updated;
    },

    async createLeaveType({ actorUser, input, correlationId, ipAddress }) {
      try {
        const created = await repo.createLeaveType(input);
        await repo.recordAuditEvent({
          actor_user_id: actorUser.id,
          actor_role: actorUser.role,
          action: 'ADMIN_LEAVE_TYPE_CREATED',
          target_type: 'leave_type',
          target_id: created.id,
          correlation_id: correlationId,
          ip_address: ipAddress,
          metadata: { code: created.code, default_annual_quota: created.default_annual_quota }
        });
        return created;
      } catch (err) {
        if (err.code === '23505' || String(err.message).includes('DUPLICATE')) {
          throw AppError.conflict('A leave type with this code already exists.');
        }
        throw err;
      }
    },

    async listAuditEvents({ queryParams }) {
      const { items, total } = await repo.listAuditEvents(queryParams);
      return {
        items,
        pagination: buildPaginationMeta({
          page: queryParams.page,
          pageSize: queryParams.pageSize,
          total
        })
      };
    }
  };

  return {
    authService,
    employeeService,
    leaveService,
    payslipService,
    hrService,
    adminService
  };
}
