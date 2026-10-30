import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');

/**
 * Loads environment variables from server/.env if present without overriding
 * already-set process.env values.
 */
export function loadEnvFile(envFilePath = path.join(serverRoot, '.env')) {
  if (!fs.existsSync(envFilePath)) return;
  const content = fs.readFileSync(envFilePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/**
 * Validates required configuration at startup.
 * Fails immediately with a human-readable message telling the developer
 * which value to fill in inside server/.env.
 */
export function loadConfig(env = process.env) {
  loadEnvFile();

  const nodeEnv = (env.NODE_ENV || 'development').trim();
  const isTest = nodeEnv === 'test';
  const isProd = nodeEnv === 'production';

  const supabaseUrl = (env.SUPABASE_URL || '').trim();
  const supabaseServiceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!isTest) {
    const missing = [];
    if (!supabaseUrl) {
      missing.push('SUPABASE_URL (copy your Project URL from Supabase Dashboard -> Project Settings -> API)');
    } else {
      try {
        const parsed = new URL(supabaseUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          missing.push('SUPABASE_URL (must be a valid http:// or https:// URL)');
        }
      } catch {
        missing.push('SUPABASE_URL (invalid URL format; expected https://<project-ref>.supabase.co)');
      }
    }

    if (!supabaseServiceRoleKey) {
      missing.push(
        'SUPABASE_SERVICE_ROLE_KEY (copy your service_role secret key from Supabase Dashboard -> Project Settings -> API)'
      );
    } else if (supabaseServiceRoleKey.length < 20) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY (value appears truncated or invalid)');
    }

    if (missing.length > 0) {
      const errorMessage = [
        '================================================================================',
        'CONFIGURATION ERROR: Missing or invalid required environment variable(s) in server/.env',
        'Please open server/.env and fill in the following required value(s):',
        ...missing.map((m) => `  - ${m}`),
        '================================================================================'
      ].join('\n');
      const err = new Error(errorMessage);
      err.code = 'CONFIG_VALIDATION_ERROR';
      throw err;
    }
  }

  const port = Number.parseInt(env.PORT || '4000', 10);
  const clientOrigin = (env.CLIENT_ORIGIN || 'http://localhost:5173').trim();
  const sessionTtlHours = Number.parseInt(env.SESSION_TTL_HOURS || '8', 10);
  const sessionIdleMinutes = Number.parseInt(env.SESSION_IDLE_MINUTES || '30', 10);
  const loginRateLimitWindowMs = Number.parseInt(env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min
  const loginRateLimitMaxIp = Number.parseInt(env.LOGIN_RATE_LIMIT_MAX_IP || '15', 10);
  const apiRateLimitWindowMs = Number.parseInt(env.API_RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 min
  const apiRateLimitMax = Number.parseInt(env.API_RATE_LIMIT_MAX || '120', 10);
  const loginLockoutThreshold = Number.parseInt(env.LOGIN_LOCKOUT_THRESHOLD || '5', 10);
  const loginLockoutMinutes = Number.parseInt(env.LOGIN_LOCKOUT_MINUTES || '15', 10);

  return Object.freeze({
    nodeEnv,
    isTest,
    isProd,
    port: Number.isFinite(port) && port > 0 ? port : 4000,
    clientOrigin,
    supabaseUrl: supabaseUrl || 'https://test-project.supabase.co',
    supabaseServiceRoleKey: supabaseServiceRoleKey || 'test-service-role-key-not-used-in-mock',
    cookie: Object.freeze({
      name: isProd ? '__Host-ess_session' : 'ess_session',
      httpOnly: true,
      secure: isProd,
      sameSite: 'Strict',
      path: '/'
    }),
    session: Object.freeze({
      ttlMs: (Number.isFinite(sessionTtlHours) ? sessionTtlHours : 8) * 60 * 60 * 1000,
      idleTimeoutMs: (Number.isFinite(sessionIdleMinutes) ? sessionIdleMinutes : 30) * 60 * 1000
    }),
    security: Object.freeze({
      bcryptCost: 12,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      loginRateLimitWindowMs,
      loginRateLimitMaxIp,
      apiRateLimitWindowMs,
      apiRateLimitMax,
      loginLockoutThreshold,
      loginLockoutMs: loginLockoutMinutes * 60 * 1000,
      bodyLimit: '32kb'
    })
  });
}
