import http from 'node:http';
import { createRequire } from 'node:module';
import { AppError } from './utils/errors.js';
import {
  cookieParserMiddleware,
  correlationMiddleware,
  corsMiddleware,
  createAuthenticateMiddleware,
  createAuthorizePolicy,
  createCsrfMiddleware,
  createRateLimiter,
  forbidTokensInUrlMiddleware,
  globalErrorHandler,
  securityHeadersMiddleware
} from './middleware/security.js';
import { createServices } from './services/index.js';
import { createControllers } from './controllers/index.js';
import { openApiSpec } from './routes/openapi.js';

const require = createRequire(import.meta.url);
let expressPkg = null;
try {
  expressPkg = require('express');
} catch {
  expressPkg = null;
}

/**
 * Lightweight, Express-compatible application router used when `express` is not yet
 * installed in node_modules (or in offline sandbox environments), supporting identical
 * middleware chains, route parameters (`/api/leaves/:id/decision`), `.json()`, `.status()`,
 * and `http.createServer(app)` for Supertest/HTTP tests.
 */
function createMinimalExpressApp() {
  const middlewares = [];
  const routes = [];
  let errorHandler = null;

  function compilePath(pattern) {
    const paramNames = [];
    const regexStr = pattern
      .replace(/\/+$/, '')
      .replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
    const regex = new RegExp(`^${regexStr || '/'}$`);
    return { regex, paramNames };
  }

  function registerRoute(method, pattern, ...handlers) {
    const { regex, paramNames } = compilePath(pattern);
    routes.push({ method: method.toUpperCase(), pattern, regex, paramNames, handlers: handlers.flat() });
  }

  const app = (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    req.originalUrl = req.url;
    req.path = parsedUrl.pathname.replace(/\/+$/, '') || '/';
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    const forwarded = req.headers['x-forwarded-for'];
    req.ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || '127.0.0.1';

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (payload) => {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(payload));
      return res;
    };
    res.send = (payload) => {
      if (Buffer.isBuffer(payload)) {
        res.end(payload);
      } else if (typeof payload === 'string') {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
        res.end(payload);
      } else {
        res.json(payload);
      }
      return res;
    };

    // Parse JSON body with 32KB limit
    const parseBody = (cb) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
        req.body = {};
        return cb(null);
      }
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      if (!contentType.includes('application/json') && contentType !== '') {
        req.body = {};
        return cb(null);
      }
      let size = 0;
      const chunks = [];
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > 32 * 1024) {
          const err = new Error('Payload too large');
          err.type = 'entity.too.large';
          cb(err);
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (chunks.length === 0) {
          req.body = {};
          return cb(null);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          req.body = JSON.parse(raw);
          cb(null);
        } catch {
          const err = new SyntaxError('Malformed JSON');
          err.status = 400;
          err.body = raw;
          cb(err);
        }
      });
      req.on('error', cb);
    };

    parseBody((bodyErr) => {
      if (bodyErr) {
        if (errorHandler) return errorHandler(bodyErr, req, res, () => {});
        res.statusCode = 400;
        return res.end();
      }

      // Match route
      let matchedRoute = null;
      let params = {};
      for (const r of routes) {
        if (r.method !== req.method.toUpperCase()) continue;
        const m = req.path.match(r.regex);
        if (m) {
          matchedRoute = r;
          r.paramNames.forEach((name, i) => {
            try {
              params[name] = decodeURIComponent(m[i + 1]);
            } catch {
              params[name] = m[i + 1];
            }
          });
          break;
        }
      }
      req.params = params;

      const chain = [
        ...middlewares,
        ...(matchedRoute
          ? matchedRoute.handlers
          : [
              (_req, _res, next) =>
                next(AppError.notFound(`Endpoint ${_req.method} ${_req.path} not found`, 'ENDPOINT_NOT_FOUND'))
            ])
      ];

      let idx = 0;
      const next = (err) => {
        if (err) {
          if (errorHandler) return errorHandler(err, req, res, () => {});
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: { message: 'Internal Error' } }));
        }
        const fn = chain[idx++];
        if (!fn) return;
        try {
          const maybePromise = fn(req, res, next);
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(next);
          }
        } catch (syncErr) {
          next(syncErr);
        }
      };

      next();
    });
  };

  app.disable = () => {};
  app.set = () => {};
  app.use = (fn) => {
    if (fn.length === 4) {
      errorHandler = fn;
    } else {
      middlewares.push(fn);
    }
  };
  app.get = (p, ...h) => registerRoute('GET', p, ...h);
  app.post = (p, ...h) => registerRoute('POST', p, ...h);
  app.patch = (p, ...h) => registerRoute('PATCH', p, ...h);
  app.put = (p, ...h) => registerRoute('PUT', p, ...h);
  app.delete = (p, ...h) => registerRoute('DELETE', p, ...h);
  app.listen = (port, cb) => {
    const srv = http.createServer(app);
    return srv.listen(port, cb);
  };

  return app;
}

