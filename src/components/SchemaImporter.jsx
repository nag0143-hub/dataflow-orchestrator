import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileCode, FileJson, FileText, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseDDL(text) {
  // Match: CREATE TABLE [schema.]table ( ... )
  const schemas = {};
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`\[]?(\w+)["'`\]]?\.?["'`\[]?(\w+)["'`\]]?\s*\(/gi;
  const colRegex = /^\s*["'`\[]?(\w+)["'`\]]?\s+([\w()]+(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)/;

  let match;
  while ((match = tableRegex.exec(text)) !== null) {
    const [, rawSchema, rawTable] = match;
    const schema = rawSchema.toLowerCase();
    const table = rawTable;

    // Extract columns from the table body
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < text.length && depth > 0) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") depth--;
      i++;
    }
    const body = text.slice(bodyStart, i - 1);
    const lines = body.split("\n");
    const columns = [];
    for (const line of lines) {
      const m = colRegex.exec(line);
      if (m && !["PRIMARY", "FOREIGN", "UNIQUE", "INDEX", "KEY", "CONSTRAINT", "CHECK"].includes(m[1].toUpperCase())) {
        columns.push({ name: m[1], type: m[2].toUpperCase() });
      }
    }

    if (!schemas[schema]) schemas[schema] = {};
    schemas[schema][table] = columns;
  }
  return buildResult(schemas);
}

function parseJSON(text) {
  const data = JSON.parse(text);
  const schemas = {};

  const processTable = (schema, table, cols) => {
    if (!schemas[schema]) schemas[schema] = {};
    const columns = [];
    if (Array.isArray(cols)) {
      cols.forEach(c => {
        if (typeof c === "string") columns.push({ name: c, type: "VARCHAR" });
        else if (c.name) columns.push({ name: c.name, type: c.type || c.dataType || "VARCHAR" });
      });
    } else if (typeof cols === "object") {
      Object.entries(cols).forEach(([name, type]) => columns.push({ name, type: typeof type === "string" ? type : "VARCHAR" }));
    }
    schemas[schema][table] = columns;
  };

  if (Array.isArray(data)) {
    // [{ schema, table, columns }] or [{ name, columns }]
    data.forEach(entry => {
      const schema = entry.schema || "dbo";
      const table = entry.table || entry.name;
      if (table) processTable(schema, table, entry.columns || entry.fields || []);
    });
  } else if (data.tables) {
    data.tables.forEach(t => processTable(t.schema || "dbo", t.table || t.name, t.columns || []));
  } else if (data.schemas) {
    Object.entries(data.schemas).forEach(([schema, tables]) => {
      Object.entries(tables).forEach(([table, cols]) => processTable(schema, table, cols));
    });
  } else {
    // { schema: { table: [cols] } }
    Object.entries(data).forEach(([schema, tables]) => {
      if (typeof tables === "object" && !Array.isArray(tables)) {
        Object.entries(tables).forEach(([table, cols]) => processTable(schema, table, Array.isArray(cols) ? cols : []));
      }
    });
  }

  return buildResult(schemas);
}

function parseXML(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const schemas = {};

  const tables = doc.querySelectorAll("table, Table, TABLE, entity, Entity");
  tables.forEach(tableEl => {
    const schema = tableEl.getAttribute("schema") || tableEl.getAttribute("Schema") || "dbo";
    const tableName = tableEl.getAttribute("name") || tableEl.getAttribute("Name") || tableEl.tagName;
    if (!schemas[schema]) schemas[schema] = {};
    const columns = [];
    tableEl.querySelectorAll("column, Column, field, Field, attribute, Attribute").forEach(colEl => {
      const name = colEl.getAttribute("name") || colEl.getAttribute("Name") || colEl.textContent.trim();
      const type = colEl.getAttribute("type") || colEl.getAttribute("dataType") || colEl.getAttribute("Type") || "VARCHAR";
      if (name) columns.push({ name, type: type.toUpperCase() });
    });
    schemas[schema][tableName] = columns;
  });

  return buildResult(schemas);
}

