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
  TrendingUp,
  Database,
  Cloud
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import PlatformIcon from "@/components/PlatformIcon";
import { useTenant } from "@/components/useTenant";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

export default function Dashboard() {
  const { scope } = useTenant();
  const [connections, setConnections] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [connectionsData, jobsData, runsData, logsData] = await Promise.all([
      base44.entities.Connection.list(),
      base44.entities.IngestionJob.list(),
      base44.entities.JobRun.list("-created_date", 50),
      base44.entities.ActivityLog.list("-created_date", 10)
    ]);
    setConnections(scope(connectionsData));
    setJobs(scope(jobsData));
    setRuns(runsData);
    setLogs(logsData);
    setLoading(false);
  };

  const stats = {
    totalConnections: connections.length,
    activeConnections: connections.filter(c => c.status === "active").length,
    totalJobs: jobs.length,
    runningJobs: jobs.filter(j => j.status === "running").length,
    completedRuns: runs.filter(r => r.status === "completed").length,
    failedRuns: runs.filter(r => r.status === "failed").length,
  };

  // Create chart data from runs
  const chartData = runs.slice(0, 7).reverse().map(run => ({
    date: moment(run.created_date).format("MMM D"),
    rows: run.rows_processed || 0,
    bytes: Math.round((run.bytes_transferred || 0) / 1024 / 1024)
  }));

  const recentRuns = runs.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor your data pipelines and connections</p>
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
          title="Ingestion Jobs" 
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

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Activity Chart */}
        <Card className="lg:col-span-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 dark:text-white">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Transfer Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRows" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rows" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorRows)" 
                    strokeWidth={2}
                    name="Rows Processed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 dark:text-slate-500">
                No transfer data yet
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
                <div className={`w-2 h-2 rounded-full mt-2 ${
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

      {/* Recent Job Runs */}
      <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold dark:text-white">Recent Job Runs</CardTitle>
            <Link to={createPageUrl("Jobs")}>
              <Button variant="outline" size="sm" className="gap-1">
                View All Jobs
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
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Job</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Rows</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Duration</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => {
                    const job = jobs.find(j => j.id === run.job_id);
                    return (
                      <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-900">{job?.name || "Unknown Job"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={run.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {(run.rows_processed || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {run.duration_seconds ? `${run.duration_seconds}s` : "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">
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
              <p className="text-slate-500">No job runs yet</p>
              <p className="text-sm text-slate-400">Create and run a job to see activity here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to={createPageUrl("Connections")}>
          <Card className="border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Cable className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Manage Connections
                </h3>
                <p className="text-sm text-slate-500">Add or configure data sources and targets</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
        
        <Link to={createPageUrl("Jobs")}>
          <Card className="border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Play className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Create Ingestion Job
                </h3>
                <p className="text-sm text-slate-500">Set up bulk data transfers with retry logic</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}