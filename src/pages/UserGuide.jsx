import { BookOpen, ChevronDown, CheckCircle2, AlertCircle, Lightbulb, Code2, Play, Cable, Rocket, LayoutTemplate, GitBranch, Database, FileText, Settings, Search, Shield, Bug, Monitor, FolderOpen, Clock, Zap, Server, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

export default function UserGuide() {
  const [expandedSection, setExpandedSection] = useState(0);

  const sections = [
    {
      title: "Getting Started",
      icon: Play,
      color: "emerald",
      content: [
        { label: "Dashboard", desc: "Your home screen shows key metrics at a glance: total connections, active pipelines, successful and failed runs. Below the stats, you'll find recent pipeline runs (searchable by name/status), an orchestration panel for connected Airflow instances, and a live activity feed showing the latest system events." },
        { label: "Navigation Sidebar", desc: "The left sidebar provides quick access to all areas: Dashboard, Connections, Pipelines, Data Catalog, and this User Guide. Click the collapse button at the bottom to minimize the sidebar to icons only. Your preference is saved automatically." },
        { label: "Dark Mode", desc: "Toggle between light and dark themes using the sun/moon icon at the bottom of the sidebar. Your preference persists across sessions." },
        { label: "Quick Start", desc: "The fastest way to get going: 1) Create a source and target Connection, 2) Create a Pipeline selecting those connections, 3) Choose your datasets and schedule, 4) Review the generated artifacts, 5) Deploy to Git. The Quick Start button on the Pipelines page walks you through a guided setup." }
      ]
    },
    {
      title: "Managing Connections",
      icon: Cable,
      color: "blue",
      content: [
        { label: "What is a Connection?", desc: "A connection defines how DataFlow reaches a data system. Each connection is either a 'source' (where data comes from) or a 'target' (where data goes). You need at least one source and one target before creating a pipeline." },
        { label: "Supported Platforms", desc: "Databases: PostgreSQL, SQL Server (MSSQL), MySQL, MongoDB, Oracle. Cloud Storage: Amazon S3, Azure Data Lake Storage Gen2 (ADLS2). File Systems: SFTP, NAS/Network Share, Local Filesystem. Flat Files: Delimited (CSV/TSV), Fixed Width, COBOL/EBCDIC. Data Warehouses: Snowflake, Azure Synapse, BigQuery." },
        { label: "Creating a Connection", desc: "Click '+ New Connection' on the Connections page. Fill in: name, platform type, connection type (source/target), host, port, database, authentication method (password, key-based, managed identity), and optional tags for organization. Use the description field to note the system's purpose." },
        { label: "Testing Connections", desc: "After creating a connection, click the 'Test' button to verify connectivity. DataFlow will attempt a real connection using the configured credentials and report success or failure with detailed error messages. Always test before using a connection in a pipeline." },
        { label: "Connection Profiles", desc: "Save frequently-used connection configurations as reusable profiles. When creating a new connection, pick a profile to pre-fill common settings (host, port, auth method), then customize as needed. Great for environments with many similar database instances." },
        { label: "Prerequisites", desc: "Track external setup requirements that must be completed before a connection works: firewall rules, DBA access grants, VPN configuration, SSL certificates, etc. Mark each prerequisite as pending or complete to keep your team aligned." },
        { label: "Schema Introspection", desc: "For database connections, DataFlow can introspect the live schema to discover available schemas, tables, and columns. This powers the dataset selector in the pipeline wizard. Introspection is supported for PostgreSQL, MySQL, and SQL Server." },
        { label: "Tags & Organization", desc: "Add tags to connections for filtering and grouping. On the Connections page, switch between grid and list views, or group connections by their tags for easy navigation." }
      ]
    },
    {
      title: "Creating Pipelines",
      icon: Rocket,
      color: "purple",
      content: [
        { label: "Pipeline Wizard Overview", desc: "Click '+ New Pipeline' to open the creation wizard. It guides you through 6 steps: Basics, Datasets, Schedule, Advanced (optional), Review, and Deploy. A progress indicator at the top shows your current step and which steps are complete. The dialog auto-expands on the Review and Deploy tabs for better visibility." },
        { label: "Step 1: Basics", desc: "Enter a pipeline name and optional description. Select your source connection (where data comes from) and target connection (where data goes). Source and target must be different connections. The name is used to generate artifact filenames, so use clear, descriptive names like 'ERP Finance to Synapse'." },
        { label: "Step 2: Datasets", desc: "Choose which data to transfer. For database sources, DataFlow introspects the schema and presents available tables/views for selection. You can pick multiple datasets. For flat file sources, choose a mode: File List (select individual files), Folder Path (process all files in a directory), or Wildcard Pattern (match files by pattern like '*.csv')." },
        { label: "Step 3: Schedule", desc: "Configure when the pipeline runs. Choose from: Manual (on-demand only), Every N Minutes (1-45 min intervals), Every N Hours (1-12 hr intervals), Hourly (at a specific minute), Daily (at a specific hour/minute UTC), Weekly (specific day and time), Monthly (specific day and time), Custom Cron (any cron expression), or Event Driven (sensor-based triggers). See the Scheduling section below for details on each option." },
        { label: "Step 3: DAG Callable Base Path", desc: "In the Schedule tab, set the base directory path for Python callable files referenced in the generated Airflow DAG YAML. Default is '/data/dags/'. This path is prepended to auto-generated filenames like '<pipeline_name>_tasks.py' and '<pipeline_name>_spark.py'." },
        { label: "Step 3: Advanced Features Toggle", desc: "Enable the 'Advanced Features' toggle in the Schedule tab to unlock the Advanced step. This adds column mapping, data quality rules, data cleansing, and data masking configuration." },
        { label: "Step 4: Advanced (Optional)", desc: "When enabled, this step provides: Column Mapping (map source columns to target columns with transformation functions), Data Quality Rules (define validation checks per dataset), Data Cleansing (null handling, trimming, type conversions), Data Masking (redact sensitive fields), and SLA Configuration (set delivery time expectations)." },
        { label: "Step 5: Review", desc: "Preview everything before deploying. Select a DAG template (built-in or custom) to generate the Airflow DAG YAML. Toggle between viewing the generated Airflow DAG (YAML) and the Pipeline Spec (YAML/JSON). Automatic spec validation runs in the background, showing errors and warnings. Use Copy and Download buttons to save artifacts locally. You can also view the raw template with placeholders before fill." },
        { label: "Step 6: Deploy", desc: "Commit your pipeline artifacts to Git. Choose GitHub or GitLab as your provider. Configure the repository, branch, and commit message. Review the auto-generated artifact cards (Airflow DAG YAML + Pipeline Spec). Click 'Validate & Deploy' to save the pipeline and push files to your repository. After a successful commit, the result shows the SHA, branch, committed files, and a direct link to the commit. A green 'Done -- Close' button appears once deployment succeeds." },
        { label: "Save as Draft", desc: "At any step, click 'Save as Draft' to save your pipeline configuration without deploying. Draft pipelines appear on the Pipelines page and can be resumed later by clicking the edit button." },
        { label: "Editing Pipelines", desc: "Click the three-dot menu on any pipeline card and select 'Edit' (or click Details then Edit) to reopen the wizard with all settings pre-filled. Make changes and deploy again to update the artifacts in Git." }
      ]
    },
    {
      title: "DAG Templates & Airflow",
      icon: LayoutTemplate,
      color: "indigo",
      content: [
        { label: "What is dag-factory?", desc: "dag-factory is an open-source library that lets you define Airflow DAGs using YAML instead of Python code. DataFlow generates dag-factory-compatible YAML files that Airflow reads to create DAGs automatically. This means no manual Python DAG coding required." },
        { label: "Built-in Templates", desc: "DataFlow ships with 3 built-in templates, automatically selected based on your source type: (1) 'Flat File -- Landing to Raw': Sensor waits for file arrival, then runs parallel ingestion tasks, with optional SparkSubmit transform tasks if column mappings exist. (2) 'Flat File -- Simple Ingest': Parallel PythonOperator ingestion tasks without a file sensor (for pre-staged files on a fixed schedule). (3) 'Database -- Extract to Data Warehouse': Parallel SparkSubmitOperator tasks, one per dataset table." },
        { label: "Template Structure", desc: "Each template produces YAML with: a DAG ID (dataflow__<pipeline_name>), default_args (owner, email, retries, start_date), schedule (cron or preset), catchup: false, description, and a tasks section. Tasks specify their operator class, callable files, arguments, Spark config, and dependency chains." },
        { label: "Flat File Task Chain", desc: "For flat file pipelines, the generated DAG has: (1) wait_for_source_file -- a PythonSensor that polls for file arrival using platform-specific functions (adls_file_exists, sftp_file_exists, etc.), (2) ingest tasks -- PythonOperator tasks that run the ingestion function for each dataset, dependent on the sensor, (3) transform tasks (optional) -- SparkSubmitOperator tasks generated only for datasets that have column mappings configured." },
        { label: "Database Task Structure", desc: "For database pipelines, each dataset gets its own SparkSubmitOperator task (extract_<schema>_<table>) that runs independently in parallel. Tasks include application args for schema, table, load method, filter query, and incremental column." },
        { label: "Custom Templates", desc: "Create your own templates by clicking 'New' in the template selector on the Review tab. Templates use {{placeholder}} syntax. Available placeholders include: dag_id, schedule, owner, email, retries, callable_file, spark_app, sensor_callable, dataset_ingest_group, dataset_extract_group, and more. Custom templates can target specific source types or work with any source." },
        { label: "DAG Callable Base Path", desc: "Controls the directory where generated Python callable files are expected to live. Set per-pipeline in the Schedule tab (default: /data/dags/). The generated YAML references files like '<base_path>/<pipeline_name>_tasks.py' for Python callables and '<base_path>/<pipeline_name>_spark.py' for Spark applications." },
        { label: "Airflow Integration", desc: "Connect your Airflow instance via the Dashboard's Orchestration panel. Once connected, DataFlow can display DAG status, run history, task instance details, and execution logs directly in the UI. You can trigger DAG runs and pause/unpause DAGs without leaving DataFlow." }
      ]
    },
    {
      title: "Scheduling & Execution",
      icon: Clock,
      color: "amber",
      content: [
        { label: "Schedule Types", desc: "Manual: run only when triggered. Every N Minutes: intervals of 1, 2, 5, 10, 15, 20, 30, or 45 minutes. Every N Hours: intervals of 1, 2, 3, 4, 6, 8, or 12 hours. Hourly: at a specific minute past each hour. Daily: at a specific hour and minute (UTC). Weekly: on a specific day and time. Monthly: on a specific day of month and time. Custom Cron: any valid cron expression (e.g., '0 6 * * 1-5' for weekdays at 6am). Event Driven: triggered by external events via sensors." },
        { label: "Event-Driven Sensors", desc: "When you select 'Event Driven', choose a sensor type: File Watcher (triggers on file appearance in a path), S3/ADLS Event (triggers on object create/update in cloud storage), DB Sensor (triggers when a SQL condition becomes true), SFTP Sensor (triggers when a file arrives on SFTP), API Webhook (triggers via inbound HTTP POST), or Upstream Job (triggers after another pipeline completes)." },
        { label: "Sensor Configuration", desc: "For each sensor, configure: the watch path or condition, polling interval (30s to 30min), and timeout (1h to 72h). The generated DAG YAML includes a PythonSensor task with these settings. The sensor uses 'reschedule' mode to free up Airflow worker slots between polls." },
        { label: "Custom Calendars", desc: "For any non-manual schedule, enable 'Use Custom Calendar' to apply include/exclude date rules. Include calendars restrict runs to specific dates only (e.g., only on bank holidays). Exclude calendars skip runs on specified dates (e.g., skip weekends or holidays)." },
        { label: "Manual Runs", desc: "Pipelines with 'Manual' schedule (or any schedule) can be triggered on-demand by clicking the 'Run' button on the pipeline card. This creates a one-time execution without affecting the regular schedule." },
        { label: "Cron Expression Reference", desc: "Format: minute hour day-of-month month day-of-week. Examples: '0 6 * * *' = daily at 6am, '0 6 * * 1-5' = weekdays at 6am, '*/15 * * * *' = every 15 minutes, '0 0 1 * *' = first of every month at midnight." }
      ]
    },
    {
      title: "Deploying to Git",
      icon: GitBranch,
      color: "slate",
      content: [
        { label: "Overview", desc: "DataFlow generates two YAML artifacts per pipeline: the Airflow DAG file (dag-factory format) and the Pipeline Spec file (full configuration). These files are committed to a Git repository where your CI/CD pipeline picks them up for automated deployment to Airflow." },
        { label: "GitHub Integration", desc: "DataFlow connects to GitHub via OAuth (configured through the platform integration). On the Deploy tab, you'll see your connection status, and can edit the owner/organization and repository name. The default repository is 'nag0143-hub/dataflow-platform'. Files are committed via the GitHub API (tree + commit creation)." },
        { label: "GitLab Integration (LDAP)", desc: "For production GitLab instances, authenticate with your LDAP username and password on the Deploy tab. Credentials are used only for the current commit and are never stored. Configure GITLAB_URL and GITLAB_PROJECT environment variables to point to your GitLab instance and project." },
        { label: "Repository Security", desc: "GitHub commits are restricted to repositories in the GITHUB_ALLOWED_REPOS allowlist (comma-separated owner/repo pairs in environment variables). The server validates and sanitizes owner/repo values before making API calls." },
        { label: "Branch & Commit", desc: "Choose any branch name (default: 'main'). If the branch doesn't exist, it's automatically created from the default branch. The commit message defaults to 'Add pipeline: <name>' or 'Update pipeline: <name>' but can be customized." },
        { label: "Artifact File Paths", desc: "Files are committed to 'specs/<pipeline_name>/' in the repository. Two files per pipeline: '<pipeline_name>-airflow-dag.yaml' (the DAG) and '<pipeline_name>-pipelinespec.yaml' (the spec). Filenames are auto-generated from the pipeline name (lowercased, special characters replaced with underscores)." },
        { label: "Inline Deploy vs Standalone", desc: "You can deploy from two places: (1) The Deploy tab in the pipeline creation/edit wizard (saves pipeline and commits in one flow), or (2) The 'Deploy' button on any pipeline card on the Pipelines page (opens a standalone deploy dialog for existing pipelines)." },
        { label: "CI/CD Auto-Trigger", desc: "After a successful commit, your repository's CI/CD pipeline (GitHub Actions, GitLab CI) automatically triggers to validate the DAG YAML and deploy it to your Airflow environment. The exact CI/CD behavior depends on your repository's pipeline configuration." },
        { label: "Deploy Status", desc: "After committing, the Deploy tab shows: commit SHA, branch, list of committed files, author, and a direct link to view the commit on GitHub/GitLab. During deployment, the dialog cannot be accidentally closed. A green 'Done -- Close' button appears after success." }
      ]
    },
    {
      title: "Data Catalog",
      icon: FolderOpen,
      color: "teal",
      content: [
        { label: "Overview", desc: "The Data Catalog provides a centralized view of all datasets across your connections. Browse available tables, views, and files with their schema definitions, data classifications, and quality scores." },
        { label: "Browsing Datasets", desc: "Navigate to Data Catalog from the sidebar. Use the search bar to find datasets by name, or filter by connection, classification level, or tags. Each dataset card shows the parent connection, column count, and classification level." },
        { label: "Data Classification", desc: "Datasets can be classified by sensitivity level: Public (no restrictions), Internal (company-internal), Restricted (limited access), or PII (personally identifiable information). Classification helps enforce access controls and data governance policies." },
        { label: "Quality Scores", desc: "When data quality rules are configured for a pipeline, the catalog displays quality scores based on rule pass rates. Higher scores indicate cleaner, more reliable data." },
        { label: "Schema Definitions", desc: "View the full column schema for any dataset: column name, data type, nullability, and any applied transformations or masking rules. This information comes from live schema introspection of the source connection." }
      ]
    },
    {
      title: "Monitoring & Activity",
      icon: Monitor,
      color: "cyan",
      content: [
        { label: "Pipeline Cards", desc: "The Pipelines page shows each pipeline as a card with: name, status badge (Active/Draft/Paused), source and target connections, dataset count, total runs, success rate percentage, and action buttons (Deploy, Export, Details, Run)." },
        { label: "Pipeline Runs", desc: "The Dashboard shows recent pipeline runs with status (success/failed/running), duration, and timestamps. Click a run to see detailed execution information including per-dataset results." },
        { label: "Activity Logs", desc: "Every significant action is logged: pipeline created, updated, deployed, run started, run completed/failed. Access Activity Logs from the Dashboard's Recent Activity section or via dedicated log pages. Logs include timestamps, categories, and detailed messages." },
        { label: "Audit Trail", desc: "A comprehensive, immutable record of all entity changes across the platform. Track who created, updated, or deleted connections, pipelines, and other entities. Useful for compliance and troubleshooting." },
        { label: "Export Pipeline Spec", desc: "Click 'Export' on any pipeline card to view the full pipeline specification in JSON or YAML format. Useful for documentation, backup, or sharing pipeline configurations." }
      ]
    },
    {
      title: "Troubleshooting",
      icon: Bug,
      color: "red",
      content: [
        { label: "Connection Test Failed", desc: "Verify host, port, and credentials are correct. Check that firewall rules allow traffic from the DataFlow server. For SSL connections, ensure certificates are valid. For cloud services, verify IAM roles and permissions. The error message in the test result provides specific details about the failure." },
        { label: "Schema Introspection Empty", desc: "Ensure the connection credentials have read access to information_schema (PostgreSQL, MySQL, SQL Server). Check that the database name is correct. Some databases require specific grants for metadata queries." },
        { label: "Deploy / Git Commit Failed", desc: "For GitHub: verify the OAuth integration is active (check connection status badge). Ensure the repository exists and is in the allowed repos list. For GitLab: verify LDAP credentials, check that GITLAB_URL and GITLAB_PROJECT environment variables are set correctly. If branch creation fails, ensure you have write access to the repository." },
        { label: "Spec Validation Errors", desc: "The Review tab automatically validates your pipeline specification. Common errors: missing pipeline name, no source/target connection selected, no datasets selected, source and target are the same connection, invalid cron expression for custom schedules. Fix the reported fields and validation re-runs automatically." },
        { label: "Pipeline Run Failed", desc: "Check the Activity Logs for detailed error messages. Common causes: source system unavailable, credentials expired, target table doesn't exist, network timeout. Review the pipeline's retry configuration -- failed runs auto-retry based on your settings (default: 3 retries with exponential backoff)." },
        { label: "DAG Not Appearing in Airflow", desc: "After deploying to Git, verify: (1) the CI/CD pipeline ran successfully, (2) the YAML file was placed in the correct Airflow DAGs folder, (3) dag-factory is installed in your Airflow environment, (4) the DAG callable base path matches your Airflow deployment. Check the Airflow scheduler logs for parsing errors." },
        { label: "Template Rendering Issues", desc: "If the generated YAML looks incorrect, check that all required form fields are filled (especially datasets, connections, and schedule). Try switching to a different built-in template to isolate the issue. For custom templates, verify all {{placeholders}} are valid (see the placeholder reference in the template editor)." }
      ]
    }
  ];

  const bestPractices = [
    { icon: CheckCircle2, positive: true, title: "Use descriptive pipeline names", desc: "Names like 'ERP Finance to Synapse Weekly' are clearer than 'Pipeline1'. The name generates artifact filenames." },
    { icon: CheckCircle2, positive: true, title: "Test connections before creating pipelines", desc: "Always verify connectivity first to avoid pipeline failures due to unreachable systems." },
    { icon: CheckCircle2, positive: true, title: "Start with small datasets", desc: "Test your pipeline with a single table or small file before adding all datasets. Validate the flow end-to-end first." },
    { icon: CheckCircle2, positive: true, title: "Enable data quality rules", desc: "Define validation checks for critical data transfers: null checks, uniqueness, range validation, and format validation." },
    { icon: CheckCircle2, positive: true, title: "Use connection profiles", desc: "Save common connection settings as profiles to standardize configurations across environments and reduce errors." },
    { icon: CheckCircle2, positive: true, title: "Review generated YAML before deploying", desc: "Always check the Airflow DAG YAML on the Review tab. Verify task names, dependencies, and operator configurations match your expectations." },
    { icon: CheckCircle2, positive: true, title: "Use branches for pipeline changes", desc: "Deploy pipeline updates to a feature branch first, then merge to main after validation. This prevents untested changes from reaching production." },
    { icon: AlertCircle, positive: false, title: "Don't store credentials in pipeline configs", desc: "Use connection references and managed identities. Pipeline specs committed to Git should never contain passwords or secrets." },
    { icon: AlertCircle, positive: false, title: "Don't skip spec validation warnings", desc: "Warnings on the Review tab indicate potential issues. Address them before deploying to avoid runtime failures in Airflow." },
    { icon: AlertCircle, positive: false, title: "Monitor pipelines regularly", desc: "Check success rates on the Dashboard. Investigate any pipeline with declining success rates before they become critical failures." }
  ];

  const terminology = [
    ["Pipeline", "A configured data transfer workflow between a source and target connection, with schedule, datasets, and deployment settings"],
    ["Connection", "A configured link to a data system (database, cloud storage, file system) used as source or target"],
    ["Dataset", "A specific table, view, or file selected for transfer within a pipeline"],
    ["Run", "A single execution of a pipeline, producing success or failure results"],
    ["Schedule", "The timing configuration for when a pipeline executes (cron-based or event-driven)"],
    ["DAG Template", "A YAML template with placeholders that generates dag-factory compatible Airflow DAG files"],
    ["dag-factory", "An open-source Airflow library that creates DAGs from YAML definitions instead of Python code"],
    ["Artifact", "A generated file (DAG YAML or pipeline spec) committed to Git for CI/CD deployment"],
    ["Deploy", "The act of saving a pipeline and committing its artifacts to a Git repository"],
    ["Spec", "The complete YAML/JSON definition of a pipeline's configuration, datasets, and execution settings"],
    ["Sensor", "An Airflow operator that waits for a condition (file arrival, DB state) before triggering downstream tasks"],
    ["SparkSubmit", "An Airflow operator that submits PySpark jobs for data extraction and transformation"],
    ["Column Mapping", "Configuration that maps source columns to target columns with optional transformation functions"],
    ["Data Quality Rules", "Validation checks applied to datasets during pipeline execution (null checks, ranges, formats)"]
  ];

  const colorMap = {
    emerald: { border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50/50 dark:bg-emerald-900/10", activeBorder: "border-emerald-400 dark:border-emerald-600", icon: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
    blue: { border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50/50 dark:bg-blue-900/10", activeBorder: "border-blue-400 dark:border-blue-600", icon: "text-blue-600 dark:text-blue-400", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    purple: { border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50/50 dark:bg-purple-900/10", activeBorder: "border-purple-400 dark:border-purple-600", icon: "text-purple-600 dark:text-purple-400", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
    indigo: { border: "border-indigo-200 dark:border-indigo-800", bg: "bg-indigo-50/50 dark:bg-indigo-900/10", activeBorder: "border-indigo-400 dark:border-indigo-600", icon: "text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" },
    amber: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50/50 dark:bg-amber-900/10", activeBorder: "border-amber-400 dark:border-amber-600", icon: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
    slate: { border: "border-slate-200 dark:border-slate-700", bg: "bg-slate-50/50 dark:bg-slate-800/50", activeBorder: "border-slate-400 dark:border-slate-500", icon: "text-slate-600 dark:text-slate-400", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    teal: { border: "border-teal-200 dark:border-teal-800", bg: "bg-teal-50/50 dark:bg-teal-900/10", activeBorder: "border-teal-400 dark:border-teal-600", icon: "text-teal-600 dark:text-teal-400", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
    cyan: { border: "border-cyan-200 dark:border-cyan-800", bg: "bg-cyan-50/50 dark:bg-cyan-900/10", activeBorder: "border-cyan-400 dark:border-cyan-600", icon: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
    red: { border: "border-red-200 dark:border-red-800", bg: "bg-red-50/50 dark:bg-red-900/10", activeBorder: "border-red-400 dark:border-red-600", icon: "text-red-600 dark:text-red-400", badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-[#0060AF]/10 to-blue-50 dark:from-[#0060AF]/20 dark:to-blue-900/20 rounded-xl p-8 border border-[#0060AF]/20 dark:border-[#0060AF]/30">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-[#0060AF] rounded-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">DataFlow User Guide</h1>
        </div>
        <p className="text-slate-700 dark:text-slate-300 text-lg ml-16">Comprehensive guide to configuring, deploying, and managing data pipelines</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Cable, step: "1", title: "Create Connections", desc: "Define source and target data systems with authentication and test connectivity", borderCls: "border-blue-200 dark:border-blue-800", bgCls: "from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20", iconCls: "text-blue-600 dark:text-blue-400" },
          { icon: Settings, step: "2", title: "Build Pipeline", desc: "Select datasets, configure schedule, set up templates and advanced options", borderCls: "border-purple-200 dark:border-purple-800", bgCls: "from-purple-50 to-purple-50 dark:from-purple-900/20 dark:to-purple-900/20", iconCls: "text-purple-600 dark:text-purple-400" },
          { icon: Rocket, step: "3", title: "Review & Deploy", desc: "Preview generated DAG YAML, validate spec, and commit artifacts to Git", borderCls: "border-[#0060AF]/20 dark:border-[#0060AF]/30", bgCls: "from-[#0060AF]/5 to-blue-50 dark:from-[#0060AF]/10 dark:to-blue-900/20", iconCls: "text-[#0060AF] dark:text-blue-400" }
        ].map((step, i) => {
          const Icon = step.icon;
          return (
            <Card key={i} className={`border-2 ${step.borderCls} bg-gradient-to-br ${step.bgCls} hover:shadow-lg transition-all relative overflow-hidden`}>
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/70 dark:bg-white/10 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-400">{step.step}</span>
              </div>
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-lg ${step.iconCls} bg-white/50 dark:bg-white/10 flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{step.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3 justify-center">
        {[1,2,3].map((n, i) => (
          <div key={n} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0060AF] text-white flex items-center justify-center text-sm font-bold">{n}</div>
            {i < 2 && <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-4">Platform Guide</h2>
        {sections.map((section, idx) => {
          const colors = colorMap[section.color] || colorMap.blue;
          const isOpen = expandedSection === idx;
          const SectionIcon = section.icon;
          return (
            <Card key={idx} className={`border-2 transition-all ${isOpen ? `${colors.activeBorder} ${colors.bg} shadow-md` : `${colors.border} dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600`}`}>
              <button
                onClick={() => setExpandedSection(isOpen ? -1 : idx)}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${colors.icon} bg-white/70 dark:bg-white/10 flex items-center justify-center`}>
                    <SectionIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{section.title}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>{section.content.length} topics</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <CardContent className="p-5 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  {section.content.map((item, i) => (
                    <div key={i} className="pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full ${colors.badge} flex items-center justify-center text-xs font-bold`}>{i + 1}</span>
                        {item.label}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 ml-8 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Best Practices</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {bestPractices.map((practice, i) => {
            const Icon = practice.icon;
            return (
              <Card key={i} className={`border-l-4 ${practice.positive ? 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-slate-700' : 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-slate-700'}`}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-1 ${practice.positive ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{practice.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{practice.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#0060AF]/5 via-blue-50 to-[#0060AF]/5 dark:from-[#0060AF]/10 dark:via-blue-900/20 dark:to-[#0060AF]/10 border-2 border-[#0060AF]/20 dark:border-[#0060AF]/30 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Code2 className="w-6 h-6 text-[#0060AF]" />
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Key Terminology</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {terminology.map(([term, def]) => (
            <div key={term} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-[#0060AF]/10 dark:border-slate-700">
              <p><strong className="text-[#0060AF] dark:text-blue-400">{term}</strong><br/><span className="text-sm text-slate-600 dark:text-slate-400">{def}</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 rounded-xl p-8 border-2 border-slate-200 dark:border-slate-700 text-center">
        <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-lg">Need Help?</h3>
        <p className="text-slate-700 dark:text-slate-300 mb-4">Check Activity Logs for detailed error messages, review the Troubleshooting section above, or contact your DataFlow administrator.</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Last updated: 2026-02-27</p>
      </div>
    </div>
  );
}