function parseCSV(text) {
  // Expected: schema,table,column,type  OR  table,column,type
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const schemas = {};

  const schemaIdx = headers.indexOf("schema");
  const tableIdx = headers.findIndex(h => h === "table" || h === "table_name");
  const colIdx = headers.findIndex(h => h === "column" || h === "column_name");
  const typeIdx = headers.findIndex(h => h === "type" || h === "data_type" || h === "datatype");

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map(p => p.trim().replace(/['"]/g, ""));
    const schema = schemaIdx >= 0 ? parts[schemaIdx] : "dbo";
    const table = tableIdx >= 0 ? parts[tableIdx] : null;
    const col = colIdx >= 0 ? parts[colIdx] : null;
    const type = typeIdx >= 0 ? parts[typeIdx] : "VARCHAR";
    if (!table || !col) continue;
    if (!schemas[schema]) schemas[schema] = {};
    if (!schemas[schema][table]) schemas[schema][table] = [];
    schemas[schema][table].push({ name: col, type: type.toUpperCase() });
  }

  return buildResult(schemas);
}

function buildResult(schemas) {
  return Object.entries(schemas).map(([name, tables]) => ({
    name,
    tables: Object.entries(tables).map(([tName, columns]) => ({ name: tName, columns }))
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

const FORMAT_ICONS = {
  sql: FileCode,
  json: FileJson,
  xml: FileText,
  csv: FileText,
  xlsx: FileText,
};

export default function SchemaImporter({ onImport, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState(null); // [{ name, tables: [{ name, columns }] }]
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [expanded, setExpanded] = useState({});
  const fileRef = useRef();

  const processFile = async (file) => {
    setError(null);
    setParsed(null);
    setFileName(file.name);
    const ext = file.name.split(".").pop().toLowerCase();

    const text = await file.text();
    let result;
    try {
      if (ext === "sql") result = parseDDL(text);
      else if (ext === "json") result = parseJSON(text);
      else if (ext === "xml") result = parseXML(text);
      else if (ext === "csv") result = parseCSV(text);
      else {
        setError("Unsupported format. Please upload .sql, .json, .xml, or .csv");
        return;
      }

      if (!result || result.length === 0) {
        setError("No tables found in the file. Check the format and try again.");
        return;
      }
      setParsed(result);
      // Auto-expand first schema
      setExpanded({ [result[0].name]: true });
    } catch (e) {
      setError(`Parse error: ${e.message}`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const totalTables = parsed?.reduce((sum, s) => sum + s.tables.length, 0) || 0;

  const handleImport = () => {
    onImport(parsed);
    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!parsed && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
            dragging ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
          )}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="font-medium text-slate-700 mb-1">Drop your schema file here</p>
          <p className="text-sm text-slate-400 mb-3">Supports .sql (DDL), .json, .xml, .csv</p>
          <div className="flex justify-center gap-2">
            {["SQL", "JSON", "XML", "CSV"].map(f => (
              <span key={f} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono">.{f.toLowerCase()}</span>
            ))}
          </div>
          <input ref={fileRef} type="file" accept=".sql,.json,.xml,.csv" className="hidden" onChange={handleFileInput} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview */}
      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Parsed from <code className="font-mono text-xs bg-slate-100 px-1 rounded">{fileName}</code></span>
            </div>
            <button type="button" onClick={() => { setParsed(null); setFileName(null); }} className="text-xs text-slate-400 hover:text-slate-600 underline">
              Change file
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto text-sm">
            {parsed.map(schema => (
              <div key={schema.name}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border-b border-slate-100 font-medium text-slate-700"
                  onClick={() => setExpanded(prev => ({ ...prev, [schema.name]: !prev[schema.name] }))}
                >
                  {expanded[schema.name] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <span className="text-blue-600">{schema.name}</span>
                  <span className="ml-auto text-xs text-slate-400 font-normal">{schema.tables.length} tables</span>
                </button>
                {expanded[schema.name] && schema.tables.map(table => (
                  <div key={table.name} className="border-b border-slate-50">
                    <div className="pl-8 pr-3 py-1.5 text-slate-700 bg-white font-medium text-xs flex items-center gap-2">
                      <span>📄 {table.name}</span>
                      <span className="text-slate-400 font-normal">({table.columns.length} cols)</span>
                    </div>
                    {table.columns.slice(0, 5).map(col => (
                      <div key={col.name} className="pl-12 pr-3 py-0.5 text-xs text-slate-500 bg-white flex gap-3">
                        <span className="font-mono">{col.name}</span>
                        <span className="text-slate-400">{col.type}</span>
                      </div>
                    ))}
                    {table.columns.length > 5 && (
                      <div className="pl-12 py-0.5 text-xs text-slate-400 bg-white">+{table.columns.length - 5} more columns</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{parsed.length}</span> schemas, <span className="font-semibold text-slate-800">{totalTables}</span> tables will be added to the object list.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        {parsed && (
          <Button type="button" size="sm" onClick={handleImport} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Import {totalTables} Tables
          </Button>
        )}
      </div>
    </div>
  );
}