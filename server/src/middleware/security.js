import crypto from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { hashSessionToken, verifyCsrfTokenConstantTime } from '../utils/crypto.js';

/**
 * Attaches a unique correlationId to every request and response.
 */
export function correlationMiddleware(req, res, next) {
  const incoming = req.headers['x-correlation-id'];
  const correlationId =
    typeof incoming === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(incoming)
      ? incoming
      : crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

/**
 * Sets strict security headers (equivalent to Helmet + strict CSP + no-store cache policy)
 * and disables x-powered-by.
 */
export function securityHeadersMiddleware(config) {
  return (req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (config.isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    // Enforce no-store on all API responses so sensitive HR/payroll data is never cached
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  };
}

/**
 * Enforces strict single-origin CORS with credentials support.
 */
export function corsMiddleware(config) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (origin === config.clientOrigin) {
        res.setHeader('Access-Control-Allow-Origin', config.clientOrigin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, X-CSRF-Token, X-Correlation-Id, X-Idempotency-Key'
        );
        res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-Id, Content-Disposition');
      } else {
        return next(AppError.forbidden('Cross-origin request blocked by CORS policy', 'CORS_ORIGIN_DENIED'));
      }
    }
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
    next();
  };
}

/**
 * Parses Cookie header into req.cookies object safely.
 */
export function cookieParserMiddleware(req, _res, next) {
  const cookies = {};
  const raw = req.headers.cookie;
  if (typeof raw === 'string' && raw.length > 0) {
    for (const pair of raw.split(';')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) {
        try {
          cookies[k] = decodeURIComponent(v);
        } catch {
          cookies[k] = v;
        }
      }
    }
  }
  req.cookies = cookies;
  next();
}

/**
 * Formats a Set-Cookie header string with HttpOnly, SameSite=Strict, and Secure (in prod).
 */
