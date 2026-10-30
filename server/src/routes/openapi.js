export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Employee Self-Service Portal API',
    version: '1.0.0',
    description:
      'Production-grade REST API for Mini Project 01 – Employee Self-Service Portal. Enforces server-side opaque sessions (HttpOnly/SameSite=Strict cookies), constant-time per-session CSRF tokens, central role/ownership/relationship authorization, and atomic PL/pgSQL database transactions.'
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'ess_session',
        description: 'Opaque 256-bit session token stored in HttpOnly, SameSite=Strict cookie'
      },
      csrfHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'Per-session CSRF token required on all POST, PATCH, PUT, DELETE requests'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'correlationId'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Please correct the highlighted fields.' },
              fieldErrors: {
                type: 'object',
                nullable: true,
                additionalProperties: { type: 'string' }
              },
              correlationId: { type: 'string', format: 'uuid' }
            }
          }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 10 },
          totalItems: { type: 'integer', example: 25 },
          totalPages: { type: 'integer', example: 3 },
          hasNextPage: { type: 'boolean', example: true },
          hasPreviousPage: { type: 'boolean', example: false }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Database and service health check',
        tags: ['System'],
        responses: {
          200: { description: 'Service and Supabase connection healthy' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate user and establish server-side session',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'aayush.shrestha@portal.demo' },
                  password: { type: 'string', minLength: 12, example: 'EmployeePass#2026!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated; sets HttpOnly session cookie and returns CSRF token + landing route' },
          400: { description: 'Validation error' },
          401: { description: 'Invalid credentials or locked account' },
          429: { description: 'Rate limit exceeded' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Revoke current server-side session and clear session cookie',
        tags: ['Authentication'],
        security: [{ sessionCookie: [], csrfHeader: [] }],
        responses: {
          200: { description: 'Session revoked' },
          401: { description: 'Not authenticated' },
          403: { description: 'Missing or invalid CSRF token' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Retrieve current authenticated session and user context',
        tags: ['Authentication'],
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: 'Current user profile and CSRF token' },
          401: { description: 'Unauthenticated or expired session' }
        }
      }
    },
    '/api/employees/me': {
      get: {
        summary: 'View own employee profile and residential/mailing address',
        tags: ['Employees'],
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: 'Employee profile (with locked read-only fields) and address' },
          401: { description: 'Unauthenticated' }
        }
      }
    },
    '/api/employees/me/address': {
      patch: {
        summary: 'Update own residential and mailing address with optimistic locking and audit trail',
        tags: ['Employees'],
        security: [{ sessionCookie: [], csrfHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'version',
                  'residential_line1',
                  'residential_city',
                  'residential_state',
                  'residential_postal_code',
                  'residential_country',
                  'mailing_same_as_residential'
                ],
                properties: {
                  version: { type: 'integer', minimum: 1, example: 1 },
                  residential_line1: { type: 'string', example: 'House 109, Sanepa Chowk' },
                  residential_line2: { type: 'string', nullable: true, example: 'Ward 2' },
                  residential_city: { type: 'string', example: 'Lalitpur' },
                  residential_state: { type: 'string', example: 'Bagmati' },
                  residential_postal_code: { type: 'string', example: '44700' },
                  residential_country: { type: 'string', example: 'NP' },
                  mailing_same_as_residential: { type: 'boolean', example: true },
                  mailing_line1: { type: 'string', example: 'House 109, Sanepa Chowk' },
                  mailing_line2: { type: 'string', nullable: true },
                  mailing_city: { type: 'string', example: 'Lalitpur' },
                  mailing_state: { type: 'string', example: 'Bagmati' },
                  mailing_postal_code: { type: 'string', example: '44700' },
                  mailing_country: { type: 'string', example: 'NP' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Address updated and before/after audit event recorded' },
          400: { description: 'Validation error or attempt to modify read-only profile fields' },
          401: { description: 'Unauthenticated' },
          403: { description: 'Missing CSRF token' },
          409: { description: 'Optimistic lock version conflict' }
        }
      }
    },
    '/api/leaves/balance': {
      get: {
        summary: 'Retrieve current leave balances and active leave types',
        tags: ['Leaves'],
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: 'Leave balances per leave type' },
          401: { description: 'Unauthenticated' },
          403: { description: 'Forbidden for SYSTEM_ADMIN (separation of duties)' }
        }
      }
    },
    '/api/leaves': {
      post: {
        summary: 'Submit a new leave request (atomic balance check + overlap prevention)',
        tags: ['Leaves'],
        security: [{ sessionCookie: [], csrfHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['leave_type_id', 'start_date', 'end_date', 'reason'],
                properties: {
                  leave_type_id: { type: 'string', format: 'uuid', example: '44444444-4444-4444-8444-444444444401' },
                  start_date: { type: 'string', format: 'date', example: '2026-12-10' },
                  end_date: { type: 'string', format: 'date', example: '2026-12-12' },
                  reason: { type: 'string', example: 'Family trip to Lumbini' },
                  idempotency_key: { type: 'string', example: 'req-20261210-01' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Leave request created in PENDING status' },
          400: { description: 'Invalid dates or parameters' },
          409: { description: 'Overlapping leave dates or duplicate idempotency key' },
          422: { description: 'Insufficient leave balance' }
        }
      }
    },
    '/api/leaves/my': {
      get: {
        summary: 'List own leave requests (paginated, filterable, sortable)',
        tags: ['Leaves'],
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: 'Paginated list of employee leave requests' }
        }
      }
    },
    '/api/leaves/{id}/cancel': {
      post: {
        summary: 'Cancel own PENDING leave request',
        tags: ['Leaves'],
        security: [{ sessionCookie: [], csrfHeader: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Leave request cancelled and pending balance released' },
          403: { description: 'Not owner of leave request' },
          409: { description: 'Request is no longer PENDING or version conflict' }
        }
      }
    },
    '/api/leaves/team': {
      get: {
        summary: 'List leave requests for manager direct reports only',
        tags: ['Manager Workflow'],
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: 'Paginated list of direct-report leave requests' },
          403: { description: 'Requires MANAGER role' }
        }
      }
    },
    '/api/leaves/{id}/decision': {
      patch: {
        summary: 'Approve or reject a direct report PENDING leave request',
        tags: ['Manager Workflow'],
        security: [{ sessionCookie: [], csrfHeader: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['decision'],
                properties: {
                  decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                  comment: { type: 'string', example: 'Approved. Enjoy your leave.' },
                  version: { type: 'integer', example: 1 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Decision recorded and balance updated atomically' },
          403: { description: 'Not a MANAGER or employee is not a direct report' },
          409: { description: 'Request already decided or version conflict' }
        }
      }
    },
    '/api/payslips': {
      get: {
        summary: 'List own payslips (paginated)',
        tags: ['Payslips'],
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: 'Paginated list of employee payslips' },
          403: { description: 'Forbidden for SYSTEM_ADMIN (separation of duties)' }
        }
      }
    },
    '/api/payslips/{id}/download': {
      get: {
        summary: 'Generate and stream confidential PDF payslip on demand',
        tags: ['Payslips'],
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: {
            description: 'PDF binary stream with Content-Disposition attachment and Cache-Control: no-store, private',
            content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } }
          },
          403: { description: 'BOLA protection: payslip belongs to another employee or role denied' },
          404: { description: 'Payslip not found' }
        }
      }
    }
  }
};
