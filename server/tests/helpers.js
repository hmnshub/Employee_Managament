import http from 'node:http';
import { loadConfig } from '../src/config/index.js';
import { createRepository } from '../src/repositories/db.js';
import { createApp } from '../src/app.js';

/**
 * Starts an ephemeral HTTP test server with a fresh in-memory transactional database
 * seeded with the fictional demo data, and provides stateful HTTP client helpers
 * (cookie jar + CSRF tracking) for Supertest-style API and security assertions.
 */
export async function createTestHarness(envOverrides = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    CLIENT_ORIGIN: 'http://localhost:5173',
    LOGIN_RATE_LIMIT_MAX_IP: '25',
    LOGIN_LOCKOUT_THRESHOLD: '4',
    ...envOverrides
  });
  const repo = await createRepository(config);
  const app = createApp({ config, repo });
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  function createAgent() {
    let cookieHeader = '';
    let csrfToken = '';

    async function request(method, path, { body, headers = {}, includeCsrf = true } = {}) {
      const reqHeaders = { ...headers };
      if (cookieHeader && reqHeaders.Cookie === undefined) {
        reqHeaders.Cookie = cookieHeader;
      }
      if (includeCsrf && csrfToken && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
        if (reqHeaders['X-CSRF-Token'] === undefined) {
          reqHeaders['X-CSRF-Token'] = csrfToken;
        }
      }
      if (body !== undefined && reqHeaders['Content-Type'] === undefined) {
        reqHeaders['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${baseUrl}${path}`, {
        method: method.toUpperCase(),
        headers: reqHeaders,
        body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
      });

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        const firstPair = setCookie.split(';')[0];
        if (firstPair.endsWith('=')) {
          cookieHeader = '';
        } else {
          cookieHeader = firstPair;
        }
      }

      const contentType = res.headers.get('content-type') || '';
      let data = null;
      let rawBuffer = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
        if (data?.data?.csrfToken) {
          csrfToken = data.data.csrfToken;
        }
      } else {
        const ab = await res.arrayBuffer();
        rawBuffer = Buffer.from(ab);
      }

      return {
        status: res.status,
        headers: res.headers,
        setCookieHeader: setCookie,
        body: data,
        rawBuffer
      };
    }

    return {
      get: (path, opts) => request('GET', path, opts),
      post: (path, opts) => request('POST', path, opts),
      patch: (path, opts) => request('PATCH', path, opts),
      delete: (path, opts) => request('DELETE', path, opts),
      getCookie: () => cookieHeader,
      setCookie: (c) => { cookieHeader = c; },
      getCsrfToken: () => csrfToken,
      setCsrfToken: (t) => { csrfToken = t; }
    };
  }

  return {
    app,
    repo,
    config,
    baseUrl,
    createAgent,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    }
  };
}
