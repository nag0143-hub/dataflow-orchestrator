import { useState, useEffect, useCallback, memo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Clock,
  Calendar,
  ArrowRight,
  Filter,
  RefreshCw,
  ArrowLeftRight,
  ShieldCheck,
  Copy,
  Download,
  Check,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import StatusBadge from "@/components/StatusBadge";
import PlatformIcon, { platformConfig } from "@/components/PlatformIcon";
import ObjectSelector from "@/components/ObjectSelector";
import PipelineVersionHistory from "@/components/PipelineVersionHistory";
import ColumnMapper from "@/components/ColumnMapper";
import DataQualityRules from "@/components/DataQualityRules";
import { useTenant } from "@/components/useTenant";
import moment from "moment";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCommitHorizontal, FileJson, Wand2 } from "lucide-react";
import JobSpecExport, { buildJobSpec } from "@/components/JobSpecExport";
import DataCleansing from "@/components/DataCleansing";

// Memoized Advanced tab to prevent re-renders from parent form state changes
const AdvancedTab = memo(function AdvancedTab({ selectedObjects, columnMappings, dqRules, cleansing, onMappingsChange, onRulesChange, onCleansingChange }) {
  return (
    <div className="space-y-5">
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-indigo-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Data Cleansing</h4>
        </div>
        <p className="text-xs text-slate-500">Remove unprintable characters, control characters, and whitespace anomalies.</p>
        <DataCleansing
          selectedObjects={selectedObjects}
          cleansing={cleansing}
          onChange={onCleansingChange}
        />
      </div>
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-violet-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Column Mapping &amp; Transformations</h4>
        </div>
        <p className="text-xs text-slate-500">Map source columns to target columns and apply transformations.</p>
        <ColumnMapper
          selectedObjects={selectedObjects}
          mappings={columnMappings}
          onChange={onMappingsChange}
        />
      </div>
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Data Quality Rules</h4>
        </div>
        <p className="text-xs text-slate-500">Define dataset-level and column-level quality checks with configurable failure actions.</p>
        <DataQualityRules
          selectedObjects={selectedObjects}
          rules={dqRules}
          onChange={onRulesChange}
        />
      </div>
    </div>
  );
});

