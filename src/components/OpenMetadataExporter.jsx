import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import moment from "moment";

export function buildOpenMetadataLineage(job, sourceConn, targetConn) {
  const baseUrl = "http://localhost:8585/api/v1"; // Update for your environment
  const datasets = job.selected_datasets || [];

  const lineageEdges = [];

  // Create edges from source datasets to target datasets
  datasets.forEach((dataset) => {
    lineageEdges.push({
      fromEntity: {
        id: `${sourceConn.id}-${dataset.schema}.${dataset.table}`,
        type: "table",
      },
      toEntity: {
        id: `${targetConn.id}-${dataset.target_path || dataset.schema}.${dataset.table}`,
        type: "table",
      },
      lineageDetails: {
        source: `${sourceConn.name}:${dataset.schema}`,
        target: `${targetConn.name}:${dataset.target_path || dataset.schema}`,
        platform: "custom",
        pipeline: job.id,
      },
    });
  });

  return {
    openMetadataVersion: "0.13.0",
    entityType: "pipeline",
    entity: {
      id: job.id,
      name: job.name,
      description: job.description || `Data pipeline from ${sourceConn.name} to ${targetConn.name}`,
      pipelineType: "Ingestion",
      owner: job.assignment_group || "unassigned",
      sourceConnections: [sourceConn.id],
      targetConnections: [targetConn.id],
      scheduleInterval: job.schedule_type,
      cronExpression: job.cron_expression,
      sourceUrl: `dataflow/jobs/${job.id}`,
      tasks: datasets.map((d, idx) => ({
        id: `${job.id}-task-${idx}`,
        name: `${d.schema}.${d.table}`,
        description: `Transfer from ${sourceConn.name} to ${targetConn.name}`,
        taskType: "Custom",
        sourceUrls: [`${sourceConn.name}/${d.schema}/${d.table}`],
        targetUrls: [`${targetConn.name}/${d.target_path || d.schema}/${d.table}`],
        upstreamTasks: idx > 0 ? [`${job.id}-task-${idx - 1}`] : [],
      })),
    },
    lineageData: {
      edges: lineageEdges,
      nodes: [
        {
          id: sourceConn.id,
          type: "service",
          name: sourceConn.name,
          platform: sourceConn.platform,
        },
        {
          id: targetConn.id,
          type: "service",
          name: targetConn.name,
          platform: targetConn.platform,
        },
        ...datasets.map((d) => ({
          id: `${sourceConn.id}-${d.schema}.${d.table}`,
          type: "table",
          name: `${d.schema}.${d.table}`,
          service: sourceConn.id,
        })),
        ...datasets.map((d) => ({
          id: `${targetConn.id}-${d.target_path || d.schema}.${d.table}`,
          type: "table",
          name: `${d.target_path || d.schema}.${d.table}`,
          service: targetConn.id,
        })),
      ],
    },
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: "DataFlow",
      totalDatasets: datasets.length,
      lastRunDate: job.last_run,
      successRate:
        job.total_runs > 0
          ? Math.round((job.successful_runs / job.total_runs) * 100)
          : 0,
    },
  };
}

export function ExportOpenMetadataButton({ job, sourceConn, targetConn }) {
  const handleExport = () => {
    const data = buildOpenMetadataLineage(job, sourceConn, targetConn);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openmetadata-${job.name}-${moment().format("YYYY-MM-DD-HHmmss")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} variant="outline" className="gap-2">
      <Download className="w-4 h-4" />
      Export OpenMetadata
    </Button>
  );
}