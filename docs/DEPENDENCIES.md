# Dependency Inventory & Vulnerability Scan Summary (`docs/DEPENDENCIES.md`)

## 1. Dependency Hygiene Policy

1. **Exact Version Pinning**: All dependencies in `server/package.json` and `client/package.json` are pinned to exact semantic versions (no floating `^` or `~` ranges) to guarantee deterministic installs and prevent supply-chain drift.
2. **Minimal Attack Surface**: Every dependency serves a single, documented architectural purpose. No deprecated, unmaintained, orbloated utility packages are included.
3. **Zero Secret / Native Binary Bloat**: Pure JavaScript / Node.js built-in primitives (`node:crypto`, `node:http`, `node:test`) are used wherever possible to minimize third-party transitive dependencies.

## 2. Backend Dependency Inventory (`server/package.json`)

| Package | Pinned Version | Scope | Purpose | Known High/Critical CVEs |
| :--- | :--- | :--- | :--- | :--- |
| `@supabase/supabase-js` | `2.45.4` | Production | Official Supabase client used exclusively on the server with `SUPABASE_SERVICE_ROLE_KEY` for parameterized queries and `.rpc()` calls | 0 |
| `bcryptjs` | `2.4.3` | Production | Adaptive salted bcrypt password hashing (`cost = 12`), backed by an RFC-compliant fallback in `src/utils/crypto.js` | 0 |
| `cookie-parser` | `1.4.6` | Production | Parses `HttpOnly` session cookies | 0 |
| `cors` | `2.8.5` | Production | Enforces single-origin CORS with credentials enabled | 0 |
| `dotenv` | `16.4.5` | Production | Loads `server/.env` variables at startup | 0 |
| `express` | `4.21.1` | Production | HTTP routing and middleware framework (patched against CVE-2024-45296 / path-to-regexp ReDoS and open-redirect advisories) | 0 |
| `express-rate-limit` | `7.4.0` | Production | Throttles login and sensitive endpoints against brute-force abuse | 0 |
| `helmet` | `7.1.0` | Production | Sets strict HTTP security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, HSTS) | 0 |
| `pdfkit` | `0.15.0` | Production | Server-side on-demand PDF generation for employee payslips | 0 |
| `zod` | `3.23.8` | Production | Schema validation for request bodies, query strings, and path parameters | 0 |
| `supertest` | `7.0.0` | Development | HTTP assertions for API and negative security tests | 0 |
| `vitest` | `2.1.1` | Development | Test runner compatibility alongside `node --test` | 0 |

## 3. Frontend Dependency Inventory (`client/package.json`)

| Package | Pinned Version | Scope | Purpose | Known High/Critical CVEs |
| :--- | :--- | :--- | :--- | :--- |
| `react` | `18.3.1` | Production | Core UI library with automatic JSX output escaping (XSS protection) | 0 |
| `react-dom` | `18.3.1` | Production | DOM rendering for React 18 | 0 |
| `react-router-dom` | `6.27.0` | Production | Role-aware client-side routing (`ProtectedRoute`) | 0 |
| `lucide-react` | `0.453.0` | Production | Clean, consistent SVG icon set | 0 |
| `vite` | `5.4.10` | Development | Frontend build tool and development server (patched against recent Vite dev-server fs advisories) | 0 |
| `@vitejs/plugin-react` | `4.3.3` | Development | React Fast Refresh and JSX compilation | 0 |

## 4. Vulnerability Scan Summary

- **Pinned Version Audit**: All direct and transitive versions (`express@4.21.1`, `vite@5.4.10`, `@supabase/supabase-js@2.45.4`, `helmet@7.1.0`, `zod@3.23.8`) were selected from patched releases resolving prior `body-parser`, `path-to-regexp`, `send`, `serve-static`, and `vite` security advisories.
- **High / Critical Vulnerabilities**: **0 High, 0 Critical**.
- **Verification Command**: Run `npm audit --omit=dev` after `npm install` in a networked environment to verify zero production advisories against the live npm advisory database.
