import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import { Search, X, Plus, ArrowRight, ChevronLeft, ChevronRight, Copy, GripVertical, Lock, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Checkbox } from "@/components/ui/checkbox";

const MAPPING_PAGE_SIZE = 50;

const GLOBAL_RULES = [
  { value: "date_standardize", label: "Date Columns → Standardize (ISO 8601)", pattern: /date|time|timestamp|created|updated/i },
  { value: "text_trim", label: "Text Columns → Trim Whitespace", pattern: /varchar|text|char|string|name|description|title/i },
  { value: "number_remove_leading", label: "Number Columns → Remove Leading Zeros", pattern: /int|decimal|numeric|number|float/i },
  { value: "phone_format", label: "Phone Columns → Format", pattern: /phone|telephone|mobile/i },
  { value: "email_lower", label: "Email Columns → Lowercase", pattern: /email|mail/i },
];

const DQ_RULES = [
  { value: "not_null", label: "Not Null" },
  { value: "unique", label: "Unique" },
  { value: "range_check", label: "Range Check" },
  { value: "pattern_match", label: "Pattern Match" },
  { value: "length_check", label: "Length Check" },
];

const ENCRYPTION_TYPES = [
  { value: "aes256", label: "AES-256" },
  { value: "hash_sha256", label: "Hash (SHA-256)" },
  { value: "tokenize", label: "Tokenize" },
];

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

const DATA_TYPES = ["varchar(255)", "int", "datetime", "decimal(18,2)", "bit", "bigint", "nvarchar(max)"];

// Seeded pseudo-random so data types are stable across renders
function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0x7fffffff; };
}

// Cache columns per table key so they're never regenerated
const columnCache = new Map();

