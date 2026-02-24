import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, GitBranch, FileCode2, FileText, ChevronDown, ChevronUp, X } from "lucide-react";
import { buildJobSpec } from "@/components/JobSpecExport";
import { generateAirflowDAG } from "@/components/AirflowDAGGenerator";

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

function ArtifactCard({ title, filename, icon: Icon, content }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-400 font-mono truncate">{filename}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={e => { e.stopPropagation(); handleCopy(); }}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button" size="sm" variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={e => { e.stopPropagation(); handleDownload(); }}
          >
            <Download className="w-3 h-3" />
            Download
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="bg-slate-950 overflow-hidden">
          <pre className="p-4 text-xs text-emerald-300 font-mono whitespace-pre overflow-auto max-h-64 leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function GitCheckinDialog({ open, onOpenChange, pipelineData, connections }) {
  if (!pipelineData) return null;

  const nameClean = (pipelineData.name || "pipeline").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const repoPath = `specs/${nameClean}/`;

  const spec = buildJobSpec({ id: pipelineData.id || "(unsaved)", ...pipelineData, dq_rules: pipelineData.dq_rules || {} }, connections);
  const cleanSpec = JSON.parse(JSON.stringify(spec));
  const specContent = `# DataFlow Pipeline Spec — ${pipelineData.name || "untitled"}\n` + toYaml(cleanSpec);
  const dagContent = generateAirflowDAG({ ...pipelineData, dq_rules: pipelineData.dq_rules || {} }, connections);

  const artifacts = [
    {
      title: "Pipeline Spec (YAML)",
      filename: `${nameClean}-pipelinespec.yaml`,
      icon: FileText,
      content: specContent,
    },
    {
      title: "Airflow DAG (Python)",
      filename: `${nameClean}_dag.py`,
      icon: FileCode2,
      content: dagContent,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" />
            Git Check-in
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pipeline name */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Pipeline created successfully</p>
              <p className="text-xs text-emerald-600 font-mono">{pipelineData.name}</p>
            </div>
          </div>

          {/* Repo path */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <p className="text-xs text-indigo-600 font-semibold mb-1">Target repository path</p>
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-700 shrink-0" />
              <code className="text-sm font-mono bg-indigo-100 px-2 py-0.5 rounded text-indigo-900 select-all">
                {repoPath}
              </code>
            </div>
          </div>

          {/* Artifacts */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Artifacts to check in</p>
            <div className="space-y-2">
              {artifacts.map(a => (
                <ArtifactCard key={a.filename} {...a} />
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Expand each artifact to preview its content, copy it to clipboard, or download it.
          </p>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}