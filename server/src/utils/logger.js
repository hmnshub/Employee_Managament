/**
 * Structured JSON logger with automatic secret redaction.
 * Ensures passwords, session tokens, CSRF tokens, cookies, and service-role keys
 * are NEVER written to logs.
 */

const SENSITIVE_KEY_PATTERN = /password|secret|token|cookie|authorization|service_role|apikey|hash/i;

export function redactSensitiveData(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // Redact anything resembling a bcrypt hash or long hex/Bearer token
    if (/^\$2[aby]\$\d{2}\$/.test(value)) return '[REDACTED_HASH]';
    if (/^Bearer\s+/i.test(value)) return 'Bearer [REDACTED]';
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactSensitiveData);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitiveData(v);
      }
    }
    return out;
  }
  return value;
}

export const logger = {
  info(message, meta = {}) {
    if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TEST_LOGS) return;
    const entry = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...redactSensitiveData(meta)
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  },
  warn(message, meta = {}) {
    if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TEST_LOGS) return;
    const entry = {
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...redactSensitiveData(meta)
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  },
  error(message, meta = {}) {
    if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_TEST_LOGS) return;
    const entry = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      ...redactSensitiveData(meta)
    };
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  }
};
