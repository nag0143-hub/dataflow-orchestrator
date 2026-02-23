import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Clock,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SkeletonLoader from "@/components/SkeletonLoader";
import { createIndex } from "@/components/dataIndexing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";

const logTypeConfig = {
  info: { icon: Info, color: "bg-blue-100 text-blue-700 border-blue-200", dotColor: "bg-blue-500" },
  warning: { icon: AlertTriangle, color: "bg-amber-100 text-amber-700 border-amber-200", dotColor: "bg-amber-500" },
  error: { icon: AlertCircle, color: "bg-red-100 text-red-700 border-red-200", dotColor: "bg-red-500" },
  success: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 border-emerald-200", dotColor: "bg-emerald-500" },
};

const categoryConfig = {
  connection: { label: "Connection", color: "bg-purple-100 text-purple-700" },
  job: { label: "Job", color: "bg-blue-100 text-blue-700" },
  system: { label: "System", color: "bg-slate-100 text-slate-700" },
  authentication: { label: "Auth", color: "bg-orange-100 text-orange-700" },
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [logsData, jobsData, connectionsData] = await Promise.all([
      base44.entities.ActivityLog.list("-created_date", 500),
      base44.entities.IngestionJob.list(),
      base44.entities.Connection.list()
    ]);
    setLogs(logsData);
    setJobs(jobsData);
    setConnections(connectionsData);
    setLoading(false);
  };

  // Indexed lookups for better performance
  const jobIndex = createIndex(jobs, "id");
  const connectionIndex = createIndex(connections, "id");
  
  const getJobName = (jobId) => jobIndex.get(jobId)?.name || "Unknown Job";
  const getConnectionName = (connId) => connectionIndex.get(connId)?.name || "Unknown Connection";

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || log.log_type === filterType;
    const matchesCategory = filterCategory === "all" || log.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterCategory]);

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "Type", "Category", "Message", "Job", "Connection"].join(","),
      ...filteredLogs.map(log => [
        moment(log.created_date).format("YYYY-MM-DD HH:mm:ss"),
        log.log_type,
        log.category,
        `"${log.message?.replace(/"/g, '""') || ""}"`,
        log.job_id ? getJobName(log.job_id) : "",
        log.connection_id ? getConnectionName(log.connection_id) : ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${moment().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
  };

  const hasFilters = searchTerm || filterType !== "all" || filterCategory !== "all";

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.log_type === "error").length,
    warnings: logs.filter(l => l.log_type === "warning").length,
    today: logs.filter(l => moment(l.created_date).isSame(moment(), 'day')).length
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-96 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({length:4}).map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <SkeletonLoader count={8} height="h-16" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Activity Logs</h1>
          <p className="text-slate-500 mt-1">Monitor all system activities and errors</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Total Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                <p className="text-sm text-slate-500">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.warnings}</p>
                <p className="text-sm text-slate-500">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.today}</p>
                <p className="text-sm text-slate-500">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="connection">Connection</SelectItem>
            <SelectItem value="job">Job</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="authentication">Authentication</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Logs List */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {paginatedLogs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {paginatedLogs.map((log) => {
                const typeConfig = logTypeConfig[log.log_type] || logTypeConfig.info;
                const catConfig = categoryConfig[log.category] || categoryConfig.system;
                const Icon = typeConfig.icon;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => { setSelectedLog(log); setDetailsOpen(true); }}
                  >
                    {/* Type Indicator */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      typeConfig.color.split(" ")[0]
                    )}>
                      <Icon className={cn("w-4 h-4", typeConfig.color.split(" ")[1])} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={cn("text-xs", catConfig.color)}>
                          {catConfig.label}
                        </Badge>
                        {log.job_id && (
                          <span className="text-xs text-slate-500">
                            Job: {getJobName(log.job_id)}
                          </span>
                        )}
                        {log.connection_id && (
                          <span className="text-xs text-slate-500">
                            Connection: {getConnectionName(log.connection_id)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-900">{log.message}</p>
                      {log.object_name && (
                        <p className="text-xs text-slate-500 mt-1">Object: {log.object_name}</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <p className="text-sm text-slate-500">
                        {moment(log.created_date).format("h:mm A")}
                      </p>
                      <p className="text-xs text-slate-400">
                        {moment(log.created_date).format("MMM D")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No logs found</h3>
              <p className="text-slate-500">
                {hasFilters ? "Try adjusting your filters" : "Activity logs will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * logsPerPage + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded text-sm font-medium ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-slate-400">...</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Log Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const typeConfig = logTypeConfig[selectedLog.log_type] || logTypeConfig.info;
                  const Icon = typeConfig.icon;
                  return (
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      typeConfig.color.split(" ")[0]
                    )}>
                      <Icon className={cn("w-5 h-5", typeConfig.color.split(" ")[1])} />
                    </div>
                  );
                })()}
                <div>
                  <p className="font-medium text-slate-900 capitalize">{selectedLog.log_type}</p>
                  <p className="text-sm text-slate-500">
                    {moment(selectedLog.created_date).format("MMM D, YYYY h:mm:ss A")}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-900">{selectedLog.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Category</p>
                  <p className="font-medium capitalize">{selectedLog.category}</p>
                </div>
                {selectedLog.job_id && (
                  <div>
                    <p className="text-slate-500">Job</p>
                    <p className="font-medium">{getJobName(selectedLog.job_id)}</p>
                  </div>
                )}
                {selectedLog.connection_id && (
                  <div>
                    <p className="text-slate-500">Connection</p>
                    <p className="font-medium">{getConnectionName(selectedLog.connection_id)}</p>
                  </div>
                )}
                {selectedLog.run_id && (
                  <div>
                    <p className="text-slate-500">Run ID</p>
                    <p className="font-medium font-mono text-xs">{selectedLog.run_id}</p>
                  </div>
                )}
                {selectedLog.object_name && (
                  <div>
                    <p className="text-slate-500">Object</p>
                    <p className="font-medium">{selectedLog.object_name}</p>
                  </div>
                )}
              </div>

              {selectedLog.stack_trace && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Stack Trace</p>
                  <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Additional Details</p>
                  <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}