import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import HelpTooltip from "@/components/HelpTooltip";
import ObjectSelector from "@/components/ObjectSelector";
import { ChevronDown, ChevronUp, Database, Filter, RefreshCw, FolderOutput, Settings2 } from "lucide-react";

const LOAD_METHOD_OPTIONS = [
  { value: "append", label: "Append", description: "Add new rows only — never overwrites existing data" },
  { value: "replace", label: "Replace", description: "Truncate the target table and reload all data fresh" },
  { value: "upsert", label: "Upsert", description: "Insert new rows, update existing rows based on a key" },
  { value: "merge", label: "Merge", description: "Advanced merge — handles inserts, updates, and deletes" },
];

function LoadMethodSelect({ value, onChange, size = "default" }) {
  return (
    <Select value={value || "append"} onValueChange={onChange}>
      <SelectTrigger className={size === "sm" ? "h-8 text-xs" : ""}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOAD_METHOD_OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <div>
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-slate-400">{opt.description}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DatasetCard({ ds, index, formData, setFormData }) {
  const [expanded, setExpanded] = useState(false);
  const method = ds.load_method || formData.load_method || "append";

  const update = (field, value) => {
    const updated = [...formData.selected_datasets];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, selected_datasets: updated });
  };

  const LOAD_COLORS = {
    append: "bg-green-100 text-green-700 border-green-200",
    replace: "bg-orange-100 text-orange-700 border-orange-200",
    upsert: "bg-blue-100 text-blue-700 border-blue-200",
    merge: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Database className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-mono text-sm font-medium text-slate-800 truncate block">
            {ds.schema}.{ds.table}
          </span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${LOAD_COLORS[method] || LOAD_COLORS.append}`}>
              {method}
            </span>
            {ds.incremental_column && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> incremental: {ds.incremental_column}
              </span>
            )}
            {ds.filter_query && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3" /> filtered
              </span>
            )}
            {ds.target_path && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <FolderOutput className="w-3 h-3" /> {ds.target_path}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Settings2 className="w-3.5 h-3.5 text-slate-300" />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-4">
          {/* Load Method */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Label className="text-xs font-semibold text-slate-600">Load Method</Label>
              <HelpTooltip text="How to handle data in the target table for this specific dataset. Overrides the pipeline-level default." />
            </div>
            <LoadMethodSelect
              value={ds.load_method || formData.load_method || "append"}
              onChange={(v) => update("load_method", v)}
              size="sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Incremental Column */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Label className="text-xs font-semibold text-slate-600">Incremental Column</Label>
                <HelpTooltip text="Column used to detect new/changed rows (e.g. updated_at, id). Leave blank for full loads." />
              </div>
              <Input
                value={ds.incremental_column || ""}
                onChange={(e) => update("incremental_column", e.target.value)}
                placeholder="updated_at"
                className="h-8 text-xs font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Optional — enables incremental loading</p>
            </div>

            {/* Last Value */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Label className="text-xs font-semibold text-slate-600">Last Watermark Value</Label>
                <HelpTooltip text="The last known value of the incremental column from the previous run. Used as the starting point for the next load." />
              </div>
              <Input
                value={ds.last_value || ""}
                onChange={(e) => update("last_value", e.target.value)}
                placeholder="2024-01-01T00:00:00Z"
                className="h-8 text-xs font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Leave blank to load all data on first run</p>
            </div>
          </div>

          {/* Filter Query */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Label className="text-xs font-semibold text-slate-600">Row Filter (WHERE clause)</Label>
              <HelpTooltip text="Optional SQL WHERE clause to limit which rows are extracted. E.g.: status = 'active' AND region = 'US'" />
            </div>
            <Input
              value={ds.filter_query || ""}
              onChange={(e) => update("filter_query", e.target.value)}
              placeholder="status = 'active' AND region = 'US'"
              className="h-8 text-xs font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">Raw SQL — be careful with injection risks in dev environments</p>
          </div>

          {/* Target Path */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Label className="text-xs font-semibold text-slate-600">Target Path / Table Override</Label>
              <HelpTooltip text="Override the default destination path or table name. For cloud storage: use a folder path like 'raw/sales/orders'. For databases: use schema.table." />
            </div>
            <Input
              value={ds.target_path || ""}
              onChange={(e) => update("target_path", e.target.value)}
              placeholder="raw/sales/orders  or  dw.fact_orders"
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobDataTab({ formData, setFormData }) {
  const datasets = formData.selected_datasets || [];

  return (
    <div className="space-y-5">
      {/* Dataset Selector */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Label className="text-sm font-semibold text-slate-700">Select Tables / Datasets</Label>
          <HelpTooltip text="Choose which tables or files from the source system to include in this pipeline. Each dataset can have its own load configuration." />
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Pick one or more tables from the source connection. Each can be individually configured below.
        </p>
        <ObjectSelector
          selectedObjects={formData.selected_datasets}
          onChange={(objects) => setFormData({ ...formData, selected_datasets: objects })}
        />
      </div>

      {/* Default Load Method */}
      <div className="border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Label className="text-sm font-semibold text-slate-700">Default Load Method</Label>
          <HelpTooltip text="This applies to all datasets unless overridden individually. Controls how data is written to the target." />
        </div>
        <p className="text-xs text-slate-400 mb-3">Applied to all datasets — individual datasets can override this.</p>
        <LoadMethodSelect
          value={formData.load_method}
          onChange={(v) => setFormData({ ...formData, load_method: v })}
        />
      </div>

      {/* Dataset Cards */}
      {datasets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Dataset Configuration
              </Label>
              <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">
                {datasets.length} dataset{datasets.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-slate-400">Click a dataset to configure it</p>
          </div>
          <div className="space-y-2">
            {datasets.map((ds, idx) => (
              <DatasetCard
                key={`${ds.schema}.${ds.table}`}
                ds={ds}
                index={idx}
                formData={formData}
                setFormData={setFormData}
              />
            ))}
          </div>
        </div>
      )}

      {datasets.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No datasets selected yet</p>
          <p className="text-xs text-slate-400 mt-1">Use the selector above to choose tables from your source connection</p>
        </div>
      )}
    </div>
  );
}