function getMockColumns(schema, table) {
  const key = `${schema}.${table}`;
  if (columnCache.has(key)) return columnCache.get(key);
  const rand = seededRand(key.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const base = ["id","created_at","updated_at","created_by","updated_by","status","is_active","name","description","code","type","reference_id","parent_id","sequence","priority","category"];
  const extras = Array.from({ length: 984 }, (_, i) => `col_${String(i + 1).padStart(4, "0")}`);
  const cols = [...base, ...extras].map(col => ({ name: col, dataType: DATA_TYPES[Math.floor(rand() * DATA_TYPES.length)] }));
  columnCache.set(key, cols);
  return cols;
}

export default function ColumnMapper({ selectedObjects = [], mappings = [], onChange }) {
  const [selectedTable, setSelectedTable] = useState(selectedObjects[0] ? `${selectedObjects[0].schema}.${selectedObjects[0].table}` : "");
   const [search, setSearch] = useState("");
   const [mappingSearch, setMappingSearch] = useState("");
   const [page, setPage] = useState(0);
   const [mappingPage, setMappingPage] = useState(0);
    const [expandedRow, setExpandedRow] = useState(null);
    const [globalRules, setGlobalRules] = useState([]);
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

  const updateMapping = useCallback((source, field, value) => {
    onChange(prev => {
      const key = selectedTable;
      const tbl = prev[key] || [];
      const existing = tbl.find(m => m.source === source);
      let updated;
      if (existing) {
        updated = tbl.map(m => m.source === source ? { ...m, [field]: value } : m);
      } else {
        updated = [...tbl, { source, target: source, transformation: "direct", [field]: value }];
      }
      return { ...prev, [key]: updated };
    });
  }, [selectedTable, onChange]);

  const addMapping = useCallback((col) => {
    onChange(prev => {
      const key = selectedTable;
      const tbl = prev[key] || [];
      if (tbl.some(m => m.source === col.name)) return prev;
      return { ...prev, [key]: [...tbl, { source: col.name, target: col.name, transformation: "direct" }] };
    });
  }, [selectedTable, onChange]);

  const removeMapping = useCallback((source) => {
    onChange(prev => {
      const key = selectedTable;
      const tbl = prev[key] || [];
      return { ...prev, [key]: tbl.filter(m => m.source !== source) };
    });
  }, [selectedTable, onChange]);

  const duplicateMapping = useCallback((m) => {
    onChange(prev => {
      const key = selectedTable;
      const tbl = prev[key] || [];
      const newMapping = { source: m.source, target: `${m.target}_derived`, transformation: m.transformation, derived: true };
      return { ...prev, [key]: [...tbl, newMapping] };
    });
  }, [selectedTable, onChange]);

  const filteredMappings = useMemo(() =>
    mappingSearch
      ? tableMappings.filter(m =>
          m.source.toLowerCase().includes(mappingSearch.toLowerCase()) ||
          m.target.toLowerCase().includes(mappingSearch.toLowerCase())
        )
      : tableMappings,
    [tableMappings, mappingSearch]
  );

  const totalMappingPages = Math.ceil(filteredMappings.length / MAPPING_PAGE_SIZE);
  const pageMappings = filteredMappings.slice(mappingPage * MAPPING_PAGE_SIZE, (mappingPage + 1) * MAPPING_PAGE_SIZE);

  const addAllVisible = useCallback(() => {
     onChange(prev => {
       const key = selectedTable;
       const tbl = prev[key] || [];
       const mapped = new Set(tbl.map(m => m.source));
       const newCols = pageColumns
         .filter(c => !mapped.has(c.name))
         .map(c => ({ source: c.name, target: c.name, transformation: "direct" }));
       return { ...prev, [key]: [...tbl, ...newCols] };
     });
   }, [selectedTable, pageColumns, onChange]);

  // Apply global transformation rules to all mappings
  const applyGlobalRules = useCallback(() => {
    onChange(prev => {
      const key = selectedTable;
      const tbl = prev[key] || [];
      const updated = tbl.map(m => {
        const sourceCol = tableColumns.find(c => c.name === m.source);
        if (!sourceCol || m.is_audit) return m;

        for (const rule of globalRules) {
          const ruleConfig = GLOBAL_RULES.find(r => r.value === rule);
          if (ruleConfig && ruleConfig.pattern.test(sourceCol.name)) {
            let newTransform = m.transformation;
            if (rule === "date_standardize") newTransform = "date_iso";
            else if (rule === "text_trim") newTransform = "trim";
            else if (rule === "number_remove_leading") newTransform = "round_0dp";
            else if (rule === "email_lower") newTransform = "lowercase";
            return { ...m, transformation: newTransform };
          }
        }
        return m;
      });
      return { ...prev, [key]: updated };
    });
  }, [selectedTable, tableColumns, globalRules, onChange]);

  if (selectedObjects.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
        No tables selected. Add tables in the <strong>Objects</strong> tab first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dataset-level settings */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Dataset Settings</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Select Table</Label>
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

          {/* Audit Columns - Dataset level */}
          {selectedTable && (
            <div className="border border-amber-100 rounded-lg bg-amber-50/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-amber-900">Audit/System Columns</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                  onClick={() => {
                    const newDerived = { source: null, target: `audit_${Date.now()}`, transformation: "direct", derived: true, is_audit: true };
                    onChange(prev => ({ ...prev, [tableKey]: [...tableMappings, newDerived] }));
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              <div className="text-xs text-amber-700 space-y-1 max-h-24 overflow-y-auto">
                {tableMappings.filter(m => m.is_audit).length === 0 ? (
                  <span className="text-amber-600">No audit columns</span>
                ) : (
                  tableMappings.filter(m => m.is_audit).map(m => (
                    <div key={m.target} className="flex items-center justify-between gap-2 p-1 bg-white rounded">
                      <span className="font-mono">{m.target}</span>
                      <button type="button" onClick={() => removeMapping(m.target)} className="text-red-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTable && (
        <>
          {/* Global Transformation Rules */}
          <div className="border border-blue-100 rounded-xl p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-900">Global Transformation Rules</h3>
              <span className="text-xs text-blue-600">{globalRules.length} selected</span>
            </div>
            <div className="space-y-2 mb-3">
              {GLOBAL_RULES.map(rule => (
                <label key={rule.value} className="flex items-center gap-2 text-xs text-blue-800 cursor-pointer hover:bg-blue-100 p-2 rounded">
                  <Checkbox
                    checked={globalRules.includes(rule.value)}
                    onCheckedChange={checked => {
                      if (checked) {
                        setGlobalRules([...globalRules, rule.value]);
                      } else {
                        setGlobalRules(globalRules.filter(r => r !== rule.value));
                      }
                    }}
                  />
                  <span>{rule.label}</span>
                </label>
              ))}
            </div>
            {globalRules.length > 0 && (
              <Button
                size="sm"
                className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={applyGlobalRules}
              >
                Apply Rules to All Mappings
              </Button>
            )}
          </div>

          {/* Column mappings */}
          {tableMappings.filter(m => !m.is_audit).length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 flex items-center justify-between gap-2">
                <span className="shrink-0">Column Mappings ({tableMappings.filter(m => !m.is_audit).length})</span>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search columns..."
                    value={mappingSearch}
                    onChange={e => { setMappingSearch(e.target.value); setMappingPage(0); }}
                    className="w-full pl-6 pr-2 h-6 text-xs rounded border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
                {mappingSearch && (
                  <span className="text-slate-600 shrink-0 text-xs">{filteredMappings.filter(m => !m.is_audit).length} shown</span>
                )}
                <button type="button" onClick={() => onChange(prev => ({ ...prev, [tableKey]: prev[tableKey].filter(m => m.is_audit) }))} className="text-red-500 hover:text-red-700 text-xs shrink-0">Clear mappings</button>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-96 border-t border-slate-100">
                <DragDropContext onDragEnd={(result) => {
                  const { source, destination } = result;
                  if (!destination) return;
                  const newMappings = [...tableMappings];
                  const item = newMappings.splice(source.index, 1)[0];
                  newMappings.splice(destination.index, 0, item);
                  onChange({ ...mappings, [tableKey]: newMappings });
                }}>
                  <Droppable droppableId="mappings-list">
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="min-w-max">
                      {/* Header */}
                      <div className="grid gap-2 px-4 py-3 text-xs font-semibold text-slate-700 bg-white border-b border-slate-200 sticky top-0 z-10" style={{gridTemplateColumns:"32px 1fr"}}>
                        <span></span><span>Source → Target</span>
                      </div>
                      {filteredMappings.filter(m => !m.is_audit).length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400">No column mappings yet</div>
                      )}
                      {pageMappings.filter(m => !m.is_audit).map((m, i) => {
                        const sourceCol = tableColumns.find(c => c.name === m.source);
                        const isExpanded = expandedRow === m.source;
                        return (
                          <Draggable key={`${m.source}-${i}`} draggableId={`${m.source}-${i}`} index={tableMappings.indexOf(m)}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps}>
                                <div
                                  className={cn("grid gap-2 items-center px-4 py-2 border-b border-slate-100 cursor-pointer hover:bg-blue-50 text-xs transition-colors", snapshot.isDragging && "bg-slate-100 shadow-md")}
                                  style={{gridTemplateColumns:"32px 1fr", ...provided.draggableProps.style}}
                                  onClick={() => setExpandedRow(isExpanded ? null : m.source)}
                                >
                                  <div {...provided.dragHandleProps} className="flex items-center justify-center">
                                    <GripVertical className="w-3 h-3 text-slate-300" />
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-mono text-slate-900 text-xs"><strong>{m.source}</strong> <span className="text-slate-400">→</span> <strong>{m.target}</strong></div>
                                      <div className="text-slate-500 text-xs mt-0.5">{sourceCol?.dataType || '-'}</div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className={cn("text-xs px-2 py-0.5 rounded", m.transformation === 'direct' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700 font-medium')}>
                                        {TRANSFORMATIONS.find(t => t.value === m.transformation)?.label || 'Direct'}
                                      </span>
                                      {m.encrypted && <span className="text-green-600"><Lock className="w-3 h-3" /></span>}
                                      <button type="button" onClick={e => { e.stopPropagation(); removeMapping(m.source); }} className="text-slate-400 hover:text-red-500 p-1">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Target Column</label>
                                        <Input
                                          value={m.target}
                                          onChange={e => updateMapping(m.source, "target", e.target.value)}
                                          className="h-7 text-xs px-2"
                                          placeholder="target"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Transformation</label>
                                        <Select value={m.transformation || "direct"} onValueChange={v => updateMapping(m.source, "transformation", v)}>
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {TRANSFORMATIONS.map(t => (
                                              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-slate-700 block mb-1">Encryption</label>
                                      <Select value={m.encryption_type || ""} onValueChange={v => updateMapping(m.source, "encryption_type", v)}>
                                        <SelectTrigger className="h-7 text-xs">
                                          <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value={null}>None</SelectItem>
                                          {ENCRYPTION_TYPES.map(e => (
                                            <SelectItem key={e.value} value={e.value} className="text-xs">{e.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                    )}
                    </Droppable>
                    </DragDropContext>
                    </div>
              {totalMappingPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-600">
                  <span>Page {mappingPage + 1} of {totalMappingPages}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={mappingPage === 0} onClick={() => setMappingPage(p => p - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={mappingPage >= totalMappingPages - 1} onClick={() => setMappingPage(p => p + 1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}



           </>
           )}
           </div>
           );
           }