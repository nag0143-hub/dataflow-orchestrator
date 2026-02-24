import { base44 } from "@/api/base44Client";

export function generateLineageSpec(job, connections) {
  const sourceConn = connections.find(c => c.id === job.source_connection_id);
  const targetConn = connections.find(c => c.id === job.target_connection_id);

  const nodes = [];
  const edges = [];

  // Source nodes
  if (sourceConn && job.selected_datasets) {
    job.selected_datasets.forEach((dataset, idx) => {
      const nodeId = `source_${idx}`;
      nodes.push({
        id: nodeId,
        name: `${dataset.schema}.${dataset.table}`,
        type: "source",
        platform: sourceConn.platform,
        connection: sourceConn.name,
        metadata: {
          schema: dataset.schema,
          table: dataset.table,
          filter: dataset.filter_query || null,
          incremental_column: dataset.incremental_column || null,
        },
      });
    });
  }

  // Transform node (the pipeline itself)
  const transformNodeId = "transform_pipeline";
  nodes.push({
    id: transformNodeId,
    name: job.name,
    type: "transform",
    description: job.description || "Data transfer pipeline",
    load_method: job.load_method,
    schedule_type: job.schedule_type,
  });

  // Target nodes
  if (targetConn && job.selected_datasets) {
    job.selected_datasets.forEach((dataset, idx) => {
      const nodeId = `target_${idx}`;
      const targetPath = dataset.target_path || `${dataset.schema}/${dataset.table}`;
      nodes.push({
        id: nodeId,
        name: targetPath,
        type: "target",
        platform: targetConn.platform,
        connection: targetConn.name,
        metadata: {
          path: targetPath,
          load_method: dataset.load_method || job.load_method,
        },
      });

      // Edges: source -> transform -> target
      edges.push({
        source: `source_${idx}`,
        target: transformNodeId,
        type: "input",
      });
      edges.push({
        source: transformNodeId,
        target: nodeId,
        type: "output",
      });
    });
  }

  return {
    version: "1.0",
    pipeline_id: job.id,
    pipeline_name: job.name,
    created_at: new Date().toISOString(),
    nodes,
    edges,
  };
}