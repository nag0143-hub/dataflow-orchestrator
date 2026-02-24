import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, FileJson, AlertCircle, GitBranch, Terminal, FolderOpen } from "lucide-react";
import { buildJobSpec } from "@/components/JobSpecExport";
import { generateAirflowDAG } from "@/components/AirflowDAGGenerator";

export default function JobSpecTabPreview({ formData, connections }) {
  const [format, setFormat] = useState("yaml");
  const [view, setView] = useState("spec"); // "spec" | "dag"
  const [copied, setCopied] = useState(false);

  const getMissingFields = () => {
    const missing = [];
    if (!formData.name?.trim()) missing.push("Job name");
    if (!formData.source_connection_id) missing.push("Source connection");
    if (!formData.target_connection_id) missing.push("Target connection");
    if (formData.source_connection_id === formData.target_connection_id) missing.push("Source and target must be different");
    if (!formData.selected_datasets || formData.selected_datasets.length === 0) missing.push("At least one dataset");
    if (formData.schedule_type === "custom" && !formData.cron_expression?.trim()) missing.push("Cron expression");
    return missing;
  };

  const missingFields = getMissingFields();

  const draftJob = {
    id: "(unsaved)",
    ...formData,
    dq_rules: formData.dq_rules || {},
  };

  function toYaml(obj, indent = 0) {
    const pad = "  ".repeat(indent);
    if (obj === null || obj === undefined) return "null";
    if (typeof obj === "boolean") return obj ? "true" : "false";
    if (typeof obj === "number") return String(obj);
    if (typeof obj === "string") {
      if (/[\n:#\[\]{},'"&*?|<>=!%@`]/.test(obj) || obj === "" || /^(true|false|null|yes|no)$/i.test(obj))
        return `"${obj.replace(/"/g, '\\"')}"`;
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
        if (val !== null && typeof val === "object" && !Array.isArray(val) && Object.keys(val).length > 0)
          return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object")
          return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        return `${pad}${k}: ${toYaml(val, indent)}`;
      }).join("\n");
    }
    return String(obj);
  }

  const spec = buildJobSpec(draftJob, connections);
  const cleanSpec = JSON.parse(JSON.stringify(spec));

  const dagContent = generateAirflowDAG(draftJob, connections);

  const specContent = format === "json"
    ? JSON.stringify(cleanSpec, null, 2)
    : `# DataFlow Pipeline Spec — ${formData.name || "untitled"}\n` + toYaml(cleanSpec);

  const content = view === "dag" ? dagContent : specContent;

  const filename = view === "dag" ? dagFilename : specFilename;

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

  const pipelineNameClean = (formData.name || "pipeline").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const specFilename = `${pipelineNameClean}-pipelinespec.${format === "json" ? "json" : "yaml"}`;
  const dagFilename = `${pipelineNameClean}_dag.py`;

  const gitSteps = [
    { cmd: `cd /repo/pipelines`, desc: "Navigate to pipelines repo" },
    { cmd: `mkdir -p specs/${pipelineNameClean}`, desc: "Create pipeline folder" },
    { cmd: `# Copy downloaded files into specs/${pipelineNameClean}/`, desc: "Place artifacts in folder" },
    { cmd: `git add specs/${pipelineNameClean}/${specFilename}`, desc: "Stage pipeline spec" },
    { cmd: `git add specs/${pipelineNameClean}/${dagFilename}`, desc: "Stage Airflow DAG" },
    { cmd: `git commit -m "feat: add pipeline ${formData.name || 'untitled'}"`, desc: "Commit artifacts" },
    { cmd: `git push origin main`, desc: "Push to remote" },
  ];

  return (
    <div className="space-y-3">
      {/* Git Checkin Instructions */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm">
          <GitBranch className="w-4 h-4" />
          Git Checkin Instructions
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-700">
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span>Artifact paths: <code className="bg-indigo-100 px-1 rounded font-mono">specs/{pipelineNameClean}/{specFilename}</code> and <code className="bg-indigo-100 px-1 rounded font-mono">specs/{pipelineNameClean}/{dagFilename}</code></span>
        </div>
        <div className="space-y-1.5">
          {gitSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-indigo-400 font-mono w-4 shrink-0 mt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <code className="block bg-slate-900 text-emerald-300 text-xs font-mono px-2.5 py-1.5 rounded">{step.cmd}</code>
                <p className="text-xs text-indigo-600 mt-0.5 pl-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <FileJson className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-slate-900">Pipeline Spec</span>
        <span className="text-xs text-slate-400 ml-1">(check this file into git)</span>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {/* View toggle */}
          {["spec", "dag"].map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                view === v ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}>
              {v === "dag" ? "Airflow DAG" : "Pipeline Spec"}
            </button>
          ))}
          {/* Format toggle (only for spec view) */}
          {view === "spec" && ["yaml", "json"].map(f => (
            <button key={f} type="button" onClick={() => setFormat(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                format === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      {missingFields.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-semibold mb-1">Missing required fields:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                {missingFields.map((field, i) => (
                  <li key={i}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-xs text-slate-500">
        This spec reflects the current (unsaved) form state and includes full connection details. Save the pipeline first, then download to commit.
      </p>
      <div className="rounded-lg border border-slate-200 bg-slate-950 overflow-hidden">
        <pre className="p-4 text-xs text-emerald-300 font-mono whitespace-pre overflow-auto max-h-[50vh] leading-relaxed">
          {content}
        </pre>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Download {filename}
        </Button>
      </div>
    </div>
  );
}