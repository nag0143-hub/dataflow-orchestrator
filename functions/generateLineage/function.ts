import { base44 } from "@base44/sdk";

/**
 * Generates lineage information from a job for Collibra integration
 * @param {string} jobId - The ingestion job ID
 * @returns {object} Lineage data in Collibra-compatible format
 */
export async function generateLineage(jobId) {
  if (!jobId) {
    throw new Error("jobId is required");
  }

  // Fetch job details
  const job = await base44.entities.IngestionJob.read(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Fetch connections
  const sourceConn = await base44.entities.Connection.read(job.source_connection_id);
  const targetConn = await base44.entities.Connection.read(job.target_connection_id);

  // Build lineage object
  const lineage = {
    id: job.id,
    name: job.name,
    description: job.description,
    type: "DataIntegrationProcess",
    created_date: job.created_date,
    last_run: job.last_run,
    
    // Source system
    source: {
      id: sourceConn.id,
      name: sourceConn.name,
      platform: sourceConn.platform,
      system: sourceConn.source_system_name || sourceConn.name,
      host: sourceConn.host,
      database: sourceConn.database,
    },

    // Target system
    target: {
      id: targetConn.id,
      name: targetConn.name,
      platform: targetConn.platform,
      system: targetConn.source_system_name || targetConn.name,
      host: targetConn.host,
      database: targetConn.database,
      bucket_container: targetConn.bucket_container,
    },

    // Data assets (datasets)
    assets: (job.selected_datasets || []).map((dataset) => ({
      id: `${job.id}-${dataset.schema}-${dataset.table}`,
      type: "Dataset",
      source_asset: {
        name: `${dataset.schema}.${dataset.table}`,
        schema: dataset.schema,
        table: dataset.table,
        system: sourceConn.name,
        platform: sourceConn.platform,
      },
      target_asset: {
        name: dataset.target_path || `${dataset.schema}/${dataset.table}`,
        path: dataset.target_path,
        system: targetConn.name,
        platform: targetConn.platform,
      },
      load_method: dataset.load_method || job.load_method || "append",
      filter_query: dataset.filter_query,
      incremental_column: dataset.incremental_column,
      transformations: buildTransformations(dataset, job),
      data_classification: dataset.data_classification,
      access_entitlements: dataset.access_entitlements || job.access_entitlements,
    })),

    // Transformation logic
    transformations: {
      column_mappings: job.column_mappings || {},
      dq_rules: job.dq_rules || {},
      data_cleansing: job.data_cleansing || {},
      spark_properties: Object.fromEntries(
        (job.selected_datasets || [])
          .filter((d) => d.spark_properties)
          .map((d) => [`${d.schema}.${d.table}`, d.spark_properties])
      ),
    },

    // Job execution info
    execution: {
      schedule_type: job.schedule_type,
      cron_expression: job.cron_expression,
      delivery_channel: job.delivery_channel,
      total_runs: job.total_runs || 0,
      successful_runs: job.successful_runs || 0,
      failed_runs: job.failed_runs || 0,
      next_run: job.next_run,
    },

    // Metadata
    metadata: {
      created_by: job.created_by,
      assignment_group: job.assignment_group,
      cost_center: job.cost_center,
      job_level_entitlements: job.access_entitlements,
    },
  };

  return lineage;
}

/**
 * Helper: Build transformation details for a dataset
 */
function buildTransformations(dataset, job) {
  const transformations = [];

  // Column mappings
  if (job.column_mappings) {
    Object.entries(job.column_mappings).forEach(([source, target]) => {
      transformations.push({
        type: "ColumnMapping",
        source_column: source,
        target_column: target.target_column,
        transformation: target.transformation,
      });
    });
  }

  // Data quality rules
  if (job.dq_rules) {
    Object.entries(job.dq_rules).forEach(([rule, config]) => {
      transformations.push({
        type: "DataQualityRule",
        rule_name: rule,
        ...config,
      });
    });
  }

  // Data cleansing
  if (job.data_cleansing) {
    transformations.push({
      type: "DataCleansing",
      rules: job.data_cleansing,
    });
  }

  return transformations;
}

/**
 * Generate lineage for multiple jobs (batch)
 */
export async function generateLineageBatch(jobIds) {
  const lineageData = [];

  for (const jobId of jobIds) {
    const lineage = await generateLineage(jobId);
    lineageData.push(lineage);
  }

  return lineageData;
}