import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Download, Eye, Search } from "lucide-react";
import moment from "moment";
import LineageGraph from "@/components/LineageGraph";
import { ExportOpenMetadataButton } from "@/components/OpenMetadataExporter";

export default function LineagePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [lineageData, setLineageData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.IngestionJob.list("-updated_date", 100),
    initialData: [],
  });

  const { data: connections } = useQuery({
    queryKey: ["connections"],
    queryFn: () => base44.entities.Connection.list(),
    initialData: [],
  });

  const filteredJobs = jobs.filter((job) =>
    job.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewLineage = async (job) => {
    setSelectedJob(job);
    setSelectedNode(null);
    setLoading(true);
    setLineageData(null);

    try {
      const response = await fetch("/api/generateLineage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch lineage: ${response.statusText}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from lineage API");
      }

      const data = JSON.parse(text);
      setLineageData(data);
    } catch (error) {
      console.error("Error loading lineage:", error);
      // Set a minimal lineage structure to display the job info
      setLineageData({
        source: connections.find((c) => c.id === job.source_connection_id) || { name: "Unknown", platform: "unknown" },
        target: connections.find((c) => c.id === job.target_connection_id) || { name: "Unknown", platform: "unknown" },
        assets: job.selected_datasets || [],
        execution: {
          schedule_type: job.schedule_type || "manual",
          total_runs: job.total_runs || 0,
          successful_runs: job.successful_runs || 0,
          next_run: job.next_run,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (nodeType, nodeData) => {
    setSelectedNode({ type: nodeType, data: nodeData });
  };

  const handleExport = (format) => {
    if (!lineageData) return;

    const dataStr =
      format === "json"
        ? JSON.stringify(lineageData, null, 2)
        : JSON.stringify(lineageData, null, 2); // Can extend for other formats

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lineage-${selectedJob.name}-${moment().format("YYYY-MM-DD-HHmmss")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Data Lineage</h1>
        <p className="text-slate-500 mt-2">View and export data lineage for integration with Collibra and other platforms</p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search jobs by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Jobs List */}
      <div className="grid gap-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <Card key={job.id} className="border border-slate-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{job.name}</h3>
                      {job.description && (
                        <p className="text-sm text-slate-500 mt-1">{job.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {job.selected_datasets?.length || 0} datasets
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {job.schedule_type || "manual"}
                      </Badge>
                      {job.last_run && (
                        <Badge variant="outline" className="text-xs">
                          Last run: {moment(job.last_run).fromNow()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleViewLineage(job)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Lineage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">No jobs found</p>
          </div>
        )}
      </div>

      {/* Lineage Viewer Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => {
        setSelectedJob(null);
        setLineageData(null);
        setSelectedNode(null);
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lineage — {selectedJob?.name}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-500">Loading lineage...</p>
            </div>
          ) : lineageData && selectedJob ? (
            <div className="space-y-6">
              {/* Graph Visualization */}
              <LineageGraph
                job={selectedJob}
                connections={connections}
                onNodeClick={handleNodeClick}
              />

              {/* Selected Node Details */}
              {selectedNode && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {selectedNode.type === "source" && "Source System Details"}
                      {selectedNode.type === "target" && "Target System Details"}
                      {selectedNode.type === "job" && "Job Details"}
                      {selectedNode.type === "dataset" && `Dataset: ${selectedNode.data.id}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {(selectedNode.type === "source" || selectedNode.type === "target") && (
                      <>
                        <div>
                          <span className="text-slate-600 font-medium">Connection Name:</span>
                          <p className="text-slate-900">{selectedNode.data.name}</p>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Platform:</span>
                          <p className="text-slate-900">{selectedNode.data.platform}</p>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Host:</span>
                          <p className="text-slate-900">{selectedNode.data.host || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Status:</span>
                          <Badge className="mt-1">{selectedNode.data.status}</Badge>
                        </div>
                      </>
                    )}
                    {selectedNode.type === "job" && (
                      <>
                        <div>
                          <span className="text-slate-600 font-medium">Schedule:</span>
                          <p className="text-slate-900 capitalize">{selectedNode.data.schedule_type}</p>
                        </div>
                        <div>
                          <span className="text-slate-600 font-medium">Total Runs:</span>
                          <p className="text-slate-900">{selectedNode.data.total_runs || 0}</p>
                        </div>
                      </>
                    )}
                    {selectedNode.type === "dataset" && (
                      <>
                        <div>
                          <span className="text-slate-600 font-medium">Load Method:</span>
                          <Badge className="mt-1">{selectedNode.data.load_method || "append"}</Badge>
                        </div>
                        {selectedNode.data.filter_query && (
                          <div>
                            <span className="text-slate-600 font-medium">Filter:</span>
                            <code className="block bg-white rounded p-2 text-xs mt-1 overflow-x-auto">
                              {selectedNode.data.filter_query}
                            </code>
                          </div>
                        )}
                        {selectedNode.data.incremental_column && (
                          <div>
                            <span className="text-slate-600 font-medium">Incremental Column:</span>
                            <p className="text-slate-900">{selectedNode.data.incremental_column}</p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Source → Target Flow */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-4">Data Flow</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-slate-500">Source System</div>
                    <div className="font-medium text-slate-900">{lineageData.source.name}</div>
                    <div className="text-xs text-slate-600 mt-1">{lineageData.source.platform}</div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

                  <div className="flex-1">
                    <div className="text-sm text-slate-500">Target System</div>
                    <div className="font-medium text-slate-900">{lineageData.target.name}</div>
                    <div className="text-xs text-slate-600 mt-1">{lineageData.target.platform}</div>
                  </div>
                </div>
              </div>

              {/* Datasets */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Datasets ({lineageData.assets?.length || 0})</h4>
                <div className="space-y-3">
                  {lineageData.assets?.map((asset) => (
                    <div key={asset.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-900">
                            {asset.source_asset.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            → {asset.target_asset.name}
                          </div>
                        </div>
                        <Badge className="text-xs">{asset.load_method}</Badge>
                      </div>

                      {asset.filter_query && (
                        <div className="bg-slate-50 rounded p-2">
                          <div className="text-xs text-slate-600">Filter:</div>
                          <code className="text-xs text-slate-700 break-words">{asset.filter_query}</code>
                        </div>
                      )}

                      {asset.incremental_column && (
                        <div className="text-xs text-slate-600">
                          <strong>Incremental:</strong> {asset.incremental_column}
                        </div>
                      )}

                      {asset.transformations?.length > 0 && (
                        <div className="text-xs text-slate-600">
                          <strong>{asset.transformations.length}</strong> transformation(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Execution Schedule</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Type:</span>
                    <p className="font-medium capitalize">{lineageData.execution.schedule_type}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Total Runs:</span>
                    <p className="font-medium">{lineageData.execution.total_runs}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Success Rate:</span>
                    <p className="font-medium">
                      {lineageData.execution.total_runs
                        ? Math.round(
                            (lineageData.execution.successful_runs /
                              lineageData.execution.total_runs) *
                              100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                  {lineageData.execution.next_run && (
                    <div>
                      <span className="text-slate-600">Next Run:</span>
                      <p className="font-medium">
                        {moment(lineageData.execution.next_run).format("MMM D, h:mm A")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <Button onClick={() => handleExport("json")} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export JSON
                </Button>
                <ExportOpenMetadataButton
                  job={selectedJob}
                  sourceConn={connections.find((c) => c.id === selectedJob.source_connection_id)}
                  targetConn={connections.find((c) => c.id === selectedJob.target_connection_id)}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}