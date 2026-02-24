import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatusBadge from "@/components/StatusBadge";
import PlatformIcon from "@/components/PlatformIcon";
import { Eye, Play, MoreVertical, FileJson, GitCommitHorizontal, RotateCcw, Pause, Copy, Edit, Trash2, GitBranch } from "lucide-react";
import { ArrowRight } from "lucide-react";
import moment from "moment";
import GitCheckinDialog from "@/components/GitCheckinDialog";

export default function JobCard({
  job,
  sourceConn,
  targetConn,
  jobRuns,
  connections,
  onEdit,
  onDelete,
  onRun,
  onRetry,
  onPause,
  onClone,
  onViewDetails,
  onViewHistory,
  onExport,
}) {
  const lastRun = jobRuns[0];
  const [gitCheckinOpen, setGitCheckinOpen] = useState(false);

  return (
    <>
    <GitCheckinDialog
      open={gitCheckinOpen}
      onOpenChange={setGitCheckinOpen}
      pipelineData={{ ...job, _isUpdate: true }}
      connections={connections || []}
    />
    <Card className="border-slate-200 hover:shadow-lg transition-shadow">
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
            {job.sla_config?.enabled && (
              <div className="text-center">
                <p className="text-slate-400">SLA</p>
                <p className={`font-semibold ${job.sla_compliance_rate >= 95 ? 'text-emerald-600' : job.sla_compliance_rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                  {job.sla_compliance_rate || 0}%
                </p>
              </div>
            )}
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
              onClick={() => onExport(job)}
              className="gap-1 text-slate-500"
              title="Export Job Spec"
            >
              <FileJson className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewHistory(job)}
              className="gap-1 text-slate-500"
            >
              <GitCommitHorizontal className="w-4 h-4" />
              History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(job)}
              className="gap-1"
            >
              <Eye className="w-4 h-4" />
              Details
            </Button>
            <Button
              size="sm"
              onClick={() => onRun(job)}
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
                <DropdownMenuItem onClick={() => onRetry(job)} disabled={job.status !== "failed"}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Failed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPause(job)}>
                  <Pause className="w-4 h-4 mr-2" />
                  {job.status === "paused" ? "Resume" : "Pause"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onClone(job)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Clone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(job)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(job)}
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
}