export function serializeSessionCookie(config, tokenValue, maxAgeSeconds) {
  const parts = [
    `${config.cookie.name}=${encodeURIComponent(tokenValue)}`,
    `Path=${config.cookie.path}`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    `SameSite=${config.cookie.sameSite}`
  ];
  if (config.cookie.httpOnly) parts.push('HttpOnly');
  if (config.cookie.secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * In-memory sliding-window rate limiter middleware factory.
 */
export function createRateLimiter({ windowMs, max, keyGenerator, message }) {
  const hits = new Map();

  function cleanup(now) {
    for (const [key, entry] of hits.entries()) {
      if (now >= entry.resetAt) hits.delete(key);
    }
  }

  const middleware = (req, res, next) => {
    const now = Date.now();
    if (hits.size > 2000) cleanup(now);
    const key = keyGenerator ? keyGenerator(req) : req.ip || '127.0.0.1';
    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return next(AppError.tooManyRequests(message || 'Too many requests. Please slow down.'));
    }
    next();
  };

  middleware.reset = () => hits.clear();
  return middleware;
}

/**
 * Rejects any request that puts sensitive credentials or session tokens in the URL query string.
 */
export function forbidTokensInUrlMiddleware(req, _res, next) {
  const suspiciousKeys = ['token', 'session', 'password', 'secret', 'csrf', 'access_token', 'service_role'];
  for (const key of Object.keys(req.query || {})) {
    if (suspiciousKeys.includes(key.toLowerCase())) {
      return next(
        AppError.badRequest(
          'Sensitive tokens or credentials must never be passed in URL query parameters',
          { [key]: 'Disallowed query parameter' },
          'SENSITIVE_QUERY_PARAM'
        )
      );
    }
  }
  next();
}

/**
 * Authentication middleware:
 * 1. Extracts opaque session token from HttpOnly cookie ONLY (never URL or Authorization header).
 * 2. Hashes with SHA-256 and looks up session in DB.
 * 3. Verifies session is not revoked, not expired (absolute TTL), and not idle-timed-out.
 * 4. Verifies user account is still ACTIVE.
 * 5. Attaches `req.auth = { user, employee, session }` and slides `idle_expires_at`.
 */
export function createAuthenticateMiddleware({ repo, config }) {
  return async (req, res, next) => {
    try {
      const rawToken = req.cookies?.[config.cookie.name];
      if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
        throw AppError.unauthorized('Authentication required. Please sign in.');
      }

      const tokenHash = hashSessionToken(rawToken);
      const session = await repo.findSessionByTokenHash(tokenHash);
      if (!session) {
        res.setHeader('Set-Cookie', serializeSessionCookie(config, '', 0));
        throw AppError.unauthorized('Invalid or expired session. Please sign in again.');
      }

      const now = Date.now();
      const expiresAtMs = Date.parse(session.expires_at);
      const idleExpiresAtMs = Date.parse(session.idle_expires_at);

      if (session.revoked_at || now >= expiresAtMs || now >= idleExpiresAtMs) {
        if (!session.revoked_at) {
          await repo.revokeSession(session.id);
        }
        res.setHeader('Set-Cookie', serializeSessionCookie(config, '', 0));
        throw AppError.unauthorized('Your session has expired. Please sign in again.');
      }

      const user = await repo.findUserById(session.user_id);
      if (!user || user.status !== 'ACTIVE') {
        await repo.revokeSession(session.id);
        res.setHeader('Set-Cookie', serializeSessionCookie(config, '', 0));
        throw AppError.unauthorized('Account is no longer active.');
      }

      const employee = await repo.findEmployeeByUserId(user.id);
      const newIdleIso = new Date(now + config.session.idleTimeoutMs).toISOString();
      await repo.touchSessionIdleExpiry(session.id, newIdleIso);

      req.auth = {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status
        },
        employee,
        session: {
          id: session.id,
          csrf_token: session.csrf_token,
          expires_at: session.expires_at,
          idle_expires_at: newIdleIso
        }
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * CSRF protection middleware:
 * Required on all state-changing requests (POST, PATCH, PUT, DELETE) after login.
 * Compares `X-CSRF-Token` header against the session's per-session CSRF token in constant time.
 */
export function createCsrfMiddleware({ repo }) {
  const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  return async (req, _res, next) => {
    try {
      if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
        return next();
      }
      const sessionCsrf = req.auth?.session?.csrf_token;
      const providedCsrf = req.headers['x-csrf-token'];

      if (!verifyCsrfTokenConstantTime(providedCsrf, sessionCsrf)) {
        await repo.recordAuditEvent({
          actor_user_id: req.auth?.user?.id || null,
          actor_role: req.auth?.user?.role || null,
          action: 'ACCESS_DENIED_CSRF',
          target_type: 'endpoint',
          target_id: null,
          correlation_id: req.correlationId,
          ip_address: req.ip || '127.0.0.1',
          metadata: { path: req.originalUrl || req.url, method: req.method }
        });
        throw AppError.forbidden('Invalid or missing CSRF token in X-CSRF-Token header', 'CSRF_INVALID');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Central Authorization Policy Engine (`authorize`):
 * Enforces role-based access control, separation of duties (e.g. SYSTEM_ADMIN denied
 * access to payslips and leave requests by default), resource ownership, manager->direct-report
 * relationship, and workflow state transitions, logging all access denials to `audit_events`.
 */
export function createAuthorizePolicy({ repo }) {
  return function authorize({
    allowedRoles = [],
    requireEmployeeProfile = false,
    checkResource = null
  } = {}) {
    return async (req, _res, next) => {
      try {
        if (!req.auth || !req.auth.user) {
          throw AppError.unauthorized('Authentication is required');
        }

        const { user, employee } = req.auth;

        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          await repo.recordAuditEvent({
            actor_user_id: user.id,
            actor_role: user.role,
            action: 'ACCESS_DENIED_ROLE',
            target_type: 'endpoint',
            target_id: null,
            correlation_id: req.correlationId,
            ip_address: req.ip || '127.0.0.1',
            metadata: {
              path: req.originalUrl || req.url,
              method: req.method,
              required_roles: allowedRoles
            }
          });
          throw AppError.forbidden('You do not have the required role to perform this operation');
        }

        if (requireEmployeeProfile && !employee) {
          throw AppError.forbidden('No employee profile is associated with this account');
        }

        if (typeof checkResource === 'function') {
          await checkResource({ req, user, employee, repo });
        }

        next();
      } catch (err) {
        if (err instanceof AppError && (err.statusCode === 403 || err.statusCode === 404)) {
          // Record object/relationship access denial if not already recorded
          if (err.code !== 'ACCESS_DENIED_LOGGED') {
            await repo.recordAuditEvent({
              actor_user_id: req.auth?.user?.id || null,
              actor_role: req.auth?.user?.role || null,
              action: 'ACCESS_DENIED_RESOURCE',
              target_type: 'resource',
              target_id: null,
              correlation_id: req.correlationId,
              ip_address: req.ip || '127.0.0.1',
              metadata: {
                path: req.originalUrl || req.url,
                method: req.method,
                reason: err.code
              }
            });
          }
        }
        next(err);
      }
    };
  };
}

/**
 * Global error handler middleware:
 * Returns a consistent JSON error schema with `correlationId` and never leaks
 * stack traces, SQL syntax errors, or internal paths.
 */
export function globalErrorHandler(err, req, res, _next) {
  const correlationId = req.correlationId || crypto.randomUUID();
  res.setHeader('X-Correlation-Id', correlationId);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON request body',
        fieldErrors: null,
        correlationId
      }
    });
    return;
  }

  if (err.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds maximum allowed size',
        fieldErrors: null,
        correlationId
      }
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        fieldErrors: err.fieldErrors || null,
        correlationId
      }
    });
    return;
  }

  // Unexpected error: log full diagnostic server-side with correlationId, return generic 500
  logger.error('Unhandled request error', {
    correlationId,
    method: req.method,
    path: req.originalUrl || req.url,
    errorName: err?.name,
    errorMessage: err?.message
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while processing your request.',
      fieldErrors: null,
      correlationId
    }
  });
}
