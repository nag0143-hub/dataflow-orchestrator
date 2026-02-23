import { useState, useEffect } from "react";
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
  RefreshCw
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
import { useTenant } from "@/components/useTenant";
import moment from "moment";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCommitHorizontal } from "lucide-react";
import PySparkCodeGenerator from "@/components/PySparkCodeGenerator";

const defaultFormData = {
  name: "",
  description: "",
  source_connection_id: "",
  target_connection_id: "",
  selected_objects: [],
  schedule_type: "manual",
  cron_expression: "",
  status: "idle",
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
        selected_objects: job.selected_objects,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      selected_objects: job.selected_objects || [],
      schedule_type: job.schedule_type || "manual",
      cron_expression: job.cron_expression || "",
      status: job.status || "idle",
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
    const objects = job.selected_objects || [];
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
      objects_completed: success ? objects.map(o => `${o.schema}.${o.table}`) : objects.slice(0, Math.floor(objects.length * 0.6)).map(o => `${o.schema}.${o.table}`),
      objects_failed: success ? [] : objects.slice(Math.floor(objects.length * 0.6)).map(o => `${o.schema}.${o.table}`),
      error_message: success ? null : "Connection timeout on remaining objects"
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ingestion Jobs</h1>
          <p className="text-slate-500 mt-1">Configure and run data transfer jobs</p>
        </div>
        <Button
          onClick={() => { setEditingJob(null); setFormData(defaultFormData); setDialogOpen(true); setActiveTab("general"); }}
          className="bg-slate-900 hover:bg-slate-800 gap-2"
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
                        <p className="text-slate-400">Objects</p>
                        <p className="font-semibold text-slate-900">{job.selected_objects?.length || 0}</p>
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
              {searchTerm ? "Try adjusting your search" : "Create your first ingestion job"}
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
              {editingJob ? "Edit Job" : "New Ingestion Job"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="objects">Objects</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
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

              <TabsContent value="objects" className="space-y-4 mt-4">
                <div>
                  <Label className="mb-2 block">Select Tables/Objects to Ingest</Label>
                  <ObjectSelector
                    selectedObjects={formData.selected_objects}
                    onChange={(objects) => setFormData({ ...formData, selected_objects: objects })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 mt-4">
                <div>
                  <Label>Schedule Type</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(v) => setFormData({ ...formData, schedule_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom (Cron)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.schedule_type === "custom" && (
                  <div>
                    <Label>Cron Expression</Label>
                    <Input
                      value={formData.cron_expression}
                      onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                      placeholder="0 0 * * *"
                    />
                    <p className="text-xs text-slate-500 mt-1">Standard cron format</p>
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-slate-900">Retry Configuration</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Retries</Label>
                      <Input
                        type="number"
                        value={formData.retry_config.max_retries}
                        onChange={(e) => setFormData({
                          ...formData,
                          retry_config: { ...formData.retry_config, max_retries: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Retry Delay (seconds)</Label>
                      <Input
                        type="number"
                        value={formData.retry_config.retry_delay_seconds}
                        onChange={(e) => setFormData({
                          ...formData,
                          retry_config: { ...formData.retry_config, retry_delay_seconds: Number(e.target.value) }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exponential Backoff</Label>
                      <p className="text-xs text-slate-500">Increase delay between retries</p>
                    </div>
                    <Switch
                      checked={formData.retry_config.exponential_backoff}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        retry_config: { ...formData.retry_config, exponential_backoff: checked }
                      })}
                    />
                  </div>
                </div>
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
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Selected Objects */}
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Selected Objects ({viewingJob.selected_objects?.length || 0})</h4>
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {viewingJob.selected_objects?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Schema</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Table</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Target Path</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingJob.selected_objects.map((obj, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-600">{obj.schema}</td>
                            <td className="px-3 py-2 text-slate-900">{obj.table}</td>
                            <td className="px-3 py-2 text-slate-500">{obj.target_path}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="p-4 text-center text-slate-500">No objects selected</p>
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