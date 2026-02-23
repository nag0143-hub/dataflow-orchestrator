import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import {
  Upload,
  Code2,
  FileSpreadsheet,
  FileJson,
  FileCode,
  X,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Parses SQL DDL text and extracts table/column definitions.
 * Handles CREATE TABLE statements.
 */
function parseDDL(ddl) {
  const schemas = {};
  const createTableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\."?(\w+)"?|"?(\w+)"?)\s*\(([^;]+?)\)/gis;
  let match;
  while ((match = createTableRe.exec(ddl)) !== null) {
    const schemaName = match[1] || "dbo";
    const tableName = match[2] || match[3];
    const body = match[4];

    // Parse columns (skip constraints)
    const columns = [];
    body.split(/,\n?/).forEach(line => {
      line = line.trim();
      if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|INDEX|KEY)\b/i.test(line)) return;
      const colMatch = line.match(/^"?(\w+)"?\s+([A-Z][\w(),.]*)/i);
      if (colMatch) {
        columns.push({ name: colMatch[1], type: colMatch[2].toUpperCase() });
      }
    });

    if (!schemas[schemaName]) schemas[schemaName] = {};
    schemas[schemaName][tableName] = columns;
  }
  return schemas;
}

/**
 * Parses a simple JSON schema (array of { schema, table, columns[] } or
 * object like { schema: { table: [col,...] } })
 */
function parseJSONSchema(text) {
  const data = JSON.parse(text);
  const schemas = {};

  if (Array.isArray(data)) {
    // [{ schema, table, columns: [{name, type}] }]
    data.forEach(entry => {
      const s = entry.schema || "dbo";
      const t = entry.table || entry.name;
      if (!schemas[s]) schemas[s] = {};
      schemas[s][t] = (entry.columns || []).map(c =>
        typeof c === "string" ? { name: c, type: "VARCHAR" } : c
      );
    });
  } else if (typeof data === "object") {
    // { schema: { table: ["col1", ...] } } or flat { table: [...] }
    Object.entries(data).forEach(([key, val]) => {
      if (typeof val === "object" && !Array.isArray(val)) {
        // key = schema
        schemas[key] = {};
        Object.entries(val).forEach(([tbl, cols]) => {
          schemas[key][tbl] = Array.isArray(cols)
            ? cols.map(c => typeof c === "string" ? { name: c, type: "VARCHAR" } : c)
            : [];
        });
      } else if (Array.isArray(val)) {
        if (!schemas["dbo"]) schemas["dbo"] = {};
        schemas["dbo"][key] = val.map(c => typeof c === "string" ? { name: c, type: "VARCHAR" } : c);
      }
    });
  }
  return schemas;
}

/**
 * Parses XML schema like:
 * <schema name="dbo"><table name="Customers"><column name="id" type="INT"/></table></schema>
 */
function parseXMLSchema(text) {
  const schemas = {};
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const schemaNodes = doc.querySelectorAll("schema");
  if (schemaNodes.length === 0) {
    // flat <tables><table name="...">...
    const tables = doc.querySelectorAll("table");
    tables.forEach(t => {
      const s = t.getAttribute("schema") || "dbo";
      const name = t.getAttribute("name");
      if (!schemas[s]) schemas[s] = {};
      schemas[s][name] = [...t.querySelectorAll("column")].map(c => ({
        name: c.getAttribute("name"),
        type: (c.getAttribute("type") || "VARCHAR").toUpperCase(),
      }));
    });
  } else {
    schemaNodes.forEach(sNode => {
      const s = sNode.getAttribute("name") || "dbo";
      schemas[s] = {};
      sNode.querySelectorAll("table").forEach(t => {
        const name = t.getAttribute("name");
        schemas[s][name] = [...t.querySelectorAll("column")].map(c => ({
          name: c.getAttribute("name"),
          type: (c.getAttribute("type") || "VARCHAR").toUpperCase(),
        }));
      });
    });
  }
  return schemas;
}

const MODES = [
  { id: "ddl", label: "DDL", icon: Code2, desc: "Paste CREATE TABLE SQL" },
  { id: "json", label: "JSON", icon: FileJson, desc: "JSON schema definition" },
  { id: "xml", label: "XML", icon: FileCode, desc: "XML schema definition" },
  { id: "file", label: "Upload File", icon: Upload, desc: "Excel / CSV / JSON / XML" },
];

