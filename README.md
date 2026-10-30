# Employee Self-Service Portal (Mini Project 01)

A production-ready, security-hardened **Employee Self-Service Portal** built with **React (Vite) + React Router**, **Node.js + Express**, and **Supabase (PostgreSQL)**.

---

## 1. Prerequisites

- **Node.js**: `>= 18.0.0` (`npm >= 9.0.0`)
- **Supabase Project**: Any free-tier or self-hosted Supabase PostgreSQL project

---

## 2. Two-Step Setup & Quick Start

After cloning or extracting this repository, do **exactly two things** before running `npm install` and `npm run dev`:

### Step 1: Paste your Supabase credentials into `server/.env`

Open `server/.env` (already created with empty keys) and paste your project's URL and `service_role` secret key from **Supabase Dashboard -> Project Settings -> API**:

```ini
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
```

> **Why no JWT or session secret in `.env`?**  
> Authentication uses cryptographically random 256-bit opaque session tokens stored exclusively as `SHA-256` hashes in the `sessions` table (`sessions.token_hash`), paired with per-session 256-bit CSRF tokens compared via `crypto.timingSafeEqual`. No signing secret is needed. All other settings (`PORT=4000`, `CLIENT_ORIGIN=http://localhost:5173`, `NODE_ENV=development`, cookie flags, rate limits) have validated safe defaults in `server/src/config/index.js`.

### Step 2: Run the SQL files in the Supabase SQL Editor

In your **Supabase Dashboard -> SQL Editor**, run these two scripts **in order**:

1. **`supabase/01_schema.sql`** — Creates `pgcrypto` and `btree_gist` extensions, enums, all 10 tables (`users`, `employee_profiles`, `addresses`, `leave_types`, `leave_balances`, `leave_requests`, `payslips`, `sessions`, `login_attempts`, `audit_events`), constraints, indexes, enables Row Level Security (deny-by-default for `anon`/`authenticated`), and defines the 4 atomic PL/pgSQL transactional RPC functions (`rpc_update_employee_address`, `rpc_create_leave_request`, `rpc_decide_leave_request`, `rpc_cancel_leave_request`).
2. **`supabase/02_seed.sql`** — Seeds fictional Nepali-style demo accounts (`crypt('<password>', gen_salt('bf', 12))`), manager-employee reporting hierarchies, residential/mailing addresses, leave types, 2026 leave balances, sample leave requests, and 3 months of payslips per employee (30 payslips total).

*(Optional for development resets: run `supabase/99_reset.sql` to drop all objects cleanly before re-running `01_schema.sql` and `02_seed.sql`.)*

### Step 3: Install & Start

From the repository root:

```bash
npm install
npm run dev
```

- **Frontend UI (Vite)**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **Database Health Check**: `http://localhost:4000/api/health`
- **OpenAPI 3 Interactive Docs (Dev)**: `http://localhost:4000/api/docs` (raw JSON at `http://localhost:4000/api/openapi.json`)

---

## 3. Demo Accounts & Passwords

All demo accounts use fictional Nepali names and addresses. Passwords are 12+ characters, hashed at bcrypt cost 12 via `pgcrypto`:

| Role | Name & Employee ID | Email | Password | Reporting Relationship / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Employee** | Aayush Shrestha (`EMP-1005`) | `aayush.shrestha@portal.demo` | `EmployeePass#2026!` | Reports to **Suman Karki** (`EMP-1003`) |
| **Employee** | Ashmita Poudel (`EMP-1006`) | `ashmita.poudel@portal.demo` | `EmployeePass#2026!` | Reports to **Suman Karki** (`EMP-1003`) |
| **Employee** | Dipesh Adhikari (`EMP-1007`) | `dipesh.adhikari@portal.demo` | `EmployeePass#2026!` | Reports to **Suman Karki** (`EMP-1003`) |
| **Employee** | Kriti Maharjan (`EMP-1008`) | `kriti.maharjan@portal.demo` | `EmployeePass#2026!` | Reports to **Pratima Gurung** (`EMP-1004`) |
| **Employee** | Niraj Bhandari (`EMP-1009`) | `niraj.bhandari@portal.demo` | `EmployeePass#2026!` | Reports to **Pratima Gurung** (`EMP-1004`) |
| **Employee** | Sabina Tamang (`EMP-1010`) | `sabina.tamang@portal.demo` | `EmployeePass#2026!` | Reports to **Pratima Gurung** (`EMP-1004`) |
| **Manager 1** | Suman Karki (`EMP-1003`) | `suman.karki@portal.demo` | `ManagerOne#2026!` | Manages `EMP-1005`, `EMP-1006`, `EMP-1007` |
| **Manager 2** | Pratima Gurung (`EMP-1004`) | `pratima.gurung@portal.demo` | `ManagerTwo#2026!` | Manages `EMP-1008`, `EMP-1009`, `EMP-1010` |
| **HR Admin** | Bishnu Maya KC (`EMP-1002`) | `hradmin@portal.demo` | `HrAdminPortal#2026!` | Read-only employee directory & organization leave overview |
| **System Admin** | Rameshwar Thapa (`EMP-1001`) | `sysadmin@portal.demo` | `AdminPortal#2026!` | User/role provisioning, leave types reference, security audit log (**no** access to payslips or leave requests) |

---

## 4. Running Automated Tests

The test suite (`server/tests/unit.test.js`, `server/tests/api.test.js`, `server/tests/security.test.js`) runs deterministically using an in-memory transactional database adapter pre-seeded with the exact schema and seed data, so tests can run both offline in CI and locally without mutating your live Supabase database:

```bash
npm test
```

See [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) for the complete mapping of all 30 automated tests to Acceptance Criteria `AC-01` through `AC-05` and the 12 negative security test categories.

---

## 5. Repository Structure

```text
employee-self-service-portal/
├── client/                         # React (Vite) + React Router Frontend
│   ├── .env.example
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/client.js           # Fetch wrapper (credentials: 'include', X-CSRF-Token)
│       ├── components/AppShell.jsx # Role-aware sidebar, breadcrumbs, badges, modals
│       ├── context/AuthContext.jsx # Session & in-memory CSRF state
│       ├── pages/                  # Login, Dashboard, Profile, Leaves, TeamApprovals, Payslips, HR, Admin
│       └── styles/index.css        # Restrained enterprise HR CSS design system
├── server/                         # Node.js + Express Backend API
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── src/
│   │   ├── config/index.js         # Startup env validator & safe defaults
│   │   ├── controllers/index.js    # Thin HTTP controllers
│   │   ├── middleware/security.js  # CSP, CORS, rate limit, session auth, CSRF, central authorize policy
│   │   ├── repositories/db.js      # Supabase service-role client & RPC repository layer
│   │   ├── routes/openapi.js       # OpenAPI 3.0.3 specification
│   │   ├── services/index.js       # Domain business logic & audit orchestration
│   │   ├── utils/                  # crypto.js (bcrypt/SHA-256/timingSafeEqual), pdf.js, logger.js, errors.js
│   │   ├── validators/schemas.js   # Strict body, query, param, and XSS validators
│   │   ├── app.js                  # Express application & route definitions
│   │   └── index.js                # Server entry point
│   └── tests/                      # Unit, API (AC-01..AC-05), and Negative Security test suites
├── supabase/
│   ├── 01_schema.sql               # Extensions, tables, constraints, RLS, PL/pgSQL RPCs
│   ├── 02_seed.sql                 # Fictional Nepali demo data with pgcrypto bcrypt cost 12
│   └── 99_reset.sql                # Clean development reset script
├── docs/
│   ├── ARCHITECTURE.md             # Context, trust boundaries, 6 key decisions, Mermaid ER diagram
│   ├── THREAT_MODEL.md             # STRIDE threat matrix & encryption assumptions
│   ├── DEPENDENCIES.md             # Pinned dependency inventory & vulnerability scan summary
│   ├── TEST_REPORT.md              # Acceptance criteria & negative security test report
│   ├── openapi.json                # Exported OpenAPI 3.0.3 JSON spec
│   └── api-collection/
│       └── postman_collection.json # Postman v2.1 API test collection
├── scripts/dev.mjs                 # Concurrent dev launcher for server + client
├── SECURITY_CHECKLIST.md           # Two-pass security audit & critical-failure verification
└── README.md
```

---

## 6. Documented Assumptions & Timezone Policy

1. **Timezone Policy**: All database timestamps (`TIMESTAMPTZ`) are stored in **UTC** (`SET TIME ZONE 'UTC'`). Leave request `start_date` and `end_date` are stored as calendar `DATE` values (`YYYY-MM-DD`) and formatted in the user's locale in the UI (`12 Mar 2026`).
2. **Inclusive Calendar Day Calculation**: Leave duration (`total_days`) is calculated inclusively as `(end_date - start_date) + 1` within the same calendar year (`chk_leave_requests_total_days`).
3. **Separation of Duties**: `SYSTEM_ADMIN` manages user accounts, role assignments, leave type reference data, and security audit logs, and is explicitly denied access to `/api/payslips*` and `/api/leaves*` endpoints by default. `HR_ADMIN` has read-only access to the employee directory and organization leave overview. Only a direct reporting `MANAGER` can approve or reject a `PENDING` leave request.

---

## 7. Troubleshooting

- **`CONFIGURATION ERROR: Missing or invalid required environment variable(s) in server/.env`**:
  Open `server/.env` and verify both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are filled in with no surrounding spaces.
- **`GET /api/health` returns 500**:
  Verify that you executed `supabase/01_schema.sql` and `supabase/02_seed.sql` in your Supabase SQL Editor and that you pasted the **`service_role`** key (not the `anon` key) into `SUPABASE_SERVICE_ROLE_KEY`.
- **`403 Forbidden (CSRF_INVALID)` when testing with Postman/curl**:
  Copy the `csrfToken` returned in the `POST /api/auth/login` JSON response body and pass it in the `X-CSRF-Token` request header on all `POST`, `PATCH`, `PUT`, and `DELETE` calls. (The Postman collection in `docs/api-collection/postman_collection.json` captures and attaches `X-CSRF-Token` automatically.)