/**
 * Builds and configures the complete application with all middleware, routes,
 * rate limiters, central authorization policies, OpenAPI docs, and error handler.
 */
export function createApp({ config, repo }) {
  const app = expressPkg ? expressPkg() : createMinimalExpressApp();

  app.disable('x-powered-by');
  if (expressPkg) {
    app.use(expressPkg.json({ limit: config.security.bodyLimit }));
  }

  // Cross-cutting security & observability middleware
  app.use(correlationMiddleware);
  app.use(securityHeadersMiddleware(config));
  app.use(corsMiddleware(config));
  app.use(cookieParserMiddleware);
  app.use(forbidTokensInUrlMiddleware);

  // Rate limiters
  const loginRateLimiter = createRateLimiter({
    windowMs: config.security.loginRateLimitWindowMs,
    max: config.security.loginRateLimitMaxIp,
    keyGenerator: (req) => `login:${req.ip || '127.0.0.1'}`,
    message: 'Too many login attempts from this IP address. Please wait before retrying.'
  });

  const sensitiveActionLimiter = createRateLimiter({
    windowMs: config.security.apiRateLimitWindowMs,
    max: config.security.apiRateLimitMax,
    keyGenerator: (req) => `api:${req.ip || '127.0.0.1'}`,
    message: 'Rate limit exceeded. Please slow down your requests.'
  });

  const authenticate = createAuthenticateMiddleware({ repo, config });
  const verifyCsrf = createCsrfMiddleware({ repo });
  const authorize = createAuthorizePolicy({ repo });

  const services = createServices({ repo, config });
  const controllers = createControllers({ services, repo, config });

  // ---------------------------------------------------------------------------
  // PUBLIC / HEALTH / DOCS ROUTES
  // ---------------------------------------------------------------------------
  app.get('/api/health', controllers.health);

  if (!config.isProd) {
    app.get('/api/openapi.json', (_req, res) => {
      res.status(200).json(openApiSpec);
    });
    app.get('/api/docs', (_req, res) => {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Employee Self-Service Portal – API Documentation</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem auto; max-width: 960px; color: #0f172a; line-height: 1.5; padding: 0 1rem; }
    h1 { color: #0f766e; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    .endpoint { border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 0.75rem; background: #f8fafc; }
    .method { font-weight: 700; display: inline-block; min-width: 68px; color: #0f766e; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Employee Self-Service Portal – OpenAPI 3.0 Documentation</h1>
  <p>Machine-readable specification: <a href="/api/openapi.json"><code>/api/openapi.json</code></a></p>
  ${Object.entries(openApiSpec.paths)
    .map(([pathKey, methods]) =>
      Object.entries(methods)
        .map(
          ([m, detail]) =>
            `<div class="endpoint"><span class="method">${m.toUpperCase()}</span> <code>${pathKey}</code> — ${detail.summary}</div>`
        )
        .join('')
    )
    .join('\n')}
</body>
</html>`;
      res.status(200).send(html);
    });
  }

  // ---------------------------------------------------------------------------
  // F1: AUTHENTICATION ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/auth/login', loginRateLimiter, controllers.login);
  app.post('/api/auth/logout', authenticate, verifyCsrf, controllers.logout);
  app.get('/api/auth/me', authenticate, controllers.me);
  app.get('/api/auth/csrf', authenticate, controllers.csrf);

  // ---------------------------------------------------------------------------
  // F2 & F3: EMPLOYEE PROFILE & ADDRESS ROUTES
  // Allowed for all authenticated employees with a profile
  // ---------------------------------------------------------------------------
  app.get(
    '/api/employees/me',
    authenticate,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.getMyProfile
  );

  app.patch(
    '/api/employees/me/address',
    authenticate,
    verifyCsrf,
    sensitiveActionLimiter,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.updateMyAddress
  );

  // ---------------------------------------------------------------------------
  // F4: LEAVE MANAGEMENT ROUTES
  // Note: SYSTEM_ADMIN is explicitly excluded from leave & payslip endpoints
  // by default to enforce strict separation of duties per PDF Section 3 & prompt.
  // ---------------------------------------------------------------------------
  app.get(
    '/api/leaves/balance',
    authenticate,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.getLeaveBalance
  );

  app.post(
    '/api/leaves',
    authenticate,
    verifyCsrf,
    sensitiveActionLimiter,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.createLeave
  );

  app.get(
    '/api/leaves/my',
    authenticate,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.listMyLeaves
  );

  app.post(
    '/api/leaves/:id/cancel',
    authenticate,
    verifyCsrf,
    sensitiveActionLimiter,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.cancelLeave
  );

  // Manager workflow routes: restricted strictly to MANAGER role and direct reports
  app.get(
    '/api/leaves/team',
    authenticate,
    authorize({
      allowedRoles: ['MANAGER'],
      requireEmployeeProfile: true
    }),
    controllers.listTeamLeaves
  );

  app.patch(
    '/api/leaves/:id/decision',
    authenticate,
    verifyCsrf,
    sensitiveActionLimiter,
    authorize({
      allowedRoles: ['MANAGER'],
      requireEmployeeProfile: true
    }),
    controllers.decideLeave
  );

  // ---------------------------------------------------------------------------
  // F5: CONFIDENTIAL PAYSLIP ROUTES
  // Strictly prohibited for SYSTEM_ADMIN by default (separation of duties)
  // ---------------------------------------------------------------------------
  app.get(
    '/api/payslips',
    authenticate,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.listMyPayslips
  );

  app.get(
    '/api/payslips/:id/download',
    authenticate,
    sensitiveActionLimiter,
    authorize({
      allowedRoles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
      requireEmployeeProfile: true
    }),
    controllers.downloadPayslip
  );

  // ---------------------------------------------------------------------------
  // HR ADMIN ROUTES (Read-Only Employee Directory & Leave Overview)
  // ---------------------------------------------------------------------------
  app.get(
    '/api/hr/employees',
    authenticate,
    authorize({ allowedRoles: ['HR_ADMIN'] }),
    controllers.listHrDirectory
  );

  app.get(
    '/api/hr/leaves',
    authenticate,
    authorize({ allowedRoles: ['HR_ADMIN'] }),
    controllers.listHrLeaves
  );

  // ---------------------------------------------------------------------------
  // SYSTEM ADMIN ROUTES (User/Role Management, Reference Data & Security Audit)
  // ---------------------------------------------------------------------------
  app.get(
    '/api/admin/managers',
    authenticate,
    authorize({ allowedRoles: ['SYSTEM_ADMIN'] }),
    controllers.listAdminManagers
  );

  app.get(
    '/api/admin/users',
    authenticate,
    authorize({ allowedRoles: ['SYSTEM_ADMIN'] }),
    controllers.listAdminUsers
  );

  app.post(
    '/api/admin/users',
    authenticate,
    verifyCsrf,
    sensitiveActionLimiter,
    authorize({ allowedRoles: ['SYSTEM_ADMIN'] }),
    controllers.createAdminUser
  );

  app.patch(
    '/api/admin/users/:id',
    authenticate,
    verifyCsrf,
    sensitiveActionLimiter,
    authorize({ allowedRoles: ['SYSTEM_ADMIN'] }),
    controllers.updateAdminUser
  );

  app.get(
    '/api/admin/leave-types',
    authenticate,
    authorize({ allowedRoles: ['SYSTEM_ADMIN'] }),
    controllers.listAdminLeaveTypes
  );

  app.post(
    '/api/admin/leave-types',
    authenticate,
    verifyCsrf,
    sensitiveActionLimiter,
    authorize({ allowedRoles: ['SYSTEM_ADMIN'] }),
    controllers.createAdminLeaveType
  );

  app.get(
    '/api/admin/audit-events',
    authenticate,
    authorize({ allowedRoles: ['SYSTEM_ADMIN'] }),
    controllers.listAdminAuditEvents
  );

  // Global error handler
  app.use(globalErrorHandler);

  app.resetRateLimiters = () => {
    loginRateLimiter.reset();
    sensitiveActionLimiter.reset();
  };

  return app;
}
