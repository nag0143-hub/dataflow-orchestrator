import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code2, Copy, Check, Loader2, Download, RefreshCw } from "lucide-react";
import { platformConfig } from "@/components/PlatformIcon";
import { toast } from "sonner";

// RDBMS platforms only
const RDBMS_PLATFORMS = ["sql_server", "oracle", "postgresql", "mysql", "mongodb"];

// JDBC driver mappings
const JDBC_CONFIG = {
  sql_server: {
    driver: "com.microsoft.sqlserver.jdbc.SQLServerDriver",
    url_template: (conn) => `jdbc:sqlserver://${conn.host || "HOST"}:${conn.port || 1433};databaseName=${conn.database || "DB"};encrypt=true;trustServerCertificate=false`,
    package: "com.microsoft.azure:spark-mssql-connector_2.12:1.3.0-BETA",
    fetch_size: 10000,
    extra_options: { "mssqlOptions": "integratedSecurity=false" }
  },
  oracle: {
    driver: "oracle.jdbc.driver.OracleDriver",
    url_template: (conn) => `jdbc:oracle:thin:@//${conn.host || "HOST"}:${conn.port || 1521}/${conn.database || "ORCL"}`,
    package: "com.oracle.database.jdbc:ojdbc8:21.7.0.0",
    fetch_size: 5000,
    extra_options: {}
  },
  postgresql: {
    driver: "org.postgresql.Driver",
    url_template: (conn) => `jdbc:postgresql://${conn.host || "HOST"}:${conn.port || 5432}/${conn.database || "postgres"}`,
    package: "org.postgresql:postgresql:42.6.0",
    fetch_size: 10000,
    extra_options: { "ssl": "true", "sslmode": "require" }
  },
  mysql: {
    driver: "com.mysql.cj.jdbc.Driver",
    url_template: (conn) => `jdbc:mysql://${conn.host || "HOST"}:${conn.port || 3306}/${conn.database || "mydb"}?useSSL=true&requireSSL=true`,
    package: "mysql:mysql-connector-java:8.0.33",
    fetch_size: 10000,
    extra_options: {}
  },
  mongodb: {
    driver: "com.mongodb.spark.sql.DefaultSource",
    url_template: (conn) => `mongodb://${conn.username ? conn.username + "@" : ""}${conn.host || "HOST"}:${conn.port || 27017}/${conn.database || "mydb"}`,
    package: "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0",
    fetch_size: 1000,
    extra_options: {}
  }
};

