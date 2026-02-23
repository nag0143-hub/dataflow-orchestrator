import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Plus, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TRANSFORMATIONS = [
  { value: "direct",          label: "Direct Copy" },
  { value: "uppercase",       label: "UPPERCASE" },
  { value: "lowercase",       label: "lowercase" },
  { value: "trim",            label: "Trim Whitespace" },
  { value: "date_iso",        label: "Date → ISO 8601" },
  { value: "date_epoch",      label: "Date → Epoch (ms)" },
  { value: "round_2dp",       label: "Number → Round 2dp" },
  { value: "round_0dp",       label: "Number → Round Integer" },
  { value: "bool_yn",         label: "Boolean → Y/N" },
  { value: "bool_10",         label: "Boolean → 1/0" },
  { value: "null_empty",      label: "NULL → Empty String" },
  { value: "null_zero",       label: "NULL → 0" },
  { value: "hash_md5",        label: "Hash (MD5)" },
  { value: "hash_sha256",     label: "Hash (SHA-256)" },
  { value: "mask_partial",    label: "Mask (Partial)" },
  { value: "mask_full",       label: "Mask (Full)" },
  { value: "custom_sql",      label: "Custom SQL Expression" },
];

const PAGE_SIZE = 50;

// Generate mock source columns for a table (scales to large datasets)
function getMockColumns(schema, table) {
  const base = [
    "id", "created_at", "updated_at", "created_by", "updated_by",
    "status", "is_active", "name", "description", "code", "type",
    "reference_id", "parent_id", "sequence", "priority", "category",
  ];
  const extras = Array.from({ length: 984 }, (_, i) => `col_${String(i + 1).padStart(4, "0")}`);
  return [...base, ...extras].map(col => ({
    name: col,
    dataType: ["varchar(255)", "int", "datetime", "decimal(18,2)", "bit", "bigint", "nvarchar(max)"][Math.floor(Math.random() * 7)],
  }));
}

