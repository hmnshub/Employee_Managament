import { serializeSessionCookie } from '../middleware/security.js';
import { getLandingRouteForRole } from '../services/index.js';
import {
  validateAddressUpdateInput,
  validateAdminCreateUserInput,
  validateAdminUpdateUserInput,
  validateCreateLeaveInput,
  validateCreateLeaveTypeInput,
  validateLeaveDecisionInput,
  validateListQuery,
  validateLoginInput,
  validateUuidParam
} from '../validators/schemas.js';

/**
 * Thin HTTP controllers that validate request inputs, delegate to the service layer,
 * and return structured JSON responses (or binary PDF streams for payslip download).
 */
export function createControllers({ services, repo, config }) {
  const { authService, employeeService, leaveService, payslipService, hrService, adminService } = services;

  return {
    // GET /api/health
    async health(req, res, next) {
      try {
        await repo.checkHealth();
        res.status(200).json({
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/auth/login
    async login(req, res, next) {
      try {
        const { email, password } = validateLoginInput(req.body);
        const result = await authService.login({
          email,
          password,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'unknown',
          correlationId: req.correlationId
        });

        const ttlSeconds = Math.floor(config.session.ttlMs / 1000);
        res.setHeader('Set-Cookie', serializeSessionCookie(config, result.rawToken, ttlSeconds));

        res.status(200).json({
          data: {
            user: result.user,
            csrfToken: result.csrfToken,
            expiresAt: result.expiresAt
          },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/auth/logout
    async logout(req, res, next) {
      try {
        await authService.logout({
          session: req.auth?.session,
          user: req.auth?.user,
          ipAddress: req.ip || '127.0.0.1',
          correlationId: req.correlationId
        });
        res.setHeader('Set-Cookie', serializeSessionCookie(config, '', 0));
        res.status(200).json({
          data: { loggedOut: true },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/auth/me
    async me(req, res, next) {
      try {
        const { user, employee, session } = req.auth;
        res.status(200).json({
          data: {
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
            },
            csrfToken: session.csrf_token,
            expiresAt: session.expires_at
          },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/auth/csrf
    async csrf(req, res, next) {
      try {
        res.status(200).json({
          data: { csrfToken: req.auth.session.csrf_token },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/employees/me
    async getMyProfile(req, res, next) {
      try {
        const data = await employeeService.getOwnProfile({
          user: req.auth.user,
          employee: req.auth.employee
        });
        res.status(200).json({ data, correlationId: req.correlationId });
      } catch (err) {
        next(err);
      }
    },

    // PATCH /api/employees/me/address
    async updateMyAddress(req, res, next) {
      try {
        const validatedAddress = validateAddressUpdateInput(req.body);
        const updated = await employeeService.updateOwnAddress({
          user: req.auth.user,
          employee: req.auth.employee,
          validatedAddress,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(200).json({
          data: { address: updated },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/leaves/balance
    async getLeaveBalance(req, res, next) {
      try {
        const currentFiscalYear = new Date().getFullYear();
        const yearParam = req.query.year ? Number(req.query.year) : currentFiscalYear;
        const data = await leaveService.getBalances({
          employee: req.auth.employee,
          year: Number.isInteger(yearParam) ? yearParam : currentFiscalYear
        });
        res.status(200).json({ data, correlationId: req.correlationId });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/leaves
    async createLeave(req, res, next) {
      try {
        const headerIdempotency = req.headers['x-idempotency-key'];
        const mergedBody = {
          ...(req.body || {}),
          idempotency_key: req.body?.idempotency_key || headerIdempotency || undefined
        };
        const input = validateCreateLeaveInput(mergedBody);
        const created = await leaveService.createRequest({
          user: req.auth.user,
          employee: req.auth.employee,
          input,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(201).json({
          data: { leaveRequest: created },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/leaves/my
    async listMyLeaves(req, res, next) {
      try {
        const queryParams = validateListQuery(req.query, {
          allowedSortFields: ['created_at', 'start_date', 'end_date', 'total_days', 'status'],
          defaultSortField: 'created_at',
          defaultSortOrder: 'desc',
          allowedFilters: {
            status: { type: 'enum', values: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
            leave_type_id: { type: 'uuid' }
          }
        });
        const result = await leaveService.listOwnRequests({
          employee: req.auth.employee,
          queryParams
        });
        res.status(200).json({
          data: result.items,
          pagination: result.pagination,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/leaves/:id/cancel
    async cancelLeave(req, res, next) {
      try {
        const leaveId = validateUuidParam(req.params.id, 'id');
        const expectedVersion =
          req.body && req.body.version !== undefined ? Number(req.body.version) : null;
        const cancelled = await leaveService.cancelRequest({
          user: req.auth.user,
          employee: req.auth.employee,
          leaveId,
          expectedVersion,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(200).json({
          data: { leaveRequest: cancelled },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/leaves/team (Manager direct reports)
    async listTeamLeaves(req, res, next) {
      try {
        const queryParams = validateListQuery(req.query, {
          allowedSortFields: ['created_at', 'start_date', 'end_date', 'total_days', 'status'],
          defaultSortField: 'created_at',
          defaultSortOrder: 'desc',
          allowedFilters: {
            status: { type: 'enum', values: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
            employee_id: { type: 'uuid' }
          }
        });
        const result = await leaveService.listTeamRequests({
          managerEmployee: req.auth.employee,
          queryParams
        });
        res.status(200).json({
          data: result.items,
          pagination: result.pagination,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // PATCH /api/leaves/:id/decision
    async decideLeave(req, res, next) {
      try {
        const leaveId = validateUuidParam(req.params.id, 'id');
        const decisionInput = validateLeaveDecisionInput(req.body);
        const updated = await leaveService.decideRequest({
          user: req.auth.user,
          managerEmployee: req.auth.employee,
          leaveId,
          decisionInput,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(200).json({
          data: { leaveRequest: updated },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/payslips
    async listMyPayslips(req, res, next) {
      try {
        const queryParams = validateListQuery(req.query, {
          allowedSortFields: ['pay_period_year', 'pay_period_month', 'payment_date', 'net_pay'],
          defaultSortField: 'pay_period_year',
          defaultSortOrder: 'desc',
          allowedFilters: {
            year: { type: 'int', min: 2020, max: 2100 },
            month: { type: 'int', min: 1, max: 12 }
          }
        });
        const result = await payslipService.listOwnPayslips({
          user: req.auth.user,
          employee: req.auth.employee,
          queryParams,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(200).json({
          data: result.items,
          pagination: result.pagination,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/payslips/:id/download
    async downloadPayslip(req, res, next) {
      try {
        const payslipId = validateUuidParam(req.params.id, 'id');
        const { pdfBuffer, filename } = await payslipService.downloadOwnPayslipPdf({
          user: req.auth.user,
          employee: req.auth.employee,
          payslipId,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Length', String(pdfBuffer.length));
        res.status(200).end(pdfBuffer);
      } catch (err) {
        next(err);
      }
    },

    // GET /api/hr/employees
    async listHrDirectory(req, res, next) {
      try {
        const queryParams = validateListQuery(req.query, {
          allowedSortFields: ['employee_code', 'legal_name', 'department', 'joining_date'],
          defaultSortField: 'employee_code',
          defaultSortOrder: 'asc',
          allowedFilters: {
            department: { type: 'search' },
            employment_status: { type: 'enum', values: ['ACTIVE', 'ON_LEAVE', 'ARCHIVED'] },
            search: { type: 'search' }
          }
        });
        const result = await hrService.listDirectory({ queryParams });
        res.status(200).json({
          data: result.items,
          pagination: result.pagination,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/hr/leaves
    async listHrLeaves(req, res, next) {
      try {
        const queryParams = validateListQuery(req.query, {
          allowedSortFields: ['created_at', 'start_date', 'end_date', 'total_days', 'status'],
          defaultSortField: 'created_at',
          defaultSortOrder: 'desc',
          allowedFilters: {
            status: { type: 'enum', values: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] }
          }
        });
        const result = await hrService.listLeaveOverview({ queryParams });
        res.status(200).json({
          data: result.items,
          pagination: result.pagination,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/admin/users
    async listAdminUsers(req, res, next) {
      try {
        const queryParams = validateListQuery(req.query, {
          allowedSortFields: ['created_at', 'email', 'role', 'status'],
          defaultSortField: 'created_at',
          defaultSortOrder: 'asc',
          allowedFilters: {
            role: { type: 'enum', values: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'] },
            status: { type: 'enum', values: ['ACTIVE', 'LOCKED', 'ARCHIVED'] }
          }
        });
        const result = await adminService.listUsers({ queryParams });
        res.status(200).json({
          data: result.items,
          pagination: result.pagination,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/admin/managers
    async listAdminManagers(req, res, next) {
      try {
        const managers = await adminService.listManagers();
        res.status(200).json({
          data: managers,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/admin/users
    async createAdminUser(req, res, next) {
      try {
        const input = validateAdminCreateUserInput(req.body);
        const created = await adminService.createUser({
          actorUser: req.auth.user,
          input,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(201).json({
          data: created,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // PATCH /api/admin/users/:id
    async updateAdminUser(req, res, next) {
      try {
        const targetUserId = validateUuidParam(req.params.id, 'id');
        const updates = validateAdminUpdateUserInput(req.body);
        const updated = await adminService.updateUser({
          actorUser: req.auth.user,
          targetUserId,
          updates,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(200).json({
          data: { user: updated },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/admin/leave-types
    async listAdminLeaveTypes(req, res, next) {
      try {
        const items = await repo.listLeaveTypes(false);
        res.status(200).json({
          data: items,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/admin/leave-types
    async createAdminLeaveType(req, res, next) {
      try {
        const input = validateCreateLeaveTypeInput(req.body);
        const created = await adminService.createLeaveType({
          actorUser: req.auth.user,
          input,
          correlationId: req.correlationId,
          ipAddress: req.ip || '127.0.0.1'
        });
        res.status(201).json({
          data: { leaveType: created },
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/admin/audit-events
    async listAdminAuditEvents(req, res, next) {
      try {
        const queryParams = validateListQuery(req.query, {
          allowedSortFields: ['created_at', 'action'],
          defaultSortField: 'created_at',
          defaultSortOrder: 'desc',
          allowedFilters: {
            action: { type: 'search' }
          }
        });
        const result = await adminService.listAuditEvents({ queryParams });
        res.status(200).json({
          data: result.items,
          pagination: result.pagination,
          correlationId: req.correlationId
        });
      } catch (err) {
        next(err);
      }
    }
  };
}
