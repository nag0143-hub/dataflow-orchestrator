import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Play, Filter, Rocket, RefreshCw, Workflow, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorState from "@/components/ErrorState";
import { createIndex } from "@/components/dataIndexing";
import { useTenant } from "@/components/useTenant";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JobFormDialog from "@/components/JobFormDialog";
import PipelineCard from "@/components/PipelineCard";
import JobDetailsDialog from "@/components/JobDetailsDialog";
import JobSpecExport from "@/components/JobSpecExport";
import OnboardingWizard from "@/components/OnboardingWizard";
import VisualPipelineBuilder from "@/components/VisualPipelineBuilder";

const defaultFormData = {
  name: "",
  description: "",
  source_connection_id: "",
  target_connection_id: "",
  selected_datasets: [],
  load_method: "append",
  delivery_channel: "pull",
  schedule_type: "manual",
  cron_expression: "",
  status: "idle",
  use_custom_calendar: false,
  include_calendar_id: "",
  exclude_calendar_id: "",
  column_mappings: {},
  dq_rules: {},
  data_cleansing: {},
  data_masking_rules: [],
  sla_config: {
    enabled: false,
    max_duration_minutes: 60,
    alert_threshold_percent: 80,
    escalation_enabled: false,
    escalation_email: ""
  },
  assignment_group: "",
  cost_center: "",
  email: "",
  access_entitlements: [],
  enable_advanced: false,
  retry_config: {
    max_retries: 3,
    retry_delay_seconds: 60,
    exponential_backoff: true
  }
};


