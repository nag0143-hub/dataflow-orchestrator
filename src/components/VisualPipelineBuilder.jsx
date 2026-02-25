import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Database, Filter, Target, ArrowRight, Plus, Trash2, Settings,
  Save, Play, GripVertical, ChevronDown, ChevronRight, Zap, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const NODE_TYPES = {
  source: {
    label: "Source",
    icon: Database,
    color: "bg-blue-500",
    borderColor: "border-blue-400",
    bgLight: "bg-blue-50 dark:bg-blue-900/20",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  transform: {
    label: "Transform",
    icon: Filter,
    color: "bg-amber-500",
    borderColor: "border-amber-400",
    bgLight: "bg-amber-50 dark:bg-amber-900/20",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  target: {
    label: "Target",
    icon: Target,
    color: "bg-emerald-500",
    borderColor: "border-emerald-400",
    bgLight: "bg-emerald-50 dark:bg-emerald-900/20",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
};

const TRANSFORM_OPTIONS = [
  { value: "filter", label: "Filter Rows" },
  { value: "rename", label: "Rename Columns" },
  { value: "mask", label: "Data Masking" },
  { value: "dedupe", label: "Deduplication" },
  { value: "aggregate", label: "Aggregation" },
  { value: "join", label: "Join / Lookup" },
];

function PipelineNode({ node, onRemove, onConfigChange, connections, isDragging, dragHandleProps }) {
  const [expanded, setExpanded] = useState(true);
  const type = NODE_TYPES[node.type];
  const Icon = type.icon;

  return (
    <div
      className={`relative rounded-xl border-2 ${type.borderColor} ${type.bgLight} shadow-md transition-all ${isDragging ? "opacity-50 scale-95" : ""} min-w-[220px] max-w-[260px]`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${type.bgLight}`}>
        <span {...dragHandleProps} className="cursor-grab text-slate-400 hover:text-slate-600">
          <GripVertical className="w-4 h-4" />
        </span>
        <div className={`w-6 h-6 rounded-md ${type.color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className={`text-sm font-semibold ${type.textColor} flex-1`}>{type.label}</span>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onRemove(node.id)} className="text-slate-400 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 space-y-2">
          {node.type === "source" && (
            <>
              <label className="text-xs text-slate-500 dark:text-slate-400">Connection</label>
              <Select
                value={node.config.connection_id || ""}
                onValueChange={(v) => onConfigChange(node.id, { connection_id: v })}
              >
                <SelectTrigger className="h-8 text-xs dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Select connection..." />
                </SelectTrigger>
                <SelectContent>
                  {connections.filter(c => c.connection_type === "source").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {connections.filter(c => c.connection_type !== "source" && c.connection_type !== "target").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-xs text-slate-500 dark:text-slate-400">Dataset / Table</label>
              <Input
                className="h-8 text-xs dark:bg-slate-800 dark:border-slate-600"
                placeholder="schema.table_name"
                value={node.config.dataset || ""}
                onChange={(e) => onConfigChange(node.id, { dataset: e.target.value })}
              />
            </>
          )}

          {node.type === "transform" && (
            <>
              <label className="text-xs text-slate-500 dark:text-slate-400">Transform Type</label>
              <Select
                value={node.config.transform_type || ""}
                onValueChange={(v) => onConfigChange(node.id, { transform_type: v })}
              >
                <SelectTrigger className="h-8 text-xs dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Select transform..." />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFORM_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {node.config.transform_type && (
                <>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Config (optional)</label>
                  <Input
                    className="h-8 text-xs dark:bg-slate-800 dark:border-slate-600"
                    placeholder={node.config.transform_type === "filter" ? "WHERE condition..." : "Configuration..."}
                    value={node.config.config_value || ""}
                    onChange={(e) => onConfigChange(node.id, { config_value: e.target.value })}
                  />
                </>
              )}
            </>
          )}

          {node.type === "target" && (
            <>
              <label className="text-xs text-slate-500 dark:text-slate-400">Connection</label>
              <Select
                value={node.config.connection_id || ""}
                onValueChange={(v) => onConfigChange(node.id, { connection_id: v })}
              >
                <SelectTrigger className="h-8 text-xs dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder="Select connection..." />
                </SelectTrigger>
                <SelectContent>
                  {connections.filter(c => c.connection_type === "target").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {connections.filter(c => c.connection_type !== "source" && c.connection_type !== "target").map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-xs text-slate-500 dark:text-slate-400">Load Method</label>
              <Select
                value={node.config.load_method || "append"}
                onValueChange={(v) => onConfigChange(node.id, { load_method: v })}
              >
                <SelectTrigger className="h-8 text-xs dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append</SelectItem>
                  <SelectItem value="replace">Replace</SelectItem>
                  <SelectItem value="upsert">Upsert</SelectItem>
                  <SelectItem value="merge">Merge</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center gap-0 flex-shrink-0">
      <div className="w-8 h-0.5 bg-slate-300 dark:bg-slate-600" />
      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 -ml-1" />
    </div>
  );
}

let nodeIdCounter = 1;
function makeNode(type) {
  return { id: `node-${nodeIdCounter++}`, type, config: {} };
}

export default function VisualPipelineBuilder({ connections, onSaveSuccess }) {
  const [pipelineName, setPipelineName] = useState("");
  const [nodes, setNodes] = useState([
    makeNode("source"),
    makeNode("target"),
  ]);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addNode = (type, afterIndex) => {
    const newNode = makeNode(type);
    setNodes(prev => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newNode);
      return updated;
    });
  };

  const removeNode = (id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  };

  const updateConfig = (id, patch) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, config: { ...n.config, ...patch } } : n));
  };

  const handleDragStart = (idx) => setDragIndex(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIndex(idx); };
  const handleDrop = (idx) => {
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setOverIndex(null); return; }
    setNodes(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(idx, 0, moved);
      return updated;
    });
    setDragIndex(null);
    setOverIndex(null);
  };

  const validate = () => {
    if (!pipelineName.trim()) { toast.error("Pipeline name is required"); return false; }
    const src = nodes.find(n => n.type === "source");
    const tgt = nodes.find(n => n.type === "target");
    if (!src) { toast.error("At least one Source node is required"); return false; }
    if (!tgt) { toast.error("At least one Target node is required"); return false; }
    if (!src.config.connection_id) { toast.error("Source connection is required"); return false; }
    if (!tgt.config.connection_id) { toast.error("Target connection is required"); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const src = nodes.find(n => n.type === "source");
    const tgt = nodes.find(n => n.type === "target");
    const transforms = nodes.filter(n => n.type === "transform");

    const pipelineData = {
      name: pipelineName,
      source_connection_id: src.config.connection_id,
      target_connection_id: tgt.config.connection_id,
      load_method: tgt.config.load_method || "append",
      selected_datasets: src.config.dataset
        ? [{ schema: src.config.dataset.split(".")[0] || "", table: src.config.dataset.split(".")[1] || src.config.dataset }]
        : [],
      status: "idle",
      dq_rules: transforms.reduce((acc, t) => {
        if (t.config.transform_type) acc[t.config.transform_type] = t.config.config_value || true;
        return acc;
      }, {}),
    };

    try {
      await base44.entities.Pipeline.create(pipelineData);
      toast.success(`Pipeline "${pipelineName}" saved!`);
      setSaved(true);
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error("Failed to save pipeline");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPipelineName("");
    setNodes([makeNode("source"), makeNode("target")]);
    setSaved(false);
  };

  const sourceNodes = nodes.filter(n => n.type === "source");
  const targetNodes = nodes.filter(n => n.type === "target");

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <Zap className="w-5 h-5 text-[#003478] dark:text-blue-400 flex-shrink-0" />
          <Input
            placeholder="Enter pipeline name..."
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            className="max-w-xs dark:bg-slate-700 dark:border-slate-600 font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 dark:border-slate-600 dark:text-slate-300">
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-[#003478] hover:bg-[#002560]">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? "Saved!" : "Save Pipeline"}
          </Button>
        </div>
      </div>

      {/* Node palette */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Add Node:</span>
        {Object.entries(NODE_TYPES).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => addNode(type, nodes.length - 1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 ${cfg.borderColor} ${cfg.bgLight} ${cfg.textColor} text-xs font-medium hover:shadow-md transition-all`}
            >
              <Icon className="w-3.5 h-3.5" />
              + {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-6 overflow-x-auto min-h-[240px]">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-600">
            <p className="text-sm">Add nodes from the palette above to build your pipeline</p>
          </div>
        ) : (
          <div className="flex items-start gap-0 w-max">
            {nodes.map((node, idx) => (
              <div key={node.id} className="flex items-center">
                {/* Drop zone between nodes */}
                {overIndex === idx && dragIndex !== null && dragIndex !== idx && (
                  <div className="w-1 h-32 bg-blue-400 rounded-full mx-1 opacity-70" />
                )}
                <div
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  className="flex items-center"
                >
                  <PipelineNode
                    node={node}
                    connections={connections}
                    onRemove={removeNode}
                    onConfigChange={updateConfig}
                    isDragging={dragIndex === idx}
                    dragHandleProps={{}}
                  />
                </div>
                {/* Connector + Add Transform button between nodes */}
                {idx < nodes.length - 1 && (
                  <div className="flex flex-col items-center gap-1 mx-1">
                    <Connector />
                    <button
                      onClick={() => addNode("transform", idx)}
                      className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
                      title="Add transform here"
                    >
                      <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {nodes.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-500" /> {sourceNodes.length} Source
          </span>
          <span className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-500" /> {nodes.filter(n => n.type === "transform").length} Transforms
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-emerald-500" /> {targetNodes.length} Target
          </span>
          <span className="ml-auto text-slate-400 dark:text-slate-500 italic">
            Drag nodes to reorder · Click <Plus className="w-3 h-3 inline" /> between nodes to add a transform
          </span>
        </div>
      )}
    </div>
  );
}