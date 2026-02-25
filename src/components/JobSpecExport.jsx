import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileJson, FileText, Check } from "lucide-react";

// Minimal YAML serializer (no deps needed)
function toYaml(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "string") {
    // Quote strings that need it
    if (/[\n:#\[\]{},'"&*?|<>=!%@`]/.test(obj) || obj === "" || /^(true|false|null|yes|no)$/i.test(obj)) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map(item => {
      const val = toYaml(item, indent + 1);
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const lines = val.split("\n");
        return `${pad}- ${lines[0]}\n${lines.slice(1).join("\n")}`;
      }
      return `${pad}- ${val}`;
    }).join("\n");
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    return keys.map(k => {
      const val = obj[k];
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        const nested = toYaml(val, indent + 1);
        if (nested === "{}") return `${pad}${k}: {}`;
        return `${pad}${k}:\n${nested}`;
      }
      if (Array.isArray(val)) {
        if (val.length === 0) return `${pad}${k}: []`;
        if (typeof val[0] === "object") return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
      }
      return `${pad}${k}: ${toYaml(val, indent)}`;
    }).join("\n");
  }
  return String(obj);
}

export const FLAT_FILE_PLATFORMS = ["flat_file_delimited", "flat_file_fixed_width", "cobol_ebcdic", "sftp", "nas", "local_fs"];

function getOperatorType(sourcePlatform, targetPlatform) {
  const srcFlat = FLAT_FILE_PLATFORMS.includes(sourcePlatform);
  const tgtFlat = FLAT_FILE_PLATFORMS.includes(targetPlatform);
  // If either source or target is a flat file type, use PythonOperator
  return (srcFlat || tgtFlat) ? "PythonOperator" : "SparkSubmitOperator";
}

function connDetails(conn) {
  if (!conn) return {};
  // Omit secrets; include only structural/config fields safe for git
  return {
    name: conn.name,
    platform: conn.platform,
    connection_type: conn.connection_type,
    host: conn.host || undefined,
    port: conn.port || undefined,
    database: conn.database || undefined,
    username: conn.username || undefined,
    auth_method: conn.auth_method || undefined,
    region: conn.region || undefined,
    bucket_container: conn.bucket_container || undefined,
    ...(conn.file_config && Object.keys(conn.file_config).length ? { file_config: conn.file_config } : {}),
    notes: conn.notes || undefined,
  };
}

export function buildJobSpec(job, connections) {
  const sourceConn = connections.find(c => c.id === job.source_connection_id);
  const targetConn = connections.find(c => c.id === job.target_connection_id);

  const srcPlatform = sourceConn?.platform || "";
  const tgtPlatform = targetConn?.platform || "";
  const operatorType = getOperatorType(srcPlatform, tgtPlatform);
  const isSparkJob = operatorType === "SparkSubmitOperator";

  const datasets = (job.selected_datasets || job.selected_objects || []);

  return {
    apiVersion: "dataflow/v1",
    kind: "IngestionPipeline",
    metadata: {
      name: job.name,
      description: job.description || "",
      id: job.id,
      generated_at: new Date().toISOString(),
    },
    spec: {
      source: {
        connection_id: job.source_connection_id,
        ...connDetails(sourceConn),
      },
      target: {
        connection_id: job.target_connection_id,
        ...connDetails(targetConn),
      },
      datasets: datasets.map(o => {
        const datasetSrcPlatform = srcPlatform;
        const dsOperator = getOperatorType(datasetSrcPlatform, tgtPlatform);
        const dsIsSpark = dsOperator === "SparkSubmitOperator";
        return {
          schema: o.schema,
          table: o.table,
          target_path: o.target_path || "",
          filter_query: o.filter_query || "",
          incremental_column: o.incremental_column || "",
          load_method: o.load_method || job.load_method || "append",
          dag: {
            task_id: `${job.name}__${o.schema}__${o.table}`.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
            operator: dsOperator,
            ...(dsIsSpark ? {
              application: "dataflow_spark_ingestion.py",
              spark_conf: {
                "spark.executor.memory": "4g",
                "spark.executor.cores": "2",
                "spark.driver.memory": "2g",
              },
              py_files: ["dataflow_utils.zip"],
            } : {
              python_callable: "run_flat_file_ingestion",
              op_kwargs: {
                source_platform: srcPlatform,
                target_platform: tgtPlatform,
              },
            }),
          },
        };
      }),
      schedule: {
        type: job.schedule_type || "manual",
        cron_expression: job.cron_expression || "",
        use_custom_calendar: job.use_custom_calendar || false,
        include_calendar_id: job.include_calendar_id || "",
        exclude_calendar_id: job.exclude_calendar_id || "",
      },
      retry: {
        max_retries: job.retry_config?.max_retries ?? 3,
        retry_delay_seconds: job.retry_config?.retry_delay_seconds ?? 60,
        exponential_backoff: job.retry_config?.exponential_backoff ?? true,
      },
      dag_generation: {
        operator_type: operatorType,
        dag_id: `dataflow__${(job.name || "pipeline").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`,
        is_pyspark: isSparkJob,
        task_parallelism: "sequential",
        tags: ["dataflow", isSparkJob ? "pyspark" : "flat_file", job.schedule_type || "manual"],
      },
      column_mappings: job.column_mappings || {},
      data_quality_rules: job.dq_rules || {},
    },
  };
}

export default function PipelineSpecExport({ job, connections, onClose }) {
  // legacy standalone dialog — still usable
  const [format, setFormat] = useState("json");
  const [copied, setCopied] = useState(false);

  const spec = buildJobSpec(job, connections);
  const content = format === "json"
    ? JSON.stringify(spec, null, 2)
    : `# DataFlow Pipeline Spec — ${job.name}\n` + toYaml(spec);

  const filename = `${job.name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase()}-pipelinespec.${format === "json" ? "json" : "yaml"}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-blue-600" />
            Export Pipeline Spec — {job.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-500 font-medium">Format:</span>
          {["json", "yaml"].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                format === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400 font-mono">{filename}</span>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-950 min-h-0">
          <pre className="p-4 text-xs text-emerald-300 font-mono whitespace-pre leading-relaxed overflow-auto h-full max-h-[55vh]">
            {content}
          </pre>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t mt-3">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          <Button type="button" variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button type="button" onClick={handleDownload} className="gap-1.5 bg-slate-900 hover:bg-slate-800">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}