export default function Pipelines() {
  const { user: currentUser, scope } = useTenant();
  const [pipelines, setPipelines] = useState([]);
  const [connections, setConnections] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [viewingPipeline, setViewingPipeline] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [activeTab, setActiveTab] = useState("general");
  const [exportPipeline, setExportPipeline] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "builder"

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && !error && pipelines.length === 0 && connections.length > 0) {
      const hasSeenOnboarding = localStorage.getItem("dataflow-onboarding-seen");
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
        localStorage.setItem("dataflow-onboarding-seen", "true");
      }
    }
  }, [loading, error, pipelines, connections]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pipelinesData, connectionsData, runsData] = await Promise.all([
        base44.entities.Pipeline.list(),
        base44.entities.Connection.list(),
        base44.entities.PipelineRun.list("-created_date", 100)
      ]);
      setPipelines(scope(pipelinesData));
      setConnections(scope(connectionsData));
      setRuns(runsData);
    } catch (err) {
      console.error("[Pipelines] loadData error:", err);
      setError(err?.message || "Failed to load pipelines");
    } finally {
      setLoading(false);
    }
  };

  const connectionIndex = useMemo(() => createIndex(connections, "id"), [connections]);
  const runsByPipeline = useMemo(() => runs.reduce((acc, run) => {
    if (!acc[run.pipeline_id]) acc[run.pipeline_id] = [];
    acc[run.pipeline_id].push(run);
    return acc;
  }, {}), [runs]);

  const getConnection = useCallback((id) => connectionIndex.get(id), [connectionIndex]);
  const getPipelineRuns = useCallback((pipelineId) => runsByPipeline[pipelineId] || [], [runsByPipeline]);

  const handleEdit = useCallback((pipeline) => {
    setEditingPipeline(pipeline);
    setFormData({
      name: pipeline.name || "",
      description: pipeline.description || "",
      source_connection_id: pipeline.source_connection_id || "",
      target_connection_id: pipeline.target_connection_id || "",
      selected_datasets: pipeline.selected_datasets || [],
      load_method: pipeline.load_method || "append",
      delivery_channel: pipeline.delivery_channel || "pull",
      schedule_type: pipeline.schedule_type || "manual",
      cron_expression: pipeline.cron_expression || "",
      status: pipeline.status || "idle",
      use_custom_calendar: pipeline.use_custom_calendar || false,
      include_calendar_id: pipeline.include_calendar_id || "",
      exclude_calendar_id: pipeline.exclude_calendar_id || "",
      column_mappings: pipeline.column_mappings || {},
      dq_rules: pipeline.dq_rules || {},
      data_cleansing: pipeline.data_cleansing || {},
      data_masking_rules: pipeline.data_masking_rules || [],
      sla_config: pipeline.sla_config || defaultFormData.sla_config,
      assignment_group: pipeline.assignment_group || "",
      cost_center: pipeline.cost_center || "",
      email: pipeline.email || "",
      access_entitlements: pipeline.access_entitlements || [],
      enable_advanced: pipeline.enable_advanced || false,
      retry_config: pipeline.retry_config || defaultFormData.retry_config
    });
    setDialogOpen(true);
    setActiveTab("general");
  }, []);

  const handleDelete = useCallback(async (pipeline) => {
    if (!confirm(`Delete pipeline "${pipeline.name}"?`)) return;
    try {
      await base44.entities.Pipeline.delete(pipeline.id);
      await base44.entities.ActivityLog.create({
        log_type: "warning",
        category: "job",
        message: `Pipeline "${pipeline.name}" deleted`
      }).catch(() => {}); // non-critical
      toast.success("Pipeline deleted");
      loadData();
    } catch (err) {
      console.error("[Pipelines] handleDelete error:", err);
      toast.error("Failed to delete pipeline");
    }
  }, []);

  const handleRunPipeline = useCallback(async (pipeline) => {
    try {
      const run = await base44.entities.PipelineRun.create({
        pipeline_id: pipeline.id,
        run_number: (pipeline.total_runs || 0) + 1,
        status: "running",
        started_at: new Date().toISOString(),
        rows_processed: 0,
        bytes_transferred: 0,
        objects_completed: [],
        objects_failed: [],
        retry_count: 0,
        triggered_by: "manual"
      });

      await Promise.all([
        base44.entities.Pipeline.update(pipeline.id, {
          status: "running",
          last_run: new Date().toISOString(),
          total_runs: (pipeline.total_runs || 0) + 1
        }),
        base44.entities.ActivityLog.create({
          log_type: "info",
          category: "job",
          job_id: pipeline.id,
          run_id: run.id,
          message: `Pipeline "${pipeline.name}" started`
        }).catch(() => {})
      ]);

      toast.success("Pipeline started");
      loadData();
      simulatePipelineRun(pipeline, run);
    } catch (err) {
      console.error("[Pipelines] handleRunPipeline error:", err);
      toast.error("Failed to start pipeline");
    }
  }, []);

  const simulatePipelineRun = async (pipeline, run) => {
    const datasets = pipeline.selected_datasets || [];
    const totalRows = Math.floor(Math.random() * 100000) + 10000;
    const bytesPerRow = 500;

    await new Promise(resolve => setTimeout(resolve, 3000));

    const success = Math.random() > 0.2;
    const completedAt = new Date().toISOString();
    const duration = Math.floor((new Date(completedAt) - new Date(run.started_at)) / 1000);

    try {
      await Promise.all([
        base44.entities.PipelineRun.update(run.id, {
          status: success ? "completed" : "failed",
          completed_at: completedAt,
          duration_seconds: duration,
          rows_processed: success ? totalRows : Math.floor(totalRows * 0.6),
          bytes_transferred: success ? totalRows * bytesPerRow : Math.floor(totalRows * 0.6 * bytesPerRow),
          objects_completed: success ? datasets.map(d => `${d.schema}.${d.table}`) : datasets.slice(0, Math.floor(datasets.length * 0.6)).map(d => `${d.schema}.${d.table}`),
          objects_failed: success ? [] : datasets.slice(Math.floor(datasets.length * 0.6)).map(d => `${d.schema}.${d.table}`),
          error_message: success ? null : "Connection timeout on remaining datasets"
        }),
        base44.entities.Pipeline.update(pipeline.id, {
          status: success ? "completed" : "failed",
          successful_runs: (pipeline.successful_runs || 0) + (success ? 1 : 0),
          failed_runs: (pipeline.failed_runs || 0) + (success ? 0 : 1)
        }),
        base44.entities.ActivityLog.create({
          log_type: success ? "success" : "error",
          category: "job",
          job_id: pipeline.id,
          run_id: run.id,
          message: success
            ? `Pipeline "${pipeline.name}" completed – ${totalRows.toLocaleString()} rows`
            : `Pipeline "${pipeline.name}" failed – Connection timeout`
        }).catch(() => {})
      ]);
    } catch (err) {
      console.error("[Pipelines] simulatePipelineRun error:", err);
    }

    loadData();
  };

  const handleRetryPipeline = useCallback(async (pipeline) => {
    const lastRun = getPipelineRuns(pipeline.id)[0];
    if (!lastRun) return;

    try {
      const run = await base44.entities.PipelineRun.create({
        pipeline_id: pipeline.id,
        run_number: (pipeline.total_runs || 0) + 1,
        status: "retrying",
        started_at: new Date().toISOString(),
        rows_processed: 0,
        bytes_transferred: 0,
        objects_completed: [],
        objects_failed: [],
        retry_count: (lastRun.retry_count || 0) + 1,
        triggered_by: "retry"
      });

      await Promise.all([
        base44.entities.Pipeline.update(pipeline.id, {
          status: "running",
          last_run: new Date().toISOString(),
          total_runs: (pipeline.total_runs || 0) + 1
        }),
        base44.entities.ActivityLog.create({
          log_type: "info",
          category: "job",
          job_id: pipeline.id,
          run_id: run.id,
          message: `Pipeline "${pipeline.name}" retry #${run.retry_count}`
        }).catch(() => {})
      ]);

      toast.success("Retry started");
      loadData();
      simulatePipelineRun(pipeline, run);
    } catch (err) {
      console.error("[Pipelines] handleRetryPipeline error:", err);
      toast.error("Failed to start retry");
    }
  }, [getPipelineRuns]);

  const handlePausePipeline = useCallback(async (pipeline) => {
    try {
      const newStatus = pipeline.status === "paused" ? "idle" : "paused";
      await base44.entities.Pipeline.update(pipeline.id, { status: newStatus });
      base44.entities.ActivityLog.create({
        log_type: "info",
        category: "job",
        job_id: pipeline.id,
        message: `Pipeline "${pipeline.name}" ${newStatus === "paused" ? "paused" : "resumed"}`
      }).catch(() => {});
      toast.success(newStatus === "paused" ? "Pipeline paused" : "Pipeline resumed");
      loadData();
    } catch (err) {
      console.error("[Pipelines] handlePausePipeline error:", err);
      toast.error("Failed to update pipeline status");
    }
  }, []);

  const handleClonePipeline = useCallback((pipeline) => {
    setFormData({
      ...defaultFormData,
      name: `${pipeline.name} (Copy)`,
      description: pipeline.description || "",
      source_connection_id: pipeline.source_connection_id || "",
      target_connection_id: pipeline.target_connection_id || "",
      selected_datasets: pipeline.selected_datasets || [],
      load_method: pipeline.load_method || "append",
      delivery_channel: pipeline.delivery_channel || "pull",
      schedule_type: pipeline.schedule_type || "manual",
      cron_expression: pipeline.cron_expression || "",
      use_custom_calendar: pipeline.use_custom_calendar || false,
      include_calendar_id: pipeline.include_calendar_id || "",
      exclude_calendar_id: pipeline.exclude_calendar_id || "",
      column_mappings: pipeline.column_mappings || {},
      dq_rules: pipeline.dq_rules || {},
      data_cleansing: pipeline.data_cleansing || {},
      data_masking_rules: pipeline.data_masking_rules || [],
      sla_config: pipeline.sla_config || defaultFormData.sla_config,
      assignment_group: pipeline.assignment_group || "",
      cost_center: pipeline.cost_center || "",
      email: pipeline.email || "",
      access_entitlements: pipeline.access_entitlements || [],
      enable_advanced: pipeline.enable_advanced || false,
      retry_config: pipeline.retry_config || defaultFormData.retry_config
    });
    setEditingPipeline(null);
    setDialogOpen(true);
    setActiveTab("general");
    toast.success("Pipeline cloned — make your changes and save.");
  }, []);

  const openNew = useCallback(() => {
    setEditingPipeline(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
    setActiveTab("general");
  }, []);

  const filteredPipelines = useMemo(() => pipelines.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  }), [pipelines, searchTerm, filterStatus]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 animate-pulse" />
        </div>
        <SkeletonLoader count={5} height="h-32" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Failed to load pipelines" message={error} onRetry={loadData} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Data Pipelines</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Configure and run data pipelines between connections</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={loadData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
            </Button>
            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "list" ? "bg-[#003478] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode("builder")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-700 ${viewMode === "builder" ? "bg-[#003478] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
              >
                <Workflow className="w-4 h-4" />
                Visual Builder
              </button>
            </div>
            <Button variant="outline" onClick={() => setShowOnboarding(true)} className="gap-2">
              <Rocket className="w-4 h-4" />
              Quick Start
            </Button>
            {viewMode === "list" && (
              <Button onClick={openNew} className="gap-2 bg-[#003478] hover:bg-[#002560]">
                <Plus className="w-4 h-4" />
                New Pipeline
              </Button>
            )}
          </div>
        </div>

        {/* Visual Builder View */}
        {viewMode === "builder" && (
          <VisualPipelineBuilder connections={connections} onSaveSuccess={() => { loadData(); setViewMode("list"); }} />
        )}

        {/* Filters — only in list view */}
        {viewMode === "list" && <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search pipelines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>}

        {/* Pipelines List */}
        {viewMode === "list" && filteredPipelines.length > 0 ? (
          <div className="space-y-4">
            {filteredPipelines.map((pipeline) => (
              <ErrorBoundary key={pipeline.id}>
                <PipelineCard
                  job={pipeline}
                  sourceConn={getConnection(pipeline.source_connection_id)}
                  targetConn={getConnection(pipeline.target_connection_id)}
                  jobRuns={getPipelineRuns(pipeline.id)}
                  connections={connections}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRun={handleRunPipeline}
                  onRetry={handleRetryPipeline}
                  onPause={handlePausePipeline}
                  onClone={handleClonePipeline}
                  onViewDetails={(p) => { setViewingPipeline(p); setDetailsDialogOpen(true); }}
                  onExport={setExportPipeline}
                />
              </ErrorBoundary>
            ))}
          </div>
        ) : (
          <EmptyStateGuide
            icon={Play}
            title={searchTerm ? "No pipelines found" : "No data pipelines yet"}
            description={
              searchTerm
                ? "Try adjusting your search or filters"
                : "Create your first data pipeline to start moving data between connections"
            }
            primaryAction={!searchTerm ? {
              label: "New Pipeline",
              icon: <Plus className="w-4 h-4" />,
              onClick: openNew
            } : null}
          />
        )}

        {/* Dialogs — only rendered when opened */}
        <JobFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingJob={editingPipeline}
          formData={formData}
          setFormData={setFormData}
          connections={connections}
          onSaveSuccess={loadData}
          currentUser={currentUser}
        />

        {exportPipeline && (
          <JobSpecExport
            job={exportPipeline}
            connections={connections}
            onClose={() => setExportPipeline(null)}
          />
        )}

        <JobDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          job={viewingPipeline}
          jobRuns={viewingPipeline ? getPipelineRuns(viewingPipeline.id) : []}
        />

        <OnboardingWizard
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          connections={connections}
          jobs={pipelines}
        />
      </div>
    </ErrorBoundary>
  );
}