function generatePySparkCode(job, sourceConn, targetConn) {
  const srcCfg = JDBC_CONFIG[sourceConn?.platform] || JDBC_CONFIG.postgresql;
  const tgtCfg = JDBC_CONFIG[targetConn?.platform] || JDBC_CONFIG.postgresql;
  const objects = job.selected_objects || [];
  const maxRetries = job.retry_config?.max_retries ?? 3;
  const retryDelay = job.retry_config?.retry_delay_seconds ?? 60;
  const expBackoff = job.retry_config?.exponential_backoff ?? true;
  const srcUrl = srcCfg.url_template(sourceConn || {});
  const tgtUrl = tgtCfg.url_template(targetConn || {});
  const srcPkg = srcCfg.package;
  const tgtPkg = tgtCfg.package;
  const packages = srcPkg === tgtPkg ? srcPkg : `${srcPkg},${tgtPkg}`;

  const tableIngestBlocks = objects.map(obj => {
    const fqTable = `${obj.schema}.${obj.table}`;
    const targetPath = obj.target_path || `${obj.schema}/${obj.table}`;
    const hasIncremental = !!obj.incremental_column;
    const filterPart = hasIncremental && obj.last_value
      ? `    filter_query = f"${obj.incremental_column} > '{last_watermark}'"`
      : `    filter_query = None`;
    const dbtable = hasIncremental && obj.last_value
      ? `f"(SELECT * FROM ${fqTable} WHERE {filter_query}) AS t"`
      : `"${fqTable}"`;

    return `
def ingest_${(obj.table || "table").replace(/[^a-zA-Z0-9]/g, "_")}(spark: SparkSession, watermark_store: dict) -> IngestResult:
    table_fqn = "${fqTable}"
    target_path = "${targetPath}"
    logger.info(f"Starting ingestion: {table_fqn}")

    # --- Watermark / incremental logic ---
${hasIncremental ? `    last_watermark = watermark_store.get("${fqTable}", "${obj.last_value || ""}")
    ${filterPart}
    dbtable = ${dbtable}` : `    dbtable = "${fqTable}"`}

    # --- Read from source with partition pushdown ---
    read_opts = {
        "driver": "${srcCfg.driver}",
        "url": SOURCE_JDBC_URL,
        "dbtable": dbtable,
        "user": SOURCE_USER,
        "password": SOURCE_PASSWORD,
        "fetchsize": "${srcCfg.fetch_size}",
        "numPartitions": "8",${hasIncremental ? `
        "partitionColumn": "${obj.incremental_column}",
        "lowerBound": "0",
        "upperBound": "9999999999",` : ""}
    }

    df = (
        spark.read
        .format("jdbc")
        .options(**read_opts)
        .load()
    )

    row_count = df.count()
    logger.info(f"Read {row_count:,} rows from {table_fqn}")

    if row_count == 0:
        logger.warning(f"No rows returned for {table_fqn} — skipping write")
        return IngestResult(table=table_fqn, rows=0, status="skipped")

    # --- Enrich with metadata columns ---
    df = (
        df
        .withColumn("_ingested_at", F.current_timestamp())
        .withColumn("_source_table", F.lit(table_fqn))
        .withColumn("_job_id", F.lit(JOB_ID))
        .withColumn("_run_id", F.lit(RUN_ID))
    )

    # --- Write to target ---
    write_opts = {
        "driver": "${tgtCfg.driver}",
        "url": TARGET_JDBC_URL,
        "dbtable": target_path,
        "user": TARGET_USER,
        "password": TARGET_PASSWORD,
        "batchsize": "10000",
        "isolationLevel": "READ_COMMITTED",
    }

    (
        df.write
        .format("jdbc")
        .options(**write_opts)
        .mode("${hasIncremental ? "append" : "overwrite"}")
        .save()
    )

    # --- Update watermark ---
${hasIncremental ? `    max_val = df.agg(F.max("${obj.incremental_column}")).collect()[0][0]
    if max_val:
        watermark_store["${fqTable}"] = str(max_val)
        logger.info(f"Updated watermark for ${fqTable}: {max_val}")` : `    pass  # Full load — no watermark to update`}

    logger.info(f"Completed {table_fqn}: {row_count:,} rows written")
    return IngestResult(table=table_fqn, rows=row_count, status="success")
`;
  }).join("\n");

  return `#!/usr/bin/env python3
"""
=============================================================================
  DataFlow Ingestion Job: ${job.name || "Unnamed Job"}
  Description : ${job.description || "RDBMS-to-RDBMS PySpark Ingestion"}
  Source      : ${platformConfig[sourceConn?.platform]?.label || "RDBMS"} — ${sourceConn?.name || ""}
  Target      : ${platformConfig[targetConn?.platform]?.label || "RDBMS"} — ${targetConn?.name || ""}
  Schedule    : ${job.schedule_type || "manual"}
  Tables      : ${objects.length} object(s)
  Generated   : ${new Date().toISOString()}

  Submit with:
    spark-submit \\
      --packages ${packages} \\
      --conf spark.sql.shuffle.partitions=200 \\
      --conf spark.dynamicAllocation.enabled=true \\
      --conf spark.serializer=org.apache.spark.serializer.KryoSerializer \\
      job_${(job.name || "ingestion").toLowerCase().replace(/[^a-z0-9]/g, "_")}.py

  Secrets expected via environment variables or a secrets manager (Vault):
    SOURCE_USER, SOURCE_PASSWORD
    TARGET_USER, TARGET_PASSWORD
=============================================================================
"""

from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.utils import AnalysisException


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("dataflow.${(job.name || "job").toLowerCase().replace(/[^a-z0-9]/g, "_")}")


# ---------------------------------------------------------------------------
# Job metadata
# ---------------------------------------------------------------------------
JOB_ID  = "${job.id || "JOB_ID"}"
RUN_ID  = str(uuid.uuid4())
JOB_NAME = "${job.name || "DataFlow Job"}"


# ---------------------------------------------------------------------------
# Connection configuration  (inject via Vault / env at runtime — never hardcode)
# ---------------------------------------------------------------------------
SOURCE_JDBC_URL = os.environ.get("SOURCE_JDBC_URL", "${srcUrl}")
TARGET_JDBC_URL = os.environ.get("TARGET_JDBC_URL", "${tgtUrl}")
SOURCE_USER     = os.environ.get("SOURCE_USER", "")
SOURCE_PASSWORD = os.environ.get("SOURCE_PASSWORD", "")
TARGET_USER     = os.environ.get("TARGET_USER", "")
TARGET_PASSWORD = os.environ.get("TARGET_PASSWORD", "")


# ---------------------------------------------------------------------------
# Retry configuration
# ---------------------------------------------------------------------------
MAX_RETRIES          = ${maxRetries}
RETRY_DELAY_SECONDS  = ${retryDelay}
EXPONENTIAL_BACKOFF  = ${expBackoff ? "True" : "False"}


# ---------------------------------------------------------------------------
# Domain types
# ---------------------------------------------------------------------------
@dataclass
class IngestResult:
    table: str
    rows: int
    status: str  # "success" | "skipped" | "failed"
    error: Optional[str] = None


@dataclass
class JobSummary:
    job_id: str = JOB_ID
    run_id: str = RUN_ID
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    results: list[IngestResult] = field(default_factory=list)

    @property
    def total_rows(self) -> int:
        return sum(r.rows for r in self.results)

    @property
    def failed_tables(self) -> list[str]:
        return [r.table for r in self.results if r.status == "failed"]

    @property
    def succeeded(self) -> bool:
        return len(self.failed_tables) == 0


# ---------------------------------------------------------------------------
# Retry decorator
# ---------------------------------------------------------------------------
def with_retry(fn, *args, max_retries: int = MAX_RETRIES, **kwargs):
    """Execute fn with exponential-backoff retry on transient failures."""
    for attempt in range(1, max_retries + 2):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            if attempt > max_retries:
                raise
            delay = RETRY_DELAY_SECONDS * (2 ** (attempt - 1)) if EXPONENTIAL_BACKOFF else RETRY_DELAY_SECONDS
            logger.warning(
                f"Attempt {attempt}/{max_retries + 1} failed for {fn.__name__}: {exc}. "
                f"Retrying in {delay}s …"
            )
            time.sleep(delay)


# ---------------------------------------------------------------------------
# SparkSession factory
# ---------------------------------------------------------------------------
def build_spark_session() -> SparkSession:
    return (
        SparkSession.builder
        .appName(f"DataFlow | {JOB_NAME} | {RUN_ID}")
        .config("spark.sql.shuffle.partitions", "200")
        .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
        # Connection pool — avoid overwhelming the RDBMS
        .config("spark.sql.broadcastTimeout", "600")
        .config("spark.network.timeout", "800s")
        .config("spark.executor.heartbeatInterval", "60s")
        .getOrCreate()
    )


# ---------------------------------------------------------------------------
# Per-table ingestion functions
# ---------------------------------------------------------------------------
${tableIngestBlocks}

# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def run_job(spark: SparkSession) -> JobSummary:
    summary = JobSummary()
    watermark_store: dict[str, str] = {}  # Populated from your watermark table / metadata store

    tables = [
${objects.map(obj => `        lambda s=spark, w=watermark_store: ingest_${(obj.table || "table").replace(/[^a-zA-Z0-9]/g, "_")}(s, w),`).join("\n")}
    ]

    for ingest_fn in tables:
        try:
            result = with_retry(ingest_fn)
            summary.results.append(result)
        except Exception as exc:
            table_name = getattr(ingest_fn, "__name__", "unknown")
            logger.error(f"All retries exhausted for {table_name}: {exc}", exc_info=True)
            summary.results.append(IngestResult(table=table_name, rows=0, status="failed", error=str(exc)))

    summary.completed_at = datetime.now(timezone.utc).isoformat()
    return summary


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
def main() -> None:
    logger.info(f"=== DataFlow Job Starting | job_id={JOB_ID} run_id={RUN_ID} ===")
    spark = build_spark_session()

    try:
        summary = run_job(spark)
    finally:
        spark.stop()

    # --- Emit summary ---
    logger.info("=" * 60)
    logger.info(f"Job complete  : {summary.succeeded}")
    logger.info(f"Total rows    : {summary.total_rows:,}")
    logger.info(f"Started at    : {summary.started_at}")
    logger.info(f"Completed at  : {summary.completed_at}")
    for r in summary.results:
        status_icon = "✓" if r.status == "success" else ("~" if r.status == "skipped" else "✗")
        logger.info(f"  {status_icon}  {r.table:<50} {r.rows:>10,} rows  [{r.status}]")
    if summary.failed_tables:
        logger.error(f"FAILED TABLES: {summary.failed_tables}")
        sys.exit(1)
    logger.info("=== DataFlow Job Finished Successfully ===")


if __name__ == "__main__":
    main()
`;
}

export default function PySparkCodeGenerator({ job, sourceConn, targetConn, open, onClose }) {
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRdbmsJob =
    RDBMS_PLATFORMS.includes(sourceConn?.platform) &&
    RDBMS_PLATFORMS.includes(targetConn?.platform);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setCode(generatePySparkCode(job, sourceConn, targetConn));
      setLoading(false);
    }, 300);
  };

  const handleOpen = (isOpen) => {
    if (isOpen && !code) generate();
    if (!isOpen) onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `job_${(job.name || "ingestion").toLowerCase().replace(/[^a-z0-9]/g, "_")}.py`;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            PySpark Code — {job?.name}
          </DialogTitle>
        </DialogHeader>

        {!isRdbmsJob && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            Code generation is currently available for <strong>RDBMS-to-RDBMS</strong> jobs only (SQL Server, Oracle, PostgreSQL, MySQL, MongoDB). One or both connections in this job use a non-RDBMS platform.
          </div>
        )}

        {isRdbmsJob && (
          <>
            {/* Info bar */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-600 gap-4 flex-wrap shrink-0">
              <div className="flex items-center gap-4">
                <span><strong>Source:</strong> {platformConfig[sourceConn?.platform]?.label} — {sourceConn?.name}</span>
                <span className="text-slate-300">|</span>
                <span><strong>Target:</strong> {platformConfig[targetConn?.platform]?.label} — {targetConn?.name}</span>
                <span className="text-slate-300">|</span>
                <span><strong>Tables:</strong> {job?.selected_objects?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={generate} disabled={loading}>
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                {code && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleDownload}>
                      <Download className="w-3 h-3" />
                      Download .py
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Code area */}
            <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 relative">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : (
                <pre className="overflow-auto h-full p-5 text-xs leading-relaxed text-slate-200 font-mono">
                  <code>{code}</code>
                </pre>
              )}
            </div>

            {/* Footer hints */}
            <div className="text-xs text-slate-500 space-y-1 shrink-0">
              <p>• Credentials are read from environment variables — never hardcoded. Wire to HashiCorp Vault at runtime.</p>
              <p>• Incremental columns and watermarks are derived from your selected object config. Full-load tables use <code className="bg-slate-100 px-1 rounded">overwrite</code> mode.</p>
              <p>• Adjust <code className="bg-slate-100 px-1 rounded">numPartitions</code>, <code className="bg-slate-100 px-1 rounded">fetchsize</code>, and <code className="bg-slate-100 px-1 rounded">batchsize</code> based on your cluster sizing and source RDBMS limits.</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}