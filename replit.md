# DataFlow - Data Connector Platform

## Project Overview

A React + Vite single-page application for managing data pipelines and connections. Runs on Replit with a local Express.js API backend and PostgreSQL database.

## Tech Stack

- **Framework**: React 18 with Vite 6
- **Styling**: Tailwind CSS + Radix UI components (shadcn/ui), slate-based dark mode via CSS variables
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
  utils/                 - Shared utilities
server/
  middleware.js          - Express API middleware (used in Vite dev server)
  production.js          - Standalone production server (serves API + static files)
  db.js                  - PostgreSQL connection pool and table initialization
```

## Database Entities (12 tables, JSONB storage)

Pipeline, Connection, PipelineRun, ActivityLog, AuditLog, IngestionJob, AirflowDAG, CustomFunction, ConnectionProfile, ConnectionPrerequisite, PipelineVersion, DataCatalogEntry

## Architecture

- **Development**: Vite dev server on port 5000 with Express middleware plugin handling `/api/*` routes
- **Production**: Express server on port 5000 serving both API routes and static built files from `dist/`
- **Configuration**: `config/` directory with separate files for dev and prod, auto-selected by NODE_ENV
- **SDK Adapter**: `src/lib/local-sdk.js` provides a client with entity CRUD, auth, and function invocation via REST calls to the local API
- **Auth**: Mock local user (admin role) - no external auth required
- **Security**: SQL injection prevention via `sanitizeFieldName()` for JSONB field names and `entityNameToTable()` allowlist validation
- **Entity Name Mapping**: CamelCase entity names to snake_case table names (handles acronyms: AirflowDAG to airflow_dag)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `DB_SSL` - Database SSL (`false` to disable, default: enabled)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (`development` or `production`)
- `LOG_LEVEL` - Logging level (default: debug in dev, warn in prod)
- `CORS_ORIGIN` - Allowed CORS origin (default: *)
- `AUTH_USER_EMAIL` / `AUTH_USER_NAME` / `AUTH_USER_ROLE` - Mock user config

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