export default function SchemaImporter({ onImport, onClose }) {
  const [mode, setMode] = useState("ddl");
  const [text, setText] = useState("");
  const [parsedSchemas, setParsedSchemas] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSchemas, setExpandedSchemas] = useState([]);
  const [selectedTables, setSelectedTables] = useState({});
  const fileRef = useRef();

  const parse = () => {
    setError("");
    try {
      let schemas;
      if (mode === "ddl") schemas = parseDDL(text);
      else if (mode === "json") schemas = parseJSONSchema(text);
      else if (mode === "xml") schemas = parseXMLSchema(text);
      else return;

      if (Object.keys(schemas).length === 0) {
        setError("No tables found. Check your input format.");
        return;
      }
      setParsedSchemas(schemas);
      const firstSchema = Object.keys(schemas)[0];
      setExpandedSchemas([firstSchema]);
      // auto-select all
      const sel = {};
      Object.entries(schemas).forEach(([s, tables]) => {
        Object.keys(tables).forEach(t => { sel[`${s}.${t}`] = true; });
      });
      setSelectedTables(sel);
    } catch (e) {
      setError(`Parse error: ${e.message}`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            tables: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  schema: { type: "string" },
                  table: { type: "string" },
                  columns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (result.status !== "success") throw new Error(result.details || "Extraction failed");

      const rawTables = result.output?.tables || (Array.isArray(result.output) ? result.output : []);
      const schemas = {};
      rawTables.forEach(entry => {
        const s = entry.schema || "dbo";
        const t = entry.table || entry.name;
        if (!t) return;
        if (!schemas[s]) schemas[s] = {};
        schemas[s][t] = (entry.columns || []).map(c =>
          typeof c === "string" ? { name: c, type: "VARCHAR" } : c
        );
      });

      if (Object.keys(schemas).length === 0) throw new Error("No tables could be extracted from the file.");
      setParsedSchemas(schemas);
      const firstSchema = Object.keys(schemas)[0];
      setExpandedSchemas([firstSchema]);
      const sel = {};
      Object.entries(schemas).forEach(([s, tables]) => {
        Object.keys(tables).forEach(t => { sel[`${s}.${t}`] = true; });
      });
      setSelectedTables(sel);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const toggleSchema = (s) => setExpandedSchemas(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const toggleTable = (s, t) => {
    const key = `${s}.${t}`;
    setSelectedTables(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllInSchema = (s, tables) => {
    const allSelected = Object.keys(tables).every(t => selectedTables[`${s}.${t}`]);
    const updates = {};
    Object.keys(tables).forEach(t => { updates[`${s}.${t}`] = !allSelected; });
    setSelectedTables(prev => ({ ...prev, ...updates }));
  };

  const handleImport = () => {
    const objects = [];
    Object.entries(parsedSchemas).forEach(([s, tables]) => {
      Object.keys(tables).forEach(t => {
        if (selectedTables[`${s}.${t}`]) {
          objects.push({ schema: s, table: t, target_path: `/${s}/${t}`, target_format: "original" });
        }
      });
    });
    onImport(objects);
    onClose();
  };

  const selectedCount = Object.values(selectedTables).filter(Boolean).length;

  return (
    <div className="border border-blue-200 rounded-xl bg-blue-50/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-800 text-sm">Import Schema</span>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setMode(m.id); setParsedSchemas(null); setError(""); setText(""); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              mode === m.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            )}
          >
            <m.icon className="w-3.5 h-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      {mode === "file" ? (
        <div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.json,.xml" className="hidden" onChange={handleFileUpload} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="w-full border-2 border-dashed border-slate-300 rounded-lg py-8 flex flex-col items-center gap-2 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
            <span className="text-sm font-medium">{loading ? "Analysing file..." : "Click to upload"}</span>
            <span className="text-xs">Supports Excel (.xlsx), CSV, JSON, XML</span>
          </button>
          <p className="text-xs text-slate-400 mt-2">The file should contain table names and column definitions (with optional types).</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">
            {mode === "ddl" && "Paste CREATE TABLE SQL statements"}
            {mode === "json" && 'JSON format: [{ "schema": "dbo", "table": "Users", "columns": [{...}] }]'}
            {mode === "xml" && '<schema name="dbo"><table name="Users"><column name="id" type="INT"/></table></schema>'}
          </Label>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              mode === "ddl"
                ? `CREATE TABLE dbo.Customers (\n  id INT PRIMARY KEY,\n  name VARCHAR(255),\n  email VARCHAR(255)\n);`
                : mode === "json"
                ? `[{"schema":"dbo","table":"Customers","columns":[{"name":"id","type":"INT"},{"name":"name","type":"VARCHAR"}]}]`
                : `<schema name="dbo">\n  <table name="Customers">\n    <column name="id" type="INT"/>\n    <column name="name" type="VARCHAR"/>\n  </table>\n</schema>`
            }
            className="font-mono text-xs min-h-[120px] bg-white"
          />
          <Button type="button" size="sm" onClick={parse} disabled={!text.trim()} className="gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Parse Schema
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Parsed result */}
      {parsedSchemas && (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-[280px] overflow-y-auto">
            {Object.entries(parsedSchemas).map(([schemaName, tables]) => {
              const tableList = Object.keys(tables);
              const allSelected = tableList.every(t => selectedTables[`${schemaName}.${t}`]);
              const isExpanded = expandedSchemas.includes(schemaName);
              return (
                <div key={schemaName}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                    onClick={() => toggleSchema(schemaName)}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleAllInSchema(schemaName, tables)}
                      onClick={e => e.stopPropagation()}
                      className="rounded"
                    />
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                    <span className="font-medium text-slate-700 text-sm">{schemaName}</span>
                    <span className="text-xs text-slate-400 ml-auto">{tableList.length} tables</span>
                  </div>
                  {isExpanded && tableList.map(t => (
                    <div key={t} className="flex items-center gap-2 pl-8 pr-3 py-1.5 border-b border-slate-50 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={!!selectedTables[`${schemaName}.${t}`]}
                        onChange={() => toggleTable(schemaName, t)}
                        className="rounded"
                      />
                      <Table2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-700 flex-1">{t}</span>
                      <span className="text-xs text-slate-400">{tables[t]?.length || 0} cols</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{selectedCount} tables selected</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                type="button"
                size="sm"
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-3.5 h-3.5" />
                Import {selectedCount} Table{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}