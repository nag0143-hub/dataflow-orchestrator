import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Cable, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  Activity,
  RefreshCw,
  Workflow,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { useTenant } from "@/components/useTenant";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorState from "@/components/ErrorState";
import { createIndex } from "@/components/dataIndexing";
import moment from "moment";

import AirflowSection from "@/components/AirflowSection";

export default function Dashboard() {
  const { scope } = useTenant();
  const [connections, setConnections] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [connectionsData, jobsData, runsData, logsData] = await Promise.all([
        base44.entities.Connection.list(),
        base44.entities.Pipeline.list(),
        base44.entities.PipelineRun.list("-created_date", 50),
        base44.entities.ActivityLog.list("-created_date", 10),
      ]);
      setConnections(scope(connectionsData));
      setJobs(scope(jobsData));
      setRuns(runsData);
      setLogs(logsData);
    } catch (err) {
      console.error("[Dashboard] loadData error:", err);
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalConnections: connections.length,
    activeConnections: connections.filter(c => c.status === "active").length,
    totalJobs: jobs.length,
    runningJobs: jobs.filter(j => j.status === "running").length,
    completedRuns: runs.filter(r => r.status === "completed").length,
    failedRuns: runs.filter(r => r.status === "failed").length,
  };

  const recentRuns = runs.slice(0, 10);
  const jobIndex = createIndex(jobs, "id");

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          ))}
        </div>
        <SkeletonLoader count={5} height="h-16" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Failed to load dashboard" message={error} onRetry={loadData} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor your data pipelines and connections</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Connections" 
            value={stats.totalConnections}
            subtitle={`${stats.activeConnections} active`}
            icon={Cable}
          />
          <StatCard 
            title="Ingestion Pipelines" 
            value={stats.totalJobs}
            subtitle={`${stats.runningJobs} running`}
            icon={Play}
          />
          <StatCard 
            title="Successful Runs" 
            value={stats.completedRuns}
            icon={CheckCircle2}
          />
          <StatCard 
            title="Failed Runs" 
            value={stats.failedRuns}
            icon={XCircle}
          />
        </div>

        {/* Recent Pipeline Runs + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Pipeline Runs */}
          <Card className="lg:col-span-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 dark:text-white">
                  <Play className="w-5 h-5 text-blue-600" />
                  Recent Pipeline Runs
                </CardTitle>
                <Link to={createPageUrl("Pipelines")}>
                  <Button variant="outline" size="sm" className="gap-1">
                    View All Pipelines
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentRuns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4">Pipeline</th>
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4">Status</th>
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4">Rows</th>
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4">Duration</th>
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRuns.map((run) => {
                        const job = jobIndex.get(run.pipeline_id);
                        return (
                          <tr key={run.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-900 dark:text-slate-100">{job?.name || "Unknown Pipeline"}</span>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={run.status} size="sm" />
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                              {(run.rows_processed || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                              {run.duration_seconds ? `${run.duration_seconds}s` : "-"}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
                              {moment(run.started_at || run.created_date).fromNow()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No pipeline runs yet</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Create and run a pipeline to see activity here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 dark:text-white">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Recent Activity
                </CardTitle>
                <Link to={createPageUrl("ActivityLogs")}>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.length > 0 ? logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      log.log_type === 'error' ? 'bg-red-500' :
                      log.log_type === 'warning' ? 'bg-amber-500' :
                      log.log_type === 'success' ? 'bg-emerald-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{log.message}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{moment(log.created_date).fromNow()}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to={createPageUrl("Connections")}>
            <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Cable className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">Manage Connections</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Add or configure data sources and targets</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl("Pipelines")}>
            <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Play className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">Create Pipeline</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Set up bulk data transfers with retry logic</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl("UserGuide")}>
            <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">User Guide</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Learn how to use DataFlow step-by-step</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        </div>

{/* Airflow DAGs — lazy loaded */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Apache Airflow DAGs</h2>
          <ErrorBoundary>
            <AirflowSection />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}