// Inline spec preview inside the job form
function JobSpecTabPreview({ formData, connections }) {
  const [format, setFormat] = useState("yaml");
  const [copied, setCopied] = useState(false);

  // Build a draft spec from current (unsaved) form state
  const draftJob = {
    id: "(unsaved)",
    ...formData,
    dq_rules: formData.dq_rules || {},
  };

  // Inline YAML serializer so this component has no extra deps
  function toYaml(obj, indent = 0) {
    const pad = "  ".repeat(indent);
    if (obj === null || obj === undefined) return "null";
    if (typeof obj === "boolean") return obj ? "true" : "false";
    if (typeof obj === "number") return String(obj);
    if (typeof obj === "string") {
      if (/[\n:#\[\]{},'"&*?|<>=!%@`]/.test(obj) || obj === "" || /^(true|false|null|yes|no)$/i.test(obj))
        return `"${obj.replace(/"/g, '\\"')}"`;
      return obj;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]";
      return obj.map(item => {
        const val = toYaml(item, indent + 1);
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          const lines = val.split("\n");
          return `${pad}- ${lines[0]}\n${lines.slice(1).join("\n")}`;
        }
        return `${pad}- ${val}`;
      }).join("\n");
    }
    if (typeof obj === "object") {
      const keys = Object.keys(obj);
      if (keys.length === 0) return "{}";
      return keys.map(k => {
        const val = obj[k];
        if (val !== null && typeof val === "object" && !Array.isArray(val) && Object.keys(val).length > 0)
          return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object")
          return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        return `${pad}${k}: ${toYaml(val, indent)}`;
      }).join("\n");
    }
    return String(obj);
  }

  // Rebuild on every render so it always reflects current formData
  const spec = buildJobSpec(draftJob, connections);
  // Strip undefined values for clean output
  const cleanSpec = JSON.parse(JSON.stringify(spec));
  const content = format === "json"
    ? JSON.stringify(cleanSpec, null, 2)
    : `# DataFlow Job Spec — ${formData.name || "untitled"}\n` + toYaml(cleanSpec);

  const filename = `${(formData.name || "job").replace(/[^a-z0-9_-]/gi, "_").toLowerCase()}-jobspec.${format === "json" ? "json" : "yaml"}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileJson className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-slate-900">Job Spec</span>
        <span className="text-xs text-slate-400 ml-1">(check this file into git)</span>
        <div className="flex gap-1.5 ml-auto">
          {["yaml", "json"].map(f => (
            <button key={f} type="button" onClick={() => setFormat(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                format === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        This spec reflects the current (unsaved) form state and includes full connection details. Save the job first, then download to commit.
      </p>
      <div className="rounded-lg border border-slate-200 bg-slate-950 overflow-hidden">
        <pre className="p-4 text-xs text-emerald-300 font-mono whitespace-pre overflow-auto max-h-[50vh] leading-relaxed">
          {content}
        </pre>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Download {filename}
        </Button>
      </div>
    </div>
  );
}

const defaultFormData = {
  name: "",
  description: "",
  source_connection_id: "",
  target_connection_id: "",
  selected_datasets: [],
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

  const handleMappingsChange = useCallback((mappingsOrUpdater) => {
    setFormData(prev => ({
      ...prev,
      column_mappings: typeof mappingsOrUpdater === "function"
        ? mappingsOrUpdater(prev.column_mappings)
        : mappingsOrUpdater
    }));
  }, []);
  const handleRulesChange = useCallback((rules) => setFormData(prev => ({ ...prev, dq_rules: rules })), []);
  const handleCleansingChange = useCallback((cleansing) => setFormData(prev => ({ ...prev, data_cleansing: cleansing })), []);

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

  const sourceConnections = connections.filter(c => c.connection_type === "source");
  const targetConnections = connections.filter(c => c.connection_type === "target");

  const getConnection = (id) => connections.find(c => c.id === id);
  const getJobRuns = (jobId) => runs.filter(r => r.job_id === jobId);

  const validateJob = () => {
    if (!formData.name?.trim()) {
      toast.error("Job name is required");
      return false;
    }
    if (!formData.source_connection_id) {
      toast.error("Source connection is required");
      return false;
    }
    if (!formData.target_connection_id) {
      toast.error("Target connection is required");
      return false;
    }
    if (formData.source_connection_id === formData.target_connection_id) {
      toast.error("Source and target connections must be different");
      return false;
    }
    if (!formData.selected_datasets || formData.selected_datasets.length === 0) {
       toast.error("At least one dataset must be selected");
       return false;
     }
    if (formData.schedule_type === "custom" && !formData.cron_expression?.trim()) {
      toast.error("Cron expression is required for custom schedule");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateJob()) {
      return;
    }

    setSaving(true);

    const payload = {
      ...formData,
      total_runs: editingJob?.total_runs || 0,
      successful_runs: editingJob?.successful_runs || 0,
      failed_runs: editingJob?.failed_runs || 0
    };

    if (editingJob) {
      await base44.entities.IngestionJob.update(editingJob.id, payload);
      await Promise.all([
        base44.entities.ActivityLog.create({ log_type: "info", category: "job", job_id: editingJob.id, message: `Job "${formData.name}" updated` }),
        saveVersion({ ...editingJob, ...payload }, "updated", commitMessage || `Updated by ${currentUser?.email || "user"}`)
      ]);
      toast.success("Job updated");
    } else {
      const created = await base44.entities.IngestionJob.create(payload);
      await Promise.all([
        base44.entities.ActivityLog.create({ log_type: "success", category: "job", job_id: created.id, message: `Job "${formData.name}" created` }),
        saveVersion({ ...created, ...payload }, "created", commitMessage || `Created by ${currentUser?.email || "user"}`)
      ]);
      toast.success("Job created");
    }

    setDialogOpen(false);
    setEditingJob(null);
    setFormData(defaultFormData);
    setCommitMessage("");
    setSaving(false);
    loadData();
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      name: job.name || "",
      description: job.description || "",
      source_connection_id: job.source_connection_id || "",
      target_connection_id: job.target_connection_id || "",
      selected_datasets: job.selected_datasets || [],
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
    if (!confirm(`Delete job "${job.name}"?`)) return;

    await base44.entities.IngestionJob.delete(job.id);
    await base44.entities.ActivityLog.create({
      log_type: "warning",
      category: "job",
      message: `Job "${job.name}" deleted`
    });
    toast.success("Job deleted");
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
      message: `Job "${job.name}" started`
    });

    toast.success("Job started");

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
        ? `Job "${job.name}" completed successfully - ${totalRows.toLocaleString()} rows processed`
        : `Job "${job.name}" failed - Connection timeout`
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
      message: `Job "${job.name}" retry attempt #${run.retry_count}`
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
      message: `Job "${job.name}" ${job.status === "paused" ? "resumed" : "paused"}`
    });

    toast.success(job.status === "paused" ? "Job resumed" : "Job paused");
    loadData();
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || j.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Data Transfer Jobs</h1>
          <p className="text-slate-500 mt-1">Configure and run data transfer jobs between connections</p>
        </div>
        <Button
           onClick={() => { setEditingJob(null); setFormData(defaultFormData); setDialogOpen(true); setActiveTab("general"); }}
           className="gap-2"
         >
          <Plus className="w-4 h-4" />
          New Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search jobs..."
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
          {filteredJobs.map((job) => {
            const sourceConn = getConnection(job.source_connection_id);
            const targetConn = getConnection(job.target_connection_id);
            const jobRuns = getJobRuns(job.id);
            const lastRun = jobRuns[0];

            return (
              <Card key={job.id} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 text-lg">{job.name}</h3>
                        <StatusBadge status={job.status} size="sm" />
                      </div>
                      {job.description && (
                        <p className="text-sm text-slate-500 mb-3">{job.description}</p>
                      )}

                      {/* Connection Flow */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {sourceConn && (
                          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                            <PlatformIcon platform={sourceConn.platform} size="sm" />
                            <span className="text-sm text-slate-600">{sourceConn.name}</span>
                          </div>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        {targetConn && (
                          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                            <PlatformIcon platform={targetConn.platform} size="sm" />
                            <span className="text-sm text-slate-600">{targetConn.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                         <p className="text-slate-400">Datasets</p>
                         <p className="font-semibold text-slate-900">{job.selected_datasets?.length || 0}</p>
                       </div>
                      <div className="text-center">
                        <p className="text-slate-400">Runs</p>
                        <p className="font-semibold text-slate-900">{job.total_runs || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400">Success</p>
                        <p className="font-semibold text-emerald-600">
                          {job.total_runs ? Math.round((job.successful_runs || 0) / job.total_runs * 100) : 0}%
                        </p>
                      </div>
                      {job.last_run && (
                        <div className="text-center">
                          <p className="text-slate-400">Last Run</p>
                          <p className="text-slate-600">{moment(job.last_run).fromNow()}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExportJob(job)}
                        className="gap-1 text-slate-500"
                        title="Export Job Spec"
                      >
                        <FileJson className="w-4 h-4" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryDialogJob(job)}
                        className="gap-1 text-slate-500"
                      >
                        <GitCommitHorizontal className="w-4 h-4" />
                        History
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setViewingJob(job); setDetailsDialogOpen(true); }}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRunJob(job)}
                        disabled={job.status === "running" || job.status === "paused"}
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Play className="w-4 h-4" />
                        Run
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRetryJob(job)} disabled={job.status !== "failed"}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Retry Failed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePauseJob(job)}>
                            <Pause className="w-4 h-4 mr-2" />
                            {job.status === "paused" ? "Resume" : "Pause"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(job)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(job)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Play className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm ? "Try adjusting your search" : "Create your first data transfer job"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Job
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Job Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? "Edit Job" : "New Data Transfer Job"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="datasets">Datasets</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                {formData.enable_advanced && <TabsTrigger value="advanced">Advanced</TabsTrigger>}
                <TabsTrigger value="spec">Job Spec</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <Label>Job Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Daily Sales Sync"
                    required
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Assignment Group</Label>
                    <Input
                      value={formData.assignment_group}
                      onChange={(e) => setFormData({ ...formData, assignment_group: e.target.value })}
                      placeholder="e.g. Data Engineering"
                    />
                  </div>
                  <div>
                    <Label>Cost Center</Label>
                    <Input
                      value={formData.cost_center}
                      onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                      placeholder="e.g. CC-12345"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Email (Optional)</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="notification@example.com"
                    />
                  </div>
                </div>



                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Source Connection</Label>
                    <Select
                      value={formData.source_connection_id}
                      onValueChange={(v) => setFormData({ ...formData, source_connection_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceConnections.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <span>{platformConfig[c.platform]?.label}</span>
                              <span className="text-slate-400">-</span>
                              <span>{c.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Connection</Label>
                    <Select
                      value={formData.target_connection_id}
                      onValueChange={(v) => setFormData({ ...formData, target_connection_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetConnections.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <span>{platformConfig[c.platform]?.label}</span>
                              <span className="text-slate-400">-</span>
                              <span>{c.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="datasets" className="space-y-4 mt-4">
                <div>
                  <Label className="mb-2 block">Select Tables/Datasets to Transfer</Label>
                  <ObjectSelector
                    selectedObjects={formData.selected_datasets}
                    onChange={(objects) => setFormData({ ...formData, selected_datasets: objects })}
                  />
                </div>


              </TabsContent>

              <TabsContent value="settings" className="space-y-5 mt-4">

                {/* ── Delivery Channel ── */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-4 h-4 text-purple-600" />
                    <h4 className="font-semibold text-slate-900 text-sm">Delivery Channel</h4>
                  </div>

                  <div className="flex gap-3">
                    {[
                      { value: "pull", label: "Pull", description: "Target system pulls data from source" },
                      { value: "push", label: "Push", description: "Source system pushes data to target" }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            delivery_channel: opt.value,
                            // Reset schedule if switching to push
                            ...(opt.value === "push" && { schedule_type: "manual", cron_expression: "" })
                          }));
                        }}
                        className={`flex-1 p-3 rounded-lg border text-sm transition-all ${
                          formData.delivery_channel === opt.value
                            ? "border-purple-600 bg-purple-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="font-medium text-slate-900">{opt.label}</div>
                        <div className="text-xs text-slate-500 mt-1">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Schedule (only for pull) ── */}
                {formData.delivery_channel === "pull" && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-slate-900 text-sm">Schedule</h4>
                  </div>

                  {/* Run Frequency buttons */}
                  <div>
                    <Label className="text-xs text-slate-500 mb-2 block">Run Frequency</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "manual",  label: "Manual" },
                        { value: "hourly",  label: "Hourly" },
                        { value: "daily",   label: "Daily" },
                        { value: "weekly",  label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const cronMap = { hourly: "0 * * * *", daily: "0 6 * * *", weekly: "0 6 * * 1", monthly: "0 6 1 * *" };
                            setFormData(prev => ({
                              ...prev,
                              schedule_type: opt.value,
                              cron_expression: cronMap[opt.value] || prev.cron_expression
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            formData.schedule_type === opt.value
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hourly */}
                  {formData.schedule_type === "hourly" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">At minute</Label>
                        <Select
                          value={formData.cron_expression?.split(" ")[0] || "0"}
                          onValueChange={v => setFormData(prev => ({ ...prev, cron_expression: `${v} * * * *` }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[0,5,10,15,20,30,45].map(m => (
                              <SelectItem key={m} value={String(m)}>:{String(m).padStart(2,"0")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-400 mt-1">Runs at HH:{(formData.cron_expression?.split(" ")[0] || "0").padStart(2,"0")} every hour</p>
                      </div>
                    </div>
                  )}

                  {/* Daily */}
                  {formData.schedule_type === "daily" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Hour (UTC)</Label>
                        <Select
                          value={formData.cron_expression?.split(" ")[1] || "6"}
                          onValueChange={v => {
                            const min = formData.cron_expression?.split(" ")[0] || "0";
                            setFormData(prev => ({ ...prev, cron_expression: `${min} ${v} * * *` }));
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({length:24},(_,i)=>i).map(h => (
                              <SelectItem key={h} value={String(h)}>{String(h).padStart(2,"0")}:00 UTC</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Minute</Label>
                        <Select
                          value={formData.cron_expression?.split(" ")[0] || "0"}
                          onValueChange={v => {
                            const hr = formData.cron_expression?.split(" ")[1] || "6";
                            setFormData(prev => ({ ...prev, cron_expression: `${v} ${hr} * * *` }));
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[0,5,10,15,20,30,45].map(m => (
                              <SelectItem key={m} value={String(m)}>:{String(m).padStart(2,"0")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 text-xs text-slate-400">
                        Cron: <code className="font-mono">{formData.cron_expression || "0 6 * * *"}</code>
                      </div>
                    </div>
                  )}

                  {/* Weekly */}
                  {formData.schedule_type === "weekly" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Day of Week</Label>
                        <Select
                          value={formData.cron_expression?.split(" ")[4] || "1"}
                          onValueChange={v => {
                            const parts = (formData.cron_expression || "0 6 * * 1").split(" ");
                            parts[4] = v;
                            setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d,i) => (
                              <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Hour (UTC)</Label>
                        <Select
                          value={formData.cron_expression?.split(" ")[1] || "6"}
                          onValueChange={v => {
                            const parts = (formData.cron_expression || "0 6 * * 1").split(" ");
                            parts[1] = v;
                            setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({length:24},(_,i)=>i).map(h => (
                              <SelectItem key={h} value={String(h)}>{String(h).padStart(2,"0")}:00 UTC</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 text-xs text-slate-400">
                        Cron: <code className="font-mono">{formData.cron_expression || "0 6 * * 1"}</code>
                      </div>
                    </div>
                  )}

                  {/* Monthly */}
                  {formData.schedule_type === "monthly" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Day of Month</Label>
                        <Select
                          value={formData.cron_expression?.split(" ")[2] || "1"}
                          onValueChange={v => {
                            const parts = (formData.cron_expression || "0 6 1 * *").split(" ");
                            parts[2] = v;
                            setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({length:28},(_,i)=>i+1).map(d => (
                              <SelectItem key={d} value={String(d)}>{d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Hour (UTC)</Label>
                        <Select
                          value={formData.cron_expression?.split(" ")[1] || "6"}
                          onValueChange={v => {
                            const parts = (formData.cron_expression || "0 6 1 * *").split(" ");
                            parts[1] = v;
                            setFormData(prev => ({ ...prev, cron_expression: parts.join(" ") }));
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({length:24},(_,i)=>i).map(h => (
                              <SelectItem key={h} value={String(h)}>{String(h).padStart(2,"0")}:00 UTC</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 text-xs text-slate-400">
                        Cron: <code className="font-mono">{formData.cron_expression || "0 6 1 * *"}</code>
                      </div>
                    </div>
                  )}

                  {formData.schedule_type === "manual" && (
                    <p className="text-xs text-slate-400">This job will only run when triggered manually.</p>
                  )}

                  {/* Custom Calendar toggle + Include/Exclude — shown for all non-manual types */}
                  {formData.schedule_type !== "manual" && (
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      {/* Custom Calendar toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Use Custom Calendar</p>
                          <p className="text-xs text-slate-400">Apply include/exclude date rules (e.g. bank holidays)</p>
                        </div>
                        <Switch
                          checked={!!formData.use_custom_calendar}
                          onCheckedChange={checked => setFormData(prev => ({ ...prev, use_custom_calendar: checked }))}
                        />
                      </div>

                      {/* Include / Exclude pickers — only when custom calendar is on */}
                      {formData.use_custom_calendar && (
                        <div className="grid grid-cols-2 gap-4">
                          {/* Include Calendar */}
                          <div>
                            <Label className="text-xs text-slate-700 font-semibold mb-1 block">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1" />
                              Include Calendar
                            </Label>
                            <p className="text-xs text-slate-400 mb-2">Run ONLY on these dates (e.g. bank holidays to include)</p>
                            <Select
                              value={formData.include_calendar_id || ""}
                              onValueChange={v => setFormData(prev => ({ ...prev, include_calendar_id: v || null }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select calendar..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={null}>None</SelectItem>
                                <SelectItem value="__coming_soon__" disabled>— No calendars configured yet —</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Exclude Calendar */}
                          <div>
                            <Label className="text-xs text-slate-700 font-semibold mb-1 block">
                              <span className="w-2 h-2 rounded-full bg-red-400 inline-block mr-1" />
                              Exclude Calendar
                            </Label>
                            <p className="text-xs text-slate-400 mb-2">SKIP runs on these dates (e.g. bank holidays to exclude)</p>
                            <Select
                              value={formData.exclude_calendar_id || ""}
                              onValueChange={v => setFormData(prev => ({ ...prev, exclude_calendar_id: v }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select calendar..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={null}>None</SelectItem>
                                <SelectItem value="__coming_soon__" disabled>— No calendars configured yet —</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* ── Retry Configuration ── */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <h4 className="font-semibold text-slate-900 text-sm">Retry Configuration</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Max Retries</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={formData.retry_config.max_retries}
                          onChange={(e) => setFormData({
                            ...formData,
                            retry_config: { ...formData.retry_config, max_retries: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">0 = no retries</p>
                    </div>
                    <div>
                      <Label className="text-xs">Initial Delay (seconds)</Label>
                      <Select
                        value={String(formData.retry_config.retry_delay_seconds)}
                        onValueChange={v => setFormData({
                          ...formData,
                          retry_config: { ...formData.retry_config, retry_delay_seconds: Number(v) }
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[15,30,60,120,300,600,1800,3600].map(s => (
                            <SelectItem key={s} value={String(s)}>
                              {s < 60 ? `${s}s` : s < 3600 ? `${s/60}m` : `${s/3600}h`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Exponential Backoff</p>
                      <p className="text-xs text-slate-400">
                        {formData.retry_config.exponential_backoff
                          ? `Delays: ${[...Array(Math.min(formData.retry_config.max_retries || 3, 4))].map((_,i) => {
                              const d = formData.retry_config.retry_delay_seconds * Math.pow(2, i);
                              return d < 60 ? `${d}s` : `${Math.round(d/60)}m`;
                            }).join(" → ")}${(formData.retry_config.max_retries||3) > 4 ? " →…" : ""}`
                          : "Fixed delay between retries"
                        }
                      </p>
                    </div>
                    <Switch
                      checked={formData.retry_config.exponential_backoff}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        retry_config: { ...formData.retry_config, exponential_backoff: checked }
                      })}
                    />
                  </div>
                {/* ── Advanced Features Toggle ── */}
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Advanced Features</p>
                      <p className="text-xs text-slate-400">Enable advanced options for data quality, column mapping, and cleansing</p>
                    </div>
                    <Switch
                      checked={formData.enable_advanced}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, enable_advanced: checked }));
                        if (!checked && activeTab === "advanced") setActiveTab("settings");
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ── Advanced Tab ── */}
              {formData.enable_advanced && (
              <TabsContent value="advanced" className="space-y-5 mt-4">
                {/* Security Section */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-slate-900 text-sm">Security & Access Control</h4>
                  </div>
                  <div>
                    <Label>Job-Level Access Entitlements</Label>
                    <p className="text-xs text-slate-500 mb-2">Roles/entitlements that can access this job. Datasets inherit these unless overridden.</p>
                    <Input
                      value={formData.access_entitlements?.join(", ") || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        access_entitlements: e.target.value.split(",").map(s => s.trim()).filter(s => s)
                      })}
                      placeholder="e.g. data_analyst, data_engineer, admin"
                    />
                  </div>

                  {formData.selected_datasets?.length > 0 && (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div>
                        <Label className="text-sm">Dataset-Level Access Entitlements</Label>
                        <p className="text-xs text-slate-500 mb-2">
                          Configure access for individual datasets. Leave empty to inherit job-level entitlements: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{formData.access_entitlements?.length > 0 ? formData.access_entitlements.join(", ") : "(none set)"}</code>
                        </p>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {formData.selected_datasets.map((obj, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                            <div className="font-medium text-sm text-slate-900">
                              {obj.schema}.{obj.table}
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Data Classification</Label>
                              <Select 
                                value={obj.data_classification || ""} 
                                onValueChange={(v) => {
                                  const updated = [...formData.selected_datasets];
                                  updated[idx].data_classification = v;
                                  setFormData({ ...formData, selected_datasets: updated });
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select classification" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="confidential">Confidential</SelectItem>
                                  <SelectItem value="personal_class_1">Personal Class 1</SelectItem>
                                  <SelectItem value="personal_class_1_pci">Personal Class 1 - PCI</SelectItem>
                                  <SelectItem value="personal_class_2">Personal Class 2</SelectItem>
                                  <SelectItem value="personal_class_3">Personal Class 3</SelectItem>
                                  <SelectItem value="personal_class_4">Personal Class 4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              value={obj.access_entitlements?.join(", ") || ""}
                              onChange={(e) => {
                                const updated = [...formData.selected_datasets];
                                updated[idx].access_entitlements = e.target.value.split(",").map(s => s.trim()).filter(s => s);
                                setFormData({ ...formData, selected_datasets: updated });
                              }}
                              placeholder="e.g. data_analyst, finance_user (empty = inherit job-level)"
                              className="text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <AdvancedTab
                   selectedObjects={formData.selected_datasets}
                  columnMappings={formData.column_mappings}
                  dqRules={formData.dq_rules}
                  cleansing={formData.data_cleansing}
                  onMappingsChange={handleMappingsChange}
                  onRulesChange={handleRulesChange}
                  onCleansingChange={handleCleansingChange}
                />
              </TabsContent>
              )}
              {/* ── Job Spec Tab ── */}
              <TabsContent value="spec" className="mt-4">
                <JobSpecTabPreview formData={formData} connections={connections} />
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t space-y-3">
              <div>
                <Label className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                  <GitCommitHorizontal className="w-3.5 h-3.5" />
                  Commit message (optional)
                </Label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="Describe what changed..."
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {viewingJob?.name}
              {viewingJob && <StatusBadge status={viewingJob.status} size="sm" />}
            </DialogTitle>
          </DialogHeader>

          {viewingJob && (
            <div className="space-y-6">
              {/* Job Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Total Runs</span>
                  <p className="font-medium">{viewingJob.total_runs || 0}</p>
                </div>
                <div>
                  <span className="text-slate-500">Success Rate</span>
                  <p className="font-medium text-emerald-600">
                    {viewingJob.total_runs 
                      ? Math.round((viewingJob.successful_runs || 0) / viewingJob.total_runs * 100) 
                      : 0}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Last Run</span>
                  <p className="font-medium">
                    {viewingJob.last_run ? moment(viewingJob.last_run).format("MMM D, YYYY h:mm A") : "Never"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Schedule</span>
                  <p className="font-medium capitalize">{viewingJob.schedule_type}</p>
                </div>
              </div>

              {/* Selected Datasets */}
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Selected Datasets ({viewingJob.selected_datasets?.length || 0})</h4>
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {viewingJob.selected_datasets?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Schema</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Table</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Target Path</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingJob.selected_datasets.map((obj, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-600">{obj.schema}</td>
                            <td className="px-3 py-2 text-slate-900">{obj.table}</td>
                            <td className="px-3 py-2 text-slate-500">{obj.target_path}</td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                      ) : (
                      <p className="p-4 text-center text-slate-500">No datasets selected</p>
                      )}
                      </div>
                      </div>

              {/* Run History */}
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Run History</h4>
                <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                  {getJobRuns(viewingJob.id).length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Run #</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Rows</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Duration</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getJobRuns(viewingJob.id).map((run) => (
                          <tr key={run.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">#{run.run_number}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={run.status} size="sm" />
                            </td>
                            <td className="px-3 py-2">{(run.rows_processed || 0).toLocaleString()}</td>
                            <td className="px-3 py-2">{run.duration_seconds ? `${run.duration_seconds}s` : "-"}</td>
                            <td className="px-3 py-2 text-slate-500">
                              {moment(run.started_at || run.created_date).format("MMM D, h:mm A")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="p-4 text-center text-slate-500">No runs yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}