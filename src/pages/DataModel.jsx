import { useState } from "react";
import { Database, Table2, Link2, ChevronDown, ChevronRight, Key, Hash, Type, Calendar, ToggleLeft, List, Code2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DDL = `-- ============================================================
-- DataFlow Platform — PostgreSQL DDL
-- Generated: ${new Date().toISOString().slice(0, 10)}
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------

CREATE TYPE connection_type_enum    AS ENUM ('source', 'target');
CREATE TYPE platform_enum           AS ENUM ('sql_server','oracle','postgresql','mysql','mongodb','adls2','s3','flat_file_delimited','flat_file_fixed_width','cobol_ebcdic','sftp','nas','local_fs');
CREATE TYPE auth_method_enum        AS ENUM ('password','key','connection_string','managed_identity','sftp_key','none');
CREATE TYPE connection_status_enum  AS ENUM ('active','inactive','error','pending_setup');
CREATE TYPE schedule_type_enum      AS ENUM ('manual','hourly','daily','weekly','custom');
CREATE TYPE job_status_enum         AS ENUM ('idle','running','completed','failed','paused');
CREATE TYPE run_status_enum         AS ENUM ('running','completed','failed','cancelled','retrying');
CREATE TYPE triggered_by_enum       AS ENUM ('manual','schedule','retry');
CREATE TYPE log_type_enum           AS ENUM ('info','warning','error','success');
CREATE TYPE log_category_enum       AS ENUM ('connection','job','system','authentication');
CREATE TYPE change_type_enum        AS ENUM ('created','updated','paused','resumed','deleted');
CREATE TYPE prereq_type_enum        AS ENUM ('nsg_rule','egress_rule','nas_path','dba_access','firewall_rule','service_account','vpn_tunnel','other');
CREATE TYPE assigned_team_enum      AS ENUM ('networking','dba','security','storage','platform','other');
CREATE TYPE prereq_status_enum      AS ENUM ('pending','in_progress','completed','rejected','not_required');
CREATE TYPE priority_enum           AS ENUM ('high','medium','low');

-- ------------------------------------------------------------
-- CONNECTION
-- ------------------------------------------------------------

CREATE TABLE connection (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      TEXT NOT NULL,

    name            TEXT NOT NULL,
    source_system_name TEXT,
    description     TEXT,
    car_id          TEXT,
    connection_type connection_type_enum NOT NULL,
    platform        platform_enum NOT NULL,
    host            TEXT,
    port            INTEGER,
    database        TEXT,
    username        TEXT,
    auth_method     auth_method_enum DEFAULT 'password',
    region          TEXT,
    bucket_container TEXT,
    file_config     JSONB,          -- delimiter, encoding, has_header, quote_char, …
    status          connection_status_enum DEFAULT 'active',
    last_tested     TIMESTAMPTZ,
    notes           TEXT
);

CREATE INDEX idx_connection_status   ON connection(status);
CREATE INDEX idx_connection_platform ON connection(platform);

-- ------------------------------------------------------------
-- INGESTION JOB
-- ------------------------------------------------------------

CREATE TABLE ingestion_job (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           TEXT NOT NULL,

    name                 TEXT NOT NULL,
    description          TEXT,
    source_connection_id UUID NOT NULL REFERENCES connection(id) ON DELETE RESTRICT,
    target_connection_id UUID NOT NULL REFERENCES connection(id) ON DELETE RESTRICT,
    source_path          TEXT,
    source_format        TEXT,
    selected_objects     JSONB,      -- [{schema, table, filter_query, target_path, incremental_column, last_value}]
    schedule_type        schedule_type_enum DEFAULT 'manual',
    cron_expression      TEXT,
    status               job_status_enum DEFAULT 'idle',
    retry_config         JSONB,      -- {max_retries, retry_delay_seconds, exponential_backoff}
    use_custom_calendar  BOOLEAN DEFAULT false,
    include_calendar_id  TEXT,
    exclude_calendar_id  TEXT,
    column_mappings      JSONB,      -- {"schema.table": [{source, target, transformation}]}
    dq_rules             JSONB,      -- {"schema.table": {dataset_rules: [], column_rules: []}}
    last_run             TIMESTAMPTZ,
    next_run             TIMESTAMPTZ,
    total_runs           INTEGER DEFAULT 0,
    successful_runs      INTEGER DEFAULT 0,
    failed_runs          INTEGER DEFAULT 0
);

CREATE INDEX idx_ingestion_job_status ON ingestion_job(status);
CREATE INDEX idx_ingestion_job_source ON ingestion_job(source_connection_id);
CREATE INDEX idx_ingestion_job_target ON ingestion_job(target_connection_id);

-- ------------------------------------------------------------
-- JOB RUN
-- ------------------------------------------------------------

CREATE TABLE job_run (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date      TIMESTAMPTZ NOT NULL DEFAULT now(),

    job_id            UUID NOT NULL REFERENCES ingestion_job(id) ON DELETE CASCADE,
    run_number        INTEGER,
    status            run_status_enum NOT NULL,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    duration_seconds  NUMERIC,
    rows_processed    BIGINT DEFAULT 0,
    bytes_transferred BIGINT DEFAULT 0,
    objects_completed TEXT[],
    objects_failed    TEXT[],
    retry_count       INTEGER DEFAULT 0,
    error_message     TEXT,
    triggered_by      triggered_by_enum DEFAULT 'manual'
);

CREATE INDEX idx_job_run_job_id ON job_run(job_id);
CREATE INDEX idx_job_run_status ON job_run(status);
CREATE INDEX idx_job_run_job_status ON job_run(job_id, status);
CREATE INDEX idx_job_run_triggered ON job_run(triggered_by);
CREATE INDEX idx_job_run_started ON job_run(started_at DESC);

-- ------------------------------------------------------------
-- ACTIVITY LOG
-- ------------------------------------------------------------

CREATE TABLE activity_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date  TIMESTAMPTZ NOT NULL DEFAULT now(),

    log_type      log_type_enum NOT NULL,
    category      log_category_enum NOT NULL,
    message       TEXT NOT NULL,
    job_id        UUID REFERENCES ingestion_job(id) ON DELETE SET NULL,
    run_id        UUID REFERENCES job_run(id) ON DELETE SET NULL,
    connection_id UUID REFERENCES connection(id) ON DELETE SET NULL,
    object_name   TEXT,
    details       JSONB,
    stack_trace   TEXT
);

CREATE INDEX idx_activity_log_category ON activity_log(category);
CREATE INDEX idx_activity_log_log_type ON activity_log(log_type);
CREATE INDEX idx_activity_log_job      ON activity_log(job_id);
CREATE INDEX idx_activity_log_conn     ON activity_log(connection_id);
CREATE INDEX idx_activity_log_created  ON activity_log(created_date DESC);

-- ------------------------------------------------------------
-- PIPELINE VERSION
-- ------------------------------------------------------------

CREATE TABLE pipeline_version (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date   TIMESTAMPTZ NOT NULL DEFAULT now(),

    job_id         UUID NOT NULL REFERENCES ingestion_job(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    label          TEXT,
    commit_message TEXT,
    snapshot       JSONB NOT NULL,  -- full copy of ingestion_job at this point in time
    changed_by     TEXT,
    change_type    change_type_enum NOT NULL,

    UNIQUE (job_id, version_number)
);

CREATE INDEX idx_pipeline_version_job ON pipeline_version(job_id, version_number DESC);

-- ------------------------------------------------------------
-- CONNECTION PREREQUISITE
-- ------------------------------------------------------------

CREATE TABLE connection_prerequisite (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date     TIMESTAMPTZ NOT NULL DEFAULT now(),

    connection_id    UUID NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    prereq_type      prereq_type_enum NOT NULL,
    title            TEXT NOT NULL,
    description      TEXT,
    assigned_team    assigned_team_enum NOT NULL,
    status           prereq_status_enum NOT NULL DEFAULT 'pending',
    priority         priority_enum DEFAULT 'medium',
    requested_by     TEXT,
    ticket_reference TEXT,
    due_date         TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    notes            TEXT
);

CREATE INDEX idx_prereq_connection ON connection_prerequisite(connection_id);
CREATE INDEX idx_prereq_status     ON connection_prerequisite(status);
CREATE INDEX idx_prereq_type       ON connection_prerequisite(prereq_type);

-- JSONB indexes for common query patterns
CREATE INDEX idx_connection_file_config ON connection USING GIN(file_config);
CREATE INDEX idx_job_selected_objects ON ingestion_job USING GIN(selected_objects);
CREATE INDEX idx_job_column_mappings ON ingestion_job USING GIN(column_mappings);
CREATE INDEX idx_job_dq_rules ON ingestion_job USING GIN(dq_rules);
CREATE INDEX idx_pipeline_snapshot ON pipeline_version USING GIN(snapshot);

-- ------------------------------------------------------------
-- CONNECTION PROFILE  (reusable template)
-- ------------------------------------------------------------

CREATE TABLE connection_profile (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       TEXT NOT NULL,

    name             TEXT NOT NULL,
    description      TEXT,
    connection_type  connection_type_enum,
    platform         platform_enum NOT NULL,
    host             TEXT,
    port             INTEGER,
    database         TEXT,
    username         TEXT,
    auth_method      auth_method_enum,
    region           TEXT,
    bucket_container TEXT,
    file_config      JSONB,
    notes            TEXT
);

-- ------------------------------------------------------------
-- updated_date trigger (apply to tables that have it)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_connection_updated
  BEFORE UPDATE ON connection
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();

CREATE TRIGGER trg_ingestion_job_updated
  BEFORE UPDATE ON ingestion_job
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();

CREATE TRIGGER trg_connection_prerequisite_updated
  BEFORE UPDATE ON connection_prerequisite
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();

CREATE TRIGGER trg_connection_profile_updated
  BEFORE UPDATE ON connection_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_date();
`;

const typeIcon = (type) => {
  if (type === "string") return <Type className="w-3 h-3 text-emerald-500" />;
  if (type === "number") return <Hash className="w-3 h-3 text-blue-500" />;
  if (type === "boolean") return <ToggleLeft className="w-3 h-3 text-violet-500" />;
  if (type === "array") return <List className="w-3 h-3 text-amber-500" />;
  if (type === "object") return <Database className="w-3 h-3 text-rose-500" />;
  if (type === "date-time") return <Calendar className="w-3 h-3 text-cyan-500" />;
  return <Type className="w-3 h-3 text-slate-400" />;
};

const typeColor = (type) => {
  if (type === "string") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (type === "number") return "text-blue-600 bg-blue-50 border-blue-200";
  if (type === "boolean") return "text-violet-600 bg-violet-50 border-violet-200";
  if (type === "array") return "text-amber-600 bg-amber-50 border-amber-200";
  if (type === "object") return "text-rose-600 bg-rose-50 border-rose-200";
  if (type === "date-time") return "text-cyan-600 bg-cyan-50 border-cyan-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
};

const entities = [
  {
    name: "Connection",
    color: "from-blue-500 to-indigo-600",
    description: "Represents a data source or target system with its credentials and configuration.",
    fields: [
      { name: "id", type: "string", required: true, note: "Auto-generated" },
      { name: "created_date", type: "date-time", required: true, note: "Auto-generated" },
      { name: "created_by", type: "string", required: true, note: "User email (auto)" },
      { name: "name", type: "string", required: true, note: "Connection display name" },
      { name: "source_system_name", type: "string", required: false, note: "Name of the source system" },
      { name: "description", type: "string", required: false, note: "Connection description" },
      { name: "car_id", type: "string", required: false, note: "CarID identifier" },
      { name: "connection_type", type: "string", required: true, note: '"source" | "target"' },
      { name: "platform", type: "string", required: true, note: 'sql_server, oracle, postgresql, mysql, mongodb, adls2, s3, sftp, nas, ...' },
      { name: "host", type: "string", required: false, note: "Hostname, IP, or URL" },
      { name: "port", type: "number", required: false, note: "TCP port" },
      { name: "database", type: "string", required: false, note: "Database / container name" },
      { name: "username", type: "string", required: false, note: "Username or access key ID" },
      { name: "auth_method", type: "string", required: false, note: 'password | key | sftp_key | connection_string | managed_identity | none' },
      { name: "region", type: "string", required: false, note: "Cloud region (e.g. eastus, us-east-1)" },
      { name: "bucket_container", type: "string", required: false, note: "S3 bucket or ADLS container" },
      { name: "file_config", type: "object", required: false, note: "delimiter, encoding, has_header, quote_char, ..." },
      { name: "status", type: "string", required: false, note: 'active | inactive | error | pending_setup' },
      { name: "last_tested", type: "date-time", required: false, note: "Timestamp of last connection test" },
      { name: "notes", type: "string", required: false, note: "Free-text notes" },
    ]
  },
  {
    name: "IngestionJob",
    color: "from-emerald-500 to-teal-600",
    description: "Defines a data transfer pipeline from a source to a target, including schedule and retry config.",
    fields: [
      { name: "id", type: "string", required: true, note: "Auto-generated" },
      { name: "created_date", type: "date-time", required: true, note: "Auto-generated" },
      { name: "created_by", type: "string", required: true, note: "User email (auto)" },
      { name: "name", type: "string", required: true, note: "Job display name" },
      { name: "description", type: "string", required: false, note: "Optional description" },
      { name: "source_connection_id", type: "string", required: true, note: "→ Connection.id (source)" },
      { name: "target_connection_id", type: "string", required: true, note: "→ Connection.id (target)" },
      { name: "source_path", type: "string", required: false, note: "Path for flat file source" },
      { name: "source_format", type: "string", required: false, note: "Format for flat file source (e.g. CSV, delimited, fixed-width)" },
      { name: "selected_objects", type: "array", required: false, note: "Array of {schema, table, filter_query, target_path, incremental_column}" },
      { name: "schedule_type", type: "string", required: false, note: 'manual | hourly | daily | weekly | custom' },
      { name: "cron_expression", type: "string", required: false, note: "Used when schedule_type = custom" },
      { name: "status", type: "string", required: false, note: 'idle | running | completed | failed | paused' },
      { name: "retry_config", type: "object", required: false, note: "{max_retries, retry_delay_seconds, exponential_backoff}" },
      { name: "last_run", type: "date-time", required: false, note: "Timestamp of last execution" },
      { name: "next_run", type: "date-time", required: false, note: "Timestamp of next scheduled run" },
      { name: "use_custom_calendar", type: "boolean", required: false, note: "Enable include/exclude calendar rules" },
      { name: "include_calendar_id", type: "string", required: false, note: "Calendar ID — run ONLY on these dates" },
      { name: "exclude_calendar_id", type: "string", required: false, note: "Calendar ID — SKIP runs on these dates" },
      { name: "column_mappings", type: "object", required: false, note: 'Keyed by "schema.table": [{source, target, transformation}]' },
      { name: "dq_rules", type: "object", required: false, note: 'Keyed by "schema.table": {dataset_rules: [], column_rules: []}' },
      { name: "total_runs", type: "number", required: false, note: "Cumulative run count" },
      { name: "successful_runs", type: "number", required: false, note: "Cumulative success count" },
      { name: "failed_runs", type: "number", required: false, note: "Cumulative failure count" },
    ]
  },
  {
    name: "JobRun",
    color: "from-amber-500 to-orange-600",
    description: "A single execution instance of an IngestionJob, capturing metrics and outcomes.",
    fields: [
      { name: "id", type: "string", required: true, note: "Auto-generated" },
      { name: "created_date", type: "date-time", required: true, note: "Auto-generated" },
      { name: "job_id", type: "string", required: true, note: "→ IngestionJob.id" },
      { name: "run_number", type: "number", required: false, note: "Sequential run counter per job" },
      { name: "status", type: "string", required: true, note: 'running | completed | failed | cancelled | retrying' },
      { name: "started_at", type: "date-time", required: false, note: "When execution began" },
      { name: "completed_at", type: "date-time", required: false, note: "When execution finished" },
      { name: "duration_seconds", type: "number", required: false, note: "Total execution time" },
      { name: "rows_processed", type: "number", required: false, note: "Total rows transferred" },
      { name: "bytes_transferred", type: "number", required: false, note: "Total bytes moved" },
      { name: "objects_completed", type: "array", required: false, note: "List of successfully loaded objects" },
      { name: "objects_failed", type: "array", required: false, note: "List of failed objects" },
      { name: "retry_count", type: "number", required: false, note: "Number of retries attempted" },
      { name: "error_message", type: "string", required: false, note: "Error description if failed" },
      { name: "triggered_by", type: "string", required: false, note: 'manual | schedule | retry' },
    ]
  },
  {
    name: "ActivityLog",
    color: "from-violet-500 to-purple-600",
    description: "Audit trail for all system events across connections, jobs, and authentication.",
    fields: [
      { name: "id", type: "string", required: true, note: "Auto-generated" },
      { name: "created_date", type: "date-time", required: true, note: "Auto-generated" },
      { name: "log_type", type: "string", required: true, note: 'info | warning | error | success' },
      { name: "category", type: "string", required: true, note: 'connection | job | system | authentication' },
      { name: "message", type: "string", required: true, note: "Human-readable description" },
      { name: "job_id", type: "string", required: false, note: "→ IngestionJob.id (if job-related)" },
      { name: "run_id", type: "string", required: false, note: "→ JobRun.id (if run-related)" },
      { name: "connection_id", type: "string", required: false, note: "→ Connection.id (if conn-related)" },
      { name: "object_name", type: "string", required: false, note: "Specific object involved" },
      { name: "details", type: "object", required: false, note: "Arbitrary JSON metadata" },
      { name: "stack_trace", type: "string", required: false, note: "Error stack trace if applicable" },
    ]
  },
  {
    name: "PipelineVersion",
    color: "from-rose-500 to-pink-600",
    description: "Version snapshot of an IngestionJob for audit and rollback purposes.",
    fields: [
      { name: "id", type: "string", required: true, note: "Auto-generated" },
      { name: "created_date", type: "date-time", required: true, note: "Auto-generated" },
      { name: "job_id", type: "string", required: true, note: "→ IngestionJob.id" },
      { name: "version_number", type: "number", required: true, note: "Monotonically increasing" },
      { name: "label", type: "string", required: false, note: 'e.g. "v3", "Restored from v1"' },
      { name: "commit_message", type: "string", required: false, note: "User-provided change description" },
      { name: "snapshot", type: "object", required: true, note: "Full copy of IngestionJob fields at that point in time" },
      { name: "changed_by", type: "string", required: false, note: "User email who made the change" },
      { name: "change_type", type: "string", required: false, note: 'created | updated | paused | resumed | deleted' },
    ]
  },
  {
    name: "ConnectionPrerequisite",
    color: "from-teal-500 to-cyan-600",
    description: "Tracks infra/ops tasks (firewall rules, VPN tunnels, DBA access) required before a connection can be used.",
    fields: [
      { name: "id", type: "string", required: true, note: "Auto-generated" },
      { name: "created_date", type: "date-time", required: true, note: "Auto-generated" },
      { name: "connection_id", type: "string", required: true, note: "→ Connection.id" },
      { name: "prereq_type", type: "string", required: true, note: 'nsg_rule | egress_rule | nas_path | dba_access | firewall_rule | vpn_tunnel | ...' },
      { name: "title", type: "string", required: true, note: "Short task title" },
      { name: "description", type: "string", required: false, note: "Detailed notes / ticket instructions" },
      { name: "assigned_team", type: "string", required: true, note: 'networking | dba | security | storage | platform | other' },
      { name: "status", type: "string", required: true, note: 'pending | in_progress | completed | rejected | not_required' },
      { name: "priority", type: "string", required: false, note: 'high | medium | low' },
      { name: "requested_by", type: "string", required: false, note: "Requester name" },
      { name: "ticket_reference", type: "string", required: false, note: "JIRA / ServiceNow ticket ID" },
      { name: "due_date", type: "date-time", required: false, note: "Target completion date" },
      { name: "completed_at", type: "date-time", required: false, note: "Actual completion date" },
      { name: "notes", type: "string", required: false, note: "Resolution notes" },
    ]
  },
];

const relationships = [
  { from: "IngestionJob", to: "Connection", label: "source_connection_id", type: "many-to-one" },
  { from: "IngestionJob", to: "Connection", label: "target_connection_id", type: "many-to-one" },
  { from: "JobRun", to: "IngestionJob", label: "job_id", type: "many-to-one" },
  { from: "ActivityLog", to: "IngestionJob", label: "job_id (optional)", type: "many-to-one" },
  { from: "ActivityLog", to: "JobRun", label: "run_id (optional)", type: "many-to-one" },
  { from: "ActivityLog", to: "Connection", label: "connection_id (optional)", type: "many-to-one" },
  { from: "PipelineVersion", to: "IngestionJob", label: "job_id", type: "many-to-one" },
  { from: "ConnectionPrerequisite", to: "Connection", label: "connection_id", type: "many-to-one" },
];

function EntityCard({ entity }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all">
      {/* Header */}
      <div className={`bg-gradient-to-r ${entity.color} p-4`}>
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-white/80" />
          <span className="text-white font-bold text-base">{entity.name}</span>
        </div>
        <p className="text-white/70 text-xs leading-relaxed">{entity.description}</p>
      </div>

      {/* Fields */}
      <div>
        <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
          <span>{entity.fields.length} fields</span>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="border-t border-slate-100 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Field</th>
                  <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-slate-500 dark:text-slate-400 font-medium hidden sm:table-cell">Notes</th>
                  <th className="text-center px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">Req</th>
                </tr>
              </thead>
              <tbody>
                {entity.fields.map((field, i) => (
                  <tr key={i} className={cn(
                    "border-t border-slate-50 dark:border-slate-700/50",
                    i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/50 dark:bg-slate-700/20"
                  )}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {field.name === "id" && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                        {field.name.endsWith("_id") && field.name !== "id" && <Link2 className="w-3 h-3 text-blue-400 shrink-0" />}
                        <span className={cn("font-mono", field.required && field.name !== "id" && field.name !== "created_date" && field.name !== "created_by" ? "text-slate-900 dark:text-slate-100 font-semibold" : "text-slate-500 dark:text-slate-400")}>
                          {field.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium", typeColor(field.type))}>
                        {typeIcon(field.type)}
                        {field.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 hidden sm:table-cell max-w-xs truncate">{field.note}</td>
                    <td className="px-4 py-2 text-center">
                      {field.required ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DDLModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(DDL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              PostgreSQL DDL — DataFlow Platform
            </DialogTitle>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 text-xs mr-6">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </DialogHeader>
        <pre className="overflow-auto flex-1 text-xs font-mono bg-slate-950 text-slate-200 rounded-xl p-5 leading-relaxed">
          {DDL}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

export default function DataModel() {
  const [showRel, setShowRel] = useState(true);
  const [showDDL, setShowDDL] = useState(false);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <DDLModal open={showDDL} onClose={() => setShowDDL(false)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            Data Model
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Entity schemas and relationships for the DataFlow platform</p>
        </div>
        <Button onClick={() => setShowDDL(true)} variant="outline" className="gap-2 hover:bg-teal-50 dark:hover:bg-slate-700 hover:border-teal-300 dark:hover:border-teal-600">
          <Code2 className="w-4 h-4" />
          Generate DDL
        </Button>
      </div>

      {/* Relationships */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-slate-900/50 transition-all">
        <button
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-teal-50/50 dark:hover:bg-slate-700/70 transition-colors"
          onClick={() => setShowRel(!showRel)}
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="font-semibold text-slate-900 dark:text-white">Entity Relationships</span>
            <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full">{relationships.length}</span>
          </div>
          {showRel ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>

        {showRel && (
          <div className="border-t border-slate-100 dark:border-slate-700 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {relationships.map((rel, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5 text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{rel.from}</span>
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    <div className="h-px flex-1 bg-blue-300 dark:bg-blue-600" />
                    <span className="text-blue-500 text-xs shrink-0">→</span>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{rel.to}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {relationships.map((rel, i) => (
                <div key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span className="font-mono text-slate-400 dark:text-slate-500">{rel.from}.{rel.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Entity Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {entities.map((entity) => (
          <EntityCard key={entity.name} entity={entity} />
        ))}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-slate-900/30 transition-all">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-teal-500"></div>
          Legend
        </h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-amber-500" /> <span className="text-slate-600 dark:text-slate-400">Primary key</span></div>
          <div className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-blue-400" /> <span className="text-slate-600 dark:text-slate-400">Foreign key reference</span></div>
          <div className="flex items-center gap-1.5"><span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs">field</span> <span className="text-slate-600 dark:text-slate-400">= required</span></div>
          <div className="flex items-center gap-1.5"><span className="font-mono text-slate-400 dark:text-slate-500 text-xs">field</span> <span className="text-slate-600 dark:text-slate-400">= optional</span></div>
          {[["string","emerald"], ["number","blue"], ["boolean","violet"], ["array","amber"], ["object","rose"], ["date-time","cyan"]].map(([t,c]) => (
            <div key={t} className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium text-${c}-600 bg-${c}-50 border-${c}-200`}>
              {typeIcon(t)} {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}