export default function ColumnMapper({ selectedObjects = [], mappings = [], onChange }) {
  const [selectedTable, setSelectedTable] = useState(selectedObjects[0] ? `${selectedObjects[0].schema}.${selectedObjects[0].table}` : "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const autoMappedRef = useRef(new Set());

  const tableKey = selectedTable;

  const tableColumns = useMemo(() => {
    if (!selectedTable) return [];
    const [schema, table] = selectedTable.split(".");
    return getMockColumns(schema, table);
  }, [selectedTable]);

  // Auto-map all columns to direct mapping when a table is first selected
  useEffect(() => {
    if (!tableKey || !tableColumns.length || mappings[tableKey] || autoMappedRef.current.has(tableKey)) return;
    autoMappedRef.current.add(tableKey);
    const auto = tableColumns.map(c => ({ source: c.name, target: c.name, transformation: "direct" }));
    onChange({ ...mappings, [tableKey]: auto });
  }, [tableKey, tableColumns]);

  const tableMappings = mappings[tableKey] || [];

  const mappedSourceCols = useMemo(() => new Set(tableMappings.map(m => m.source)), [tableMappings]);

  const filteredColumns = useMemo(() =>
    tableColumns.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dataType.toLowerCase().includes(search.toLowerCase())
    ), [tableColumns, search]);

  const totalPages = Math.ceil(filteredColumns.length / PAGE_SIZE);
  const pageColumns = filteredColumns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const updateMapping = (source, field, value) => {
    const existing = tableMappings.find(m => m.source === source);
    let updated;
    if (existing) {
      updated = tableMappings.map(m => m.source === source ? { ...m, [field]: value } : m);
    } else {
      updated = [...tableMappings, { source, target: source, transformation: "direct", [field]: value }];
    }
    onChange({ ...mappings, [tableKey]: updated });
  };

  const addMapping = (col) => {
    if (mappedSourceCols.has(col.name)) return;
    const updated = [...tableMappings, { source: col.name, target: col.name, transformation: "direct" }];
    onChange({ ...mappings, [tableKey]: updated });
  };

  const removeMapping = (source) => {
    const updated = tableMappings.filter(m => m.source !== source);
    onChange({ ...mappings, [tableKey]: updated });
  };

  const addAllVisible = () => {
    const newCols = pageColumns
      .filter(c => !mappedSourceCols.has(c.name))
      .map(c => ({ source: c.name, target: c.name, transformation: "direct" }));
    onChange({ ...mappings, [tableKey]: [...tableMappings, ...newCols] });
  };

  if (selectedObjects.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
        No tables selected. Add tables in the <strong>Objects</strong> tab first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table selector */}
      <div>
        <Label className="text-xs mb-1 block">Table</Label>
        <Select value={selectedTable} onValueChange={v => { setSelectedTable(v); setSearch(""); setPage(0); }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a table to map" />
          </SelectTrigger>
          <SelectContent>
            {selectedObjects.map(obj => (
              <SelectItem key={`${obj.schema}.${obj.table}`} value={`${obj.schema}.${obj.table}`}>
                {obj.schema}.{obj.table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTable && (
        <>
          {/* Active mappings */}
          {tableMappings.length > 0 && (
            <div className="border border-blue-100 rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 flex items-center justify-between">
                <span>{tableMappings.length} Active Mappings</span>
                <button type="button" onClick={() => onChange({ ...mappings, [tableKey]: [] })} className="text-red-400 hover:text-red-600 text-xs">Clear all</button>
              </div>
              <div className="max-h-48 overflow-y-auto overflow-x-auto">
                {/* Header */}
                <div className="grid gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0 min-w-[520px]" style={{gridTemplateColumns:"1fr 20px 1fr 160px 28px"}}>
                  <span>Source Column</span><span></span><span>Target Column</span><span>Transformation</span><span></span>
                </div>
                {tableMappings.map((m, i) => (
                  <div key={i} className="grid gap-2 items-center px-3 py-1.5 border-b border-slate-50 hover:bg-slate-50 text-xs min-w-[520px]" style={{gridTemplateColumns:"1fr 20px 1fr 160px 28px"}}>
                    <span className="font-mono text-slate-700 truncate" title={m.source}>{m.source}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                    <Input
                      value={m.target}
                      onChange={e => updateMapping(m.source, "target", e.target.value)}
                      className="h-6 text-xs px-2 font-mono w-full"
                    />
                    <Select value={m.transformation} onValueChange={v => updateMapping(m.source, "transformation", v)}>
                      <SelectTrigger className="h-6 text-xs px-2 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFORMATIONS.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button type="button" onClick={() => removeMapping(m.source)} className="text-slate-300 hover:text-red-400 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column browser */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 flex items-center gap-2 border-b border-slate-200">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder={`Search ${tableColumns.length.toLocaleString()} columns...`}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="pl-7 h-7 text-xs"
                />
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {filteredColumns.length.toLocaleString()} found
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={addAllVisible}>
                <Plus className="w-3 h-3 mr-1" /> Add page
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_40px] gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0">
                <span>Column</span><span>Type</span><span></span>
              </div>
              {pageColumns.map(col => {
                const isMapped = mappedSourceCols.has(col.name);
                return (
                  <div
                    key={col.name}
                    className={cn(
                      "grid grid-cols-[1fr_120px_40px] gap-2 items-center px-3 py-1.5 border-b border-slate-50 hover:bg-slate-50 text-xs",
                      isMapped && "bg-blue-50/40"
                    )}
                  >
                    <span className={cn("font-mono truncate", isMapped ? "text-blue-600" : "text-slate-700")} title={col.name}>
                      {col.name}
                    </span>
                    <span className="text-slate-400 truncate font-mono">{col.dataType}</span>
                    <button
                      onClick={() => isMapped ? removeMapping(col.name) : addMapping(col)}
                      type="button"
                      className={cn(
                        "text-xs rounded px-1.5 py-0.5 shrink-0",
                        isMapped
                          ? "text-red-400 hover:text-red-600"
                          : "text-blue-500 hover:text-blue-700"
                      )}
                    >
                      {isMapped ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                <span>Page {page + 1} of {totalPages} ({filteredColumns.length.toLocaleString()} columns)</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}