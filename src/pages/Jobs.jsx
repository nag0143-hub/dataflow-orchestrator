import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Play, Filter, Rocket, GitCommitHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import OnboardingWizard from "@/components/OnboardingWizard";
import SkeletonLoader from "@/components/SkeletonLoader";
import { createIndex } from "@/components/dataIndexing";
import { useTenant } from "@/components/useTenant";
import moment from "moment";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ObjectSelector from "@/components/ObjectSelector";
import PipelineVersionHistory from "@/components/PipelineVersionHistory";
import JobSpecExport from "@/components/JobSpecExport";
import JobFormDialog from "@/components/JobFormDialog";
import JobCard from "@/components/JobCard";
import JobDetailsDialog from "@/components/JobDetailsDialog";



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

export default function Jobs() {
  const { user: currentUser, scope } = useTenant();
  const [jobs, setJobs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [commitMessage, setCommitMessage] = useState("");
  const [historyDialogJob, setHistoryDialogJob] = useState(null);
  const [exportJob, setExportJob] = useState(null);
  const [showDatasetLoadMethods, setShowDatasetLoadMethods] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if first time user
  useEffect(() => {
    if (!loading && jobs.length === 0 && connections.length > 0) {
      const hasSeenOnboarding = localStorage.getItem("dataflow-onboarding-seen");
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
        localStorage.setItem("dataflow-onboarding-seen", "true");
      }
    }
  }, [loading, jobs, connections]);



  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [jobsData, connectionsData, runsData] = await Promise.all([
      base44.entities.IngestionJob.list(),
      base44.entities.Connection.list(),
      base44.entities.JobRun.list("-created_date", 100)
    ]);
    setJobs(scope(jobsData));
    setConnections(scope(connectionsData));
    setRuns(runsData);
    setLoading(false);
  };

  const saveVersion = async (job, changeType, msg) => {
    const versions = await base44.entities.PipelineVersion.filter({ job_id: job.id }, "-version_number", 1);
    const nextVersion = (versions[0]?.version_number || 0) + 1;
    await base44.entities.PipelineVersion.create({
      job_id: job.id,
      version_number: nextVersion,
      label: `v${nextVersion}`,
      commit_message: msg || `${changeType} by ${currentUser?.email || "user"}`,
      snapshot: {
        name: job.name,
        description: job.description,
        source_connection_id: job.source_connection_id,
        target_connection_id: job.target_connection_id,
        selected_objects: job.selected_datasets,
        schedule_type: job.schedule_type,
        cron_expression: job.cron_expression,
        retry_config: job.retry_config,
      },
      changed_by: currentUser?.email || "",
      change_type: changeType,
    });
  };



  // Indexed lookups for performance - memoized to avoid recomputing on every render
  const connectionIndex = useMemo(() => createIndex(connections, "id"), [connections]);
  const runsByJob = useMemo(() => runs.reduce((acc, run) => {
    if (!acc[run.job_id]) acc[run.job_id] = [];
    acc[run.job_id].push(run);
    return acc;
  }, {}), [runs]);

  const getConnection = useCallback((id) => connectionIndex.get(id), [connectionIndex]);
  const getJobRuns = useCallback((jobId) => runsByJob[jobId] || [], [runsByJob]);



  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      name: job.name || "",
      description: job.description || "",
      source_connection_id: job.source_connection_id || "",
      target_connection_id: job.target_connection_id || "",
      selected_datasets: job.selected_datasets || [],
      load_method: job.load_method || "append",
      delivery_channel: job.delivery_channel || "pull",
      schedule_type: job.schedule_type || "manual",
      cron_expression: job.cron_expression || "",
      status: job.status || "idle",
      use_custom_calendar: job.use_custom_calendar || false,
      include_calendar_id: job.include_calendar_id || "",
      exclude_calendar_id: job.exclude_calendar_id || "",
      column_mappings: job.column_mappings || {},
      dq_rules: job.dq_rules || {},
      data_cleansing: job.data_cleansing || {},
      data_masking_rules: job.data_masking_rules || [],
      sla_config: job.sla_config || defaultFormData.sla_config,
      assignment_group: job.assignment_group || "",
      cost_center: job.cost_center || "",
      email: job.email || "",
      access_entitlements: job.access_entitlements || [],
      enable_advanced: job.enable_advanced || false,
      retry_config: job.retry_config || defaultFormData.retry_config
    });
    setDialogOpen(true);
    setActiveTab("general");
  };

  const handleDelete = async (job) => {
    if (!confirm(`Delete pipeline "${job.name}"?`)) return;

    await base44.entities.IngestionJob.delete(job.id);
    await base44.entities.ActivityLog.create({
      log_type: "warning",
      category: "job",
      message: `Pipeline "${job.name}" deleted`
    });
    toast.success("Pipeline deleted");
    loadData();
  };

  const handleRunJob = async (job) => {
    // Create a new run
    const run = await base44.entities.JobRun.create({
      job_id: job.id,
      run_number: (job.total_runs || 0) + 1,
      status: "running",
      started_at: new Date().toISOString(),
      rows_processed: 0,
      bytes_transferred: 0,
      objects_completed: [],
      objects_failed: [],
      retry_count: 0,
      triggered_by: "manual"
    });

    // Update job status
    await base44.entities.IngestionJob.update(job.id, {
      status: "running",
      last_run: new Date().toISOString(),
      total_runs: (job.total_runs || 0) + 1
    });

    await base44.entities.ActivityLog.create({
      log_type: "info",
      category: "job",
      job_id: job.id,
      run_id: run.id,
      message: `Pipeline "${job.name}" started`
    });

    toast.success("Pipeline started");

    // Simulate job execution
    simulateJobRun(job, run);
    loadData();
  };

  const simulateJobRun = async (job, run) => {
    const datasets = job.selected_datasets || [];
    const totalRows = Math.floor(Math.random() * 100000) + 10000;
    const bytesPerRow = 500;

    await new Promise(resolve => setTimeout(resolve, 3000));

    const success = Math.random() > 0.2; // 80% success rate

    const completedAt = new Date().toISOString();
    const duration = Math.floor((new Date(completedAt) - new Date(run.started_at)) / 1000);

    await base44.entities.JobRun.update(run.id, {
      status: success ? "completed" : "failed",
      completed_at: completedAt,
      duration_seconds: duration,
      rows_processed: success ? totalRows : Math.floor(totalRows * 0.6),
      bytes_transferred: success ? totalRows * bytesPerRow : Math.floor(totalRows * 0.6 * bytesPerRow),
      objects_completed: success ? datasets.map(d => `${d.schema}.${d.table}`) : datasets.slice(0, Math.floor(datasets.length * 0.6)).map(d => `${d.schema}.${d.table}`),
      objects_failed: success ? [] : datasets.slice(Math.floor(datasets.length * 0.6)).map(d => `${d.schema}.${d.table}`),
      error_message: success ? null : "Connection timeout on remaining datasets"
    });

    await base44.entities.IngestionJob.update(job.id, {
      status: success ? "completed" : "failed",
      successful_runs: (job.successful_runs || 0) + (success ? 1 : 0),
      failed_runs: (job.failed_runs || 0) + (success ? 0 : 1)
    });

    await base44.entities.ActivityLog.create({
      log_type: success ? "success" : "error",
      category: "job",
      job_id: job.id,
      run_id: run.id,
      message: success 
        ? `Pipeline "${job.name}" completed successfully - ${totalRows.toLocaleString()} rows processed`
          : `Pipeline "${job.name}" failed - Connection timeout`
    });

    loadData();
  };

  const handleRetryJob = async (job) => {
    const lastRun = getJobRuns(job.id)[0];
    if (!lastRun) return;

    const run = await base44.entities.JobRun.create({
      job_id: job.id,
      run_number: (job.total_runs || 0) + 1,
      status: "retrying",
      started_at: new Date().toISOString(),
      rows_processed: 0,
      bytes_transferred: 0,
      objects_completed: [],
      objects_failed: [],
      retry_count: (lastRun.retry_count || 0) + 1,
      triggered_by: "retry"
    });

    await base44.entities.IngestionJob.update(job.id, {
      status: "running",
      last_run: new Date().toISOString(),
      total_runs: (job.total_runs || 0) + 1
    });

    await base44.entities.ActivityLog.create({
      log_type: "info",
      category: "job",
      job_id: job.id,
      run_id: run.id,
      message: `Pipeline "${job.name}" retry attempt #${run.retry_count}`
    });

    toast.success("Retry started");
    simulateJobRun(job, run);
    loadData();
  };

  const handlePauseJob = async (job) => {
    await base44.entities.IngestionJob.update(job.id, {
      status: job.status === "paused" ? "idle" : "paused"
    });

    await base44.entities.ActivityLog.create({
      log_type: "info",
      category: "job",
      job_id: job.id,
      message: `Pipeline "${job.name}" ${job.status === "paused" ? "resumed" : "paused"}`
    });

    toast.success(job.status === "paused" ? "Pipeline resumed" : "Pipeline paused");
    loadData();
  };

  const handleCloneJob = async (job) => {
    setFormData({
      name: `${job.name} (Copy)`,
      description: job.description || "",
      source_connection_id: job.source_connection_id || "",
      target_connection_id: job.target_connection_id || "",
      selected_datasets: job.selected_datasets || [],
      load_method: job.load_method || "append",
      delivery_channel: job.delivery_channel || "pull",
      schedule_type: job.schedule_type || "manual",
      cron_expression: job.cron_expression || "",
      status: "idle",
      use_custom_calendar: job.use_custom_calendar || false,
      include_calendar_id: job.include_calendar_id || "",
      exclude_calendar_id: job.exclude_calendar_id || "",
      column_mappings: job.column_mappings || {},
      dq_rules: job.dq_rules || {},
      data_cleansing: job.data_cleansing || {},
      data_masking_rules: job.data_masking_rules || [],
      sla_config: job.sla_config || defaultFormData.sla_config,
      assignment_group: job.assignment_group || "",
      cost_center: job.cost_center || "",
      email: job.email || "",
      access_entitlements: job.access_entitlements || [],
      enable_advanced: job.enable_advanced || false,
      retry_config: job.retry_config || defaultFormData.retry_config
    });
    setEditingJob(null);
    setDialogOpen(true);
    setActiveTab("general");
    toast.success("Pipeline cloned. Make changes and save as a new pipeline.");
  };

  const filteredJobs = useMemo(() => jobs.filter(j => {
    const matchesSearch = j.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || j.status === filterStatus;
    return matchesSearch && matchesFilter;
  }), [jobs, searchTerm, filterStatus]);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Data Transfer Pipelines</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure and run data transfer pipelines between connections</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowOnboarding(true)}
            className="gap-2"
          >
            <Rocket className="w-4 h-4" />
            Quick Start
          </Button>
          <Button
            onClick={() => { setEditingJob(null); setFormData(defaultFormData); setDialogOpen(true); setActiveTab("general"); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Pipeline
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
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
      </div>

      {/* Jobs List */}
      {filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              sourceConn={getConnection(job.source_connection_id)}
              targetConn={getConnection(job.target_connection_id)}
              jobRuns={getJobRuns(job.id)}
              connections={connections}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRun={handleRunJob}
              onRetry={handleRetryJob}
              onPause={handlePauseJob}
              onClone={handleCloneJob}
              onViewDetails={(job) => { setViewingJob(job); setDetailsDialogOpen(true); }}
              onViewHistory={setHistoryDialogJob}
              onExport={setExportJob}
            />
          ))}
        </div>
      ) : (
        <EmptyStateGuide
          icon={Play}
          title={searchTerm ? "No pipelines found" : "No data transfer pipelines yet"}
          description={
            searchTerm
              ? "Try adjusting your search or filters"
              : "Create your first data transfer pipeline to start moving data between connections"
          }
          primaryAction={!searchTerm ? {
            label: "New Pipeline",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => { setEditingJob(null); setFormData(defaultFormData); setDialogOpen(true); setActiveTab("general"); }
          } : null}
          secondaryLinks={!searchTerm ? [
            { label: "Documentation", href: "https://docs.dataflow.io/jobs" }
          ] : null}
        />
      )}

      {/* Create/Edit Job Dialog */}
      <JobFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingJob={editingJob}
        formData={formData}
        setFormData={setFormData}
        connections={connections}
        onSaveSuccess={loadData}
        currentUser={currentUser}
      />

      {/* Job Spec Export */}
      {exportJob && (
        <JobSpecExport
          job={exportJob}
          connections={connections}
          onClose={() => setExportJob(null)}
        />
      )}

      {/* Version History Dialog */}
      <Dialog open={!!historyDialogJob} onOpenChange={(open) => !open && setHistoryDialogJob(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCommitHorizontal className="w-5 h-5 text-blue-600" />
              Version History — {historyDialogJob?.name}
            </DialogTitle>
          </DialogHeader>
          {historyDialogJob && (
            <PipelineVersionHistory
              job={historyDialogJob}
              onRestore={() => { setHistoryDialogJob(null); loadData(); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Job Details Dialog */}
      <JobDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        job={viewingJob}
        jobRuns={viewingJob ? getJobRuns(viewingJob.id) : []}
      />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        connections={connections}
        jobs={jobs}
      />
    </div>
  );
}