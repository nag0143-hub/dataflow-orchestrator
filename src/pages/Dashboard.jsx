import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Cable, Play, CheckCircle2, XCircle, Clock, ArrowRight,
  Activity, TrendingUp, Timer, RefreshCw, Zap, AlertTriangle,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import PlatformIcon, { platformConfig } from "@/components/PlatformIcon";
import { useTenant } from "@/components/useTenant";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import moment from "moment";
import { cn } from "@/lib/utils";

const LOG_DOT = { error: "bg-red-500", warning: "bg-amber-500", success: "bg-emerald-500", info: "bg-blue-500" };

function MetricCard({ title, value, sub, icon: Icon, color = "blue", pulse }) {
  const colors = {
    blue:    "from-blue-500 to-indigo-600",
    green:   "from-emerald-500 to-teal-600",
    red:     "from-red-500 to-rose-600",
    amber:   "from-amber-500 to-orange-500",
    violet:  "from-violet-500 to-purple-600",
  };
  return (
    <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shrink-0 relative`}>
          <Icon className="w-5 h-5 text-white" />
          {pulse && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">{title}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function JobStatusRow({ job, runs }) {
  const jobRuns = runs.filter(r => r.job_id === job.id);
  const successRate = job.total_runs
    ? Math.round((job.successful_runs || 0) / job.total_runs * 100)
    : null;
  const lastRun = jobRuns[0];
  const avgDuration = jobRuns.filter(r => r.duration_seconds).reduce((acc, r, _, a) => acc + r.duration_seconds / a.length, 0);

  return (
    <tr className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">{job.name}</span>
        </div>
        {job.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{job.description}</p>}
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={job.status} size="sm" />
      </td>
      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
        {job.total_runs || 0}
      </td>
      <td className="py-3 px-4">
        {successRate !== null ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 w-16">
              <div
                className={`h-1.5 rounded-full ${successRate >= 80 ? "bg-emerald-500" : successRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${successRate}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${successRate >= 80 ? "text-emerald-600" : successRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {successRate}%
            </span>
          </div>
        ) : <span className="text-xs text-slate-400">—</span>}
      </td>
      <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
        {avgDuration ? `${Math.round(avgDuration)}s` : "—"}
      </td>
      <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
        {job.last_run ? moment(job.last_run).fromNow() : "Never"}
      </td>
      <td className="py-3 px-4 text-xs font-mono text-slate-400">
        {job.schedule_type === "manual" ? "Manual" : job.schedule_type === "custom" ? (job.cron_expression || "Custom") : job.schedule_type}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const { scope } = useTenant();
  const [connections, setConnections] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = useCallback(async () => {
    const [connectionsData, jobsData, runsData, logsData] = await Promise.all([
      base44.entities.Connection.list(),
      base44.entities.IngestionJob.list(),
      base44.entities.JobRun.list("-created_date", 100),
      base44.entities.ActivityLog.list("-created_date", 20)
    ]);
    setConnections(scope(connectionsData));
    setJobs(scope(jobsData));
    setRuns(runsData);
    setLogs(logsData);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadData();

    // Real-time subscriptions
    const unsubJobs = base44.entities.IngestionJob.subscribe((event) => {
      setJobs(prev => {
        if (event.type === "create") return [...prev, event.data];
        if (event.type === "update") return prev.map(j => j.id === event.id ? event.data : j);
        if (event.type === "delete") return prev.filter(j => j.id !== event.id);
        return prev;
      });
    });

    const unsubRuns = base44.entities.JobRun.subscribe((event) => {
      setRuns(prev => {
        if (event.type === "create") return [event.data, ...prev].slice(0, 100);
        if (event.type === "update") return prev.map(r => r.id === event.id ? event.data : r);
        return prev;
      });
      setLastRefresh(new Date());
    });

    const unsubLogs = base44.entities.ActivityLog.subscribe((event) => {
      if (event.type === "create") {
        setLogs(prev => [event.data, ...prev].slice(0, 20));
        setLastRefresh(new Date());
      }
    });

    return () => { unsubJobs(); unsubRuns(); unsubLogs(); };
  }, []);

  // ── Computed metrics ──
  const completedRuns = runs.filter(r => r.status === "completed");
  const failedRuns    = runs.filter(r => r.status === "failed");
  const runningJobs   = jobs.filter(j => j.status === "running");
  const avgDuration   = completedRuns.length
    ? Math.round(completedRuns.filter(r => r.duration_seconds).reduce((a, r) => a + r.duration_seconds, 0) / completedRuns.length)
    : 0;
  const totalRows = completedRuns.reduce((a, r) => a + (r.rows_processed || 0), 0);

  // ── Chart: last 14 days bucketed by day ──
  const dailyBuckets = {};
  runs.forEach(r => {
    const day = moment(r.created_date).format("MMM D");
    if (!dailyBuckets[day]) dailyBuckets[day] = { date: day, completed: 0, failed: 0, rows: 0 };
    if (r.status === "completed") { dailyBuckets[day].completed++; dailyBuckets[day].rows += r.rows_processed || 0; }
    if (r.status === "failed")    dailyBuckets[day].failed++;
  });
  const chartData = Object.values(dailyBuckets).slice(-14);

  // ── Rows chart ──
  const rowsData = runs.filter(r => r.rows_processed > 0).slice(0, 10).reverse().map((r, i) => ({
    name: `#${r.run_number || i+1}`,
    rows: r.rows_processed || 0,
    status: r.status,
  }));

  // ── Jobs sorted: running first ──
  const sortedJobs = [...jobs].sort((a, b) => {
    const order = { running: 0, failed: 1, idle: 2, completed: 3, paused: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time pipeline monitoring · Updated {moment(lastRefresh).format("HH:mm:ss")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Running Jobs Banner */}
      {runningJobs.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Zap className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
            {runningJobs.length} job{runningJobs.length > 1 ? "s" : ""} currently running: {runningJobs.map(j => j.name).join(", ")}
          </p>
          <Link to={createPageUrl("Jobs")} className="ml-auto">
            <Button size="sm" variant="ghost" className="text-blue-700 dark:text-blue-400 gap-1 text-xs">
              View <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Active Connections" value={connections.filter(c => c.status === "active").length} sub={`of ${connections.length} total`} icon={Cable} color="blue" />
        <MetricCard title="Total Jobs" value={jobs.length} sub={`${runningJobs.length} running`} icon={Play} color="violet" pulse={runningJobs.length > 0} />
        <MetricCard title="Successful Runs" value={completedRuns.length} icon={CheckCircle2} color="green" />
        <MetricCard title="Failed Runs" value={failedRuns.length} icon={XCircle} color="red" />
        <MetricCard title="Avg Duration" value={avgDuration ? `${avgDuration}s` : "—"} sub="per completed run" icon={Timer} color="amber" />
        <MetricCard title="Total Rows Moved" value={totalRows > 1e6 ? `${(totalRows/1e6).toFixed(1)}M` : totalRows.toLocaleString()} icon={BarChart3} color="green" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run outcomes by day */}
        <Card className="lg:col-span-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Run Outcomes (last 14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: 12 }}
                  />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3,3,0,0]} maxBarSize={20} />
                  <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">No run data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
                <Activity className="w-4 h-4 text-emerald-600" />
                Live Activity
              </CardTitle>
              <Link to={createPageUrl("ActivityLogs")}>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.length > 0 ? logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${LOG_DOT[log.log_type] || "bg-slate-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">{log.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{moment(log.created_date).fromNow()}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rows processed sparkline */}
      {rowsData.length > 0 && (
        <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-white">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Rows Processed — Last 10 Completed Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={rowsData}>
                <defs>
                  <linearGradient id="rowsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: 12 }} formatter={v => [v.toLocaleString(), "Rows"]} />
                <Area type="monotone" dataKey="rows" stroke="#6366f1" strokeWidth={2} fill="url(#rowsGrad)" name="Rows Processed" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Job Performance Table */}
      <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold dark:text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600" />
              Job Performance
              {runningJobs.length > 0 && (
                <span className="text-xs font-normal bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full animate-pulse">
                  {runningJobs.length} live
                </span>
              )}
            </CardTitle>
            <Link to={createPageUrl("Jobs")}>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                Manage Jobs <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {["Job", "Status", "Total Runs", "Success Rate", "Avg Duration", "Last Run", "Schedule"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map(job => (
                    <JobStatusRow key={job.id} job={job} runs={runs} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No jobs configured yet</p>
              <Link to={createPageUrl("Jobs")}>
                <Button className="mt-3 gap-2" size="sm"><Play className="w-3.5 h-3.5" />Create Job</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to={createPageUrl("Connections")}>
          <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Cable className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors text-sm">Manage Connections</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add or configure data sources and targets</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl("Jobs")}>
          <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors text-sm">Create Ingestion Job</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Set up bulk data transfers with retry logic</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}