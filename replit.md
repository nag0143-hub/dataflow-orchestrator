# DataFlow - Data Connector Platform

## Project Overview

A React + Vite single-page application for managing data pipelines and connections, with a local Express.js API backend and PostgreSQL database.

## Tech Stack

- **Framework**: React 18 with Vite 6
- **Styling**: Tailwind CSS + Radix UI components (shadcn/ui), US Bank blue (#0060AF) accent color, collapsible dark sidebar nav, CSS variable-based light/dark mode
- **Routing**: React Router DOM v6
- **State/Data**: TanStack React Query
- **Backend**: Express.js (embedded in Vite dev server via plugin, standalone for production)
- **Database**: PostgreSQL with JSONB storage for all entities
- **Language**: JavaScript (JSX/ESM)

## Project Structure

```
config/
  index.js               - Config loader (selects by NODE_ENV)
  development.js         - Development configuration
  production.js          - Production configuration
src/
  api/client.js          - SDK client instance
  components/            - Reusable UI components and shadcn/ui components
  hooks/                 - Custom React hooks
  lib/
    local-sdk.js         - Local SDK adapter (entity CRUD, auth, functions)
    AuthContext.jsx       - Authentication context (local mock user)
    NavigationTracker.jsx - Page navigation logging
    app-params.js        - App parameter management
  pages/                 - Route-level page components
  utils/
    toYaml.js            - Shared YAML serializer (used by JobSpecExport, JobSpecTabPreview, DeployTabContent, GitCheckinDialog)
server/
  middleware.js          - Express API middleware (used in Vite dev server)
  production.js          - Standalone production server (serves API + static files)
  db.js                  - PostgreSQL connection pool and table initialization
  test-connection.js     - Real database connection tester (PostgreSQL, MySQL, SQL Server, MongoDB, Oracle, file paths)
  introspect-schema.js   - Live database schema introspection (PostgreSQL, MySQL, SQL Server) via information_schema
  airflow-proxy.js       - Airflow REST API proxy (DAGs, runs, task instances, logs, triggers)
  spec-validator.js      - YAML/JSON pipeline spec validation engine (structural + DB connection checks)
```

## Database Entities (13 tables, JSONB storage)

Pipeline, Connection, PipelineRun, ActivityLog, AuditLog, IngestionJob, AirflowDAG, CustomFunction, ConnectionProfile, ConnectionPrerequisite, PipelineVersion, DataCatalogEntry, DagTemplate

## Architecture

- **Development**: Vite dev server on port 5000 with Express middleware plugin handling `/api/*` routes
- **Production**: Express server on port 5000 serving both API routes and static built files from `dist/`
- **Configuration**: `config/` directory with separate files for dev and prod, auto-selected by NODE_ENV
- **SDK Adapter**: `src/lib/local-sdk.js` provides a client with entity CRUD, auth, and function invocation via REST calls to the local API
- **Auth**: Mock local user (admin role) - no external auth required
- **Security**: SQL injection prevention via `sanitizeFieldName()` for JSONB field names and `entityNameToTable()` allowlist validation
- **Entity Name Mapping**: CamelCase entity names to snake_case table names (handles acronyms: AirflowDAG to airflow_dag)

## Performance & Security (Production Server)

- **Compression**: `compression` middleware (gzip/brotli responses)
- **Security Headers**: `helmet` middleware (CSP disabled for SPA compatibility)
- **Rate Limiting**: `express-rate-limit` — 1000 reads / 200 writes per 15 min per IP (configurable via `RATE_LIMIT_MAX`, `RATE_LIMIT_WRITE_MAX`)
- **DB Indexes**: Auto-created on startup — B-tree on created_date/updated_date, GIN on JSONB data, expression indexes on status/name for high-query tables, functional indexes on pipeline_id/connection_id/category/log_type/platform/connection_type, pg_trgm trigram indexes on name fields for ILIKE pattern matching
- **Full-Text Search**: Targeted `to_tsvector` / `plainto_tsquery` (GIN-indexed) on specific fields (name+description for pipeline/connection, message+category for activity_log) instead of noisy `data::text`
- **Keyset Pagination**: `GET /api/entities/:name?cursor=<id>&limit=N` returns `{ items, nextCursor, hasMore }` for efficient deep pagination (backward compatible — omitting cursor returns flat array)
- **Batch Create**: `POST /api/entities/:name/batch` accepts `{ items: [...] }` for multi-row INSERT in a single transaction (limit 100)
- **Admin Endpoints**: `POST /api/admin/purge-logs` (activity log retention), `GET /api/admin/data-model` (live schema introspection)
- **Admin Mode**: Sidebar toggle reveals admin nav section (Data Model, Audit Trail, Activity Logs, Airflow, Custom Functions). Persisted in localStorage.
- **Health Check**: `GET /api/health` returns status, uptime, database connectivity, timestamp (503 if DB down)
- **Code Splitting**: All pages lazy-loaded via `React.lazy()` + `Suspense`
- **Connection Testing**: Real database driver tests via `POST /api/test-connection` using pg, mysql2, mssql, mongodb packages
- **Schema Introspection**: `POST /api/introspect-schema` — live database schema/table/column discovery from saved connections (PostgreSQL, MySQL, SQL Server); `ObjectSelector` auto-fetches when `connectionId` prop provided
- **Spec Validation**: `POST /api/validate-spec` — validates pipeline YAML/JSON specs (required fields, cron syntax, dataset schemas) and verifies connection IDs exist in database; returns `{ valid, errors[], warnings[], checked_at }`
- **Pipeline Artifacts**: Two generated artifacts per pipeline — Airflow DAG (dag-factory YAML) and Pipeline Spec (YAML/JSON). Git commit triggers CI/CD for automated deployment.
- **GitHub Integration**: Commit & Deploy dialog commits artifacts directly to `nag0143-hub/dataflow-platform` via GitHub API (Octokit). `POST /api/github/commit` creates tree+commit on specified branch; `GET /api/github/status` checks connection. OAuth managed by Replit GitHub connector. Files: `server/github.js`.
- **GitLab Integration (LDAP)**: Production deployment target. `POST /api/gitlab/commit` authenticates via GitLab OAuth password grant (LDAP credentials entered at commit time, never stored), then commits via GitLab Commits API. `POST /api/gitlab/status` verifies LDAP auth + project access. `GET /api/gitlab/config` returns configured URL/project. Env vars: `GITLAB_URL` (e.g. `https://gitlab.company.com`), `GITLAB_PROJECT` (e.g. `namespace/project-name`). Files: `server/gitlab.js`. Frontend: GitHub/GitLab toggle in Commit & Deploy dialog with LDAP username/password fields and authenticate button.
- **Airflow DAG Generation** (template-based, dag-factory format): Users select from pre-built YAML templates (`DagTemplates.js`) — values auto-filled from pipeline spec. Built-in templates: "Flat File — Landing to Raw" (sensor → ingest → optional transform), "Flat File — Simple Ingest" (no sensor), "Database — Extract to DWH" (SparkSubmit per dataset). Template selection stored in `dag_template_id` on pipeline formData. Configurable DAG callable base path (default `/data/dags/`). Schedule mapped from form: @once/@daily/@weekly/cron etc.
- **Pipeline Wizard Tabs**: Basics → Datasets → Schedule → [Advanced] → Review → Deploy. "Review" tab shows template selection + generated YAML preview + validation. "Deploy" tab shows artifact cards + git provider (GitHub/GitLab) settings + branch/commit message + deploy button. Deploy flow: save pipeline first, then commit artifacts to git. Components: `JobFormDialog.jsx` (wizard), `JobSpecTabPreview.jsx` (review), `DeployTabContent.jsx` (deploy).
- **Vault Credentials (HashiCorp)**: Connections support `vault_credentials` auth method — AppRole authentication to HashiCorp Vault (KV v2). Vault config stored per connection: URL, namespace, role_id, secret_id, mount_point, secret_path. Credentials resolved server-side at test/connect time (`server/vault.js`). UI includes "Test Vault Connection" button to verify AppRole access. `POST /api/test-vault` endpoint for standalone vault testing.
- **No Execution Operator section** — removed from schedule settings (auto-detect logic handled by deployment pipeline)
- **No Data Lineage** — lineage pages, components, and spec generators fully removed
- **Supported Drivers**: PostgreSQL (pg), MySQL (mysql2), SQL Server (mssql), MongoDB (mongodb), Oracle (oracledb — requires Instant Client), file system paths
- **Airflow Integration**: Backend proxy (`/api/airflow/*`) for secure Airflow REST API calls — supports DAG listing, run history, task instances, log retrieval, DAG triggering, pause/unpause. Credentials never exposed to frontend. Orchestration data displayed natively on Dashboard (summary) and Pipelines (full detail) pages via `OrchestrationPanel` component — no separate Airflow tab.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `DB_SSL` - Database SSL (`false` to disable, default: enabled)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (`development` or `production`)
- `LOG_LEVEL` - Logging level (default: debug in dev, warn in prod)
- `CORS_ORIGIN` - Allowed CORS origin (default: *)
- `AUTH_USER_EMAIL` / `AUTH_USER_NAME` / `AUTH_USER_ROLE` - Mock user config
- `RATE_LIMIT_MAX` - API read rate limit per 15 min window (default: 1000)
- `RATE_LIMIT_WRITE_MAX` - API write rate limit per 15 min window (default: 200)

## Running the App

```bash
npm run dev       # Development (Vite + Express middleware)
npm run build     # Build frontend for production
npm start         # Production server (NODE_ENV=production)
```

Runs on `http://0.0.0.0:5000`

## Deployment

Configured as autoscale:
- Build: `npm run build`
- Run: `npm start`
