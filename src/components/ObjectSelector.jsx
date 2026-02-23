import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Table2, 
  Database,
  Settings2,
  X,
  Check,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SchemaImporter from "@/components/SchemaImporter";

const mockSchemas = [
  { name: "dbo", tables: ["Customers", "Orders", "Products", "Inventory", "Suppliers", "Categories"] },
  { name: "sales", tables: ["Transactions", "Returns", "Discounts", "Promotions"] },
  { name: "hr", tables: ["Employees", "Departments", "Salaries", "Attendance"] }
];

export default function ObjectSelector({ selectedObjects = [], onChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSchemas, setExpandedSchemas] = useState(["dbo"]);
  const [configPanelObject, setConfigPanelObject] = useState(null);
  const [objectConfig, setObjectConfig] = useState({});
  const [showImporter, setShowImporter] = useState(false);

  const toggleSchema = (schema) => {
    setExpandedSchemas(prev =>
      prev.includes(schema) ? prev.filter(s => s !== schema) : [...prev, schema]
    );
  };

  const isSelected = (schema, table) =>
    selectedObjects.some(obj => obj.schema === schema && obj.table === table);

  const getObjectConfig = (schema, table) =>
    selectedObjects.find(obj => obj.schema === schema && obj.table === table);

  const toggleTable = (schema, table) => {
    if (isSelected(schema, table)) {
      onChange(selectedObjects.filter(obj => !(obj.schema === schema && obj.table === table)));
      if (configPanelObject?.schema === schema && configPanelObject?.table === table) {
        setConfigPanelObject(null);
      }
    } else {
      onChange([...selectedObjects, { schema, table, target_path: `/${schema}/${table}`, target_format: "original" }]);
    }
  };

  const selectAllInSchema = (schema, tables) => {
    const toAdd = tables
      .filter(t => !isSelected(schema, t))
      .map(t => ({ schema, table: t, target_path: `/${schema}/${t}`, target_format: "original" }));
    onChange([...selectedObjects, ...toAdd]);
  };

  const deselectAllInSchema = (schema, tables) => {
    onChange(selectedObjects.filter(obj => obj.schema !== schema));
    if (configPanelObject && tables.includes(configPanelObject.table) && configPanelObject.schema === schema) {
      setConfigPanelObject(null);
    }
  };

  const openConfig = (schema, table) => {
    const existing = getObjectConfig(schema, table);
    setObjectConfig({
      filter_query: existing?.filter_query || "",
      target_path: existing?.target_path || `/${schema}/${table}`,
      target_dataset: existing?.target_dataset || "",
      target_format: existing?.target_format || "original",
      incremental_column: existing?.incremental_column || ""
    });
    setConfigPanelObject({ schema, table });
  };

  const saveConfig = () => {
    onChange(selectedObjects.map(obj =>
      obj.schema === configPanelObject.schema && obj.table === configPanelObject.table
        ? { ...obj, ...objectConfig }
        : obj
    ));
    setConfigPanelObject(null);
  };

  const handleImportedObjects = (importedObjects) => {
    const merged = [...selectedObjects];
    importedObjects.forEach(obj => {
      if (!merged.some(o => o.schema === obj.schema && o.table === obj.table)) {
        merged.push(obj);
      }
    });
    onChange(merged);
  };

  const filteredSchemas = mockSchemas.map(schema => ({
    ...schema,
    tables: schema.tables.filter(t =>
      t.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schema.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(schema => schema.tables.length > 0);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Search + Import toggle */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowImporter(v => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              showImporter
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Import Schema
          </button>
        </div>
        {showImporter && (
          <SchemaImporter
            onImport={handleImportedObjects}
            onClose={() => setShowImporter(false)}
          />
        )}
      </div>

      {/* Object Tree */}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredSchemas.map(schema => {
          const selectedCount = schema.tables.filter(t => isSelected(schema.name, t)).length;
          const allSelected = selectedCount === schema.tables.length;

          return (
            <Collapsible
              key={schema.name}
              open={expandedSchemas.includes(schema.name)}
              onOpenChange={() => toggleSchema(schema.name)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllInSchema(schema.name, schema.tables);
                      else deselectAllInSchema(schema.name, schema.tables);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {expandedSchemas.includes(schema.name) ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-slate-700">{schema.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {selectedCount}/{schema.tables.length} selected
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {schema.tables.map(table => (
                  <div
                    key={table}
                    className={cn(
                      "flex items-center gap-2 pl-10 pr-3 py-2 hover:bg-slate-50 border-b border-slate-50",
                      isSelected(schema.name, table) && "bg-blue-50/50",
                      configPanelObject?.schema === schema.name && configPanelObject?.table === table && "bg-blue-100/60"
                    )}
                  >
                    <Checkbox
                      checked={isSelected(schema.name, table)}
                      onCheckedChange={() => toggleTable(schema.name, table)}
                    />
                    <Table2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 flex-1">{table}</span>
                    {isSelected(schema.name, table) && (
                      <button
                        type="button"
                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        onClick={(e) => { e.stopPropagation(); openConfig(schema.name, table); }}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Selected Summary */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-600">
          <span className="font-medium">{selectedObjects.length}</span> tables selected
          {configPanelObject && <span className="text-slate-400 ml-2">— configuring <span className="font-medium text-slate-600">{configPanelObject.schema}.{configPanelObject.table}</span></span>}
        </p>
      </div>

      {/* Inline Config Panel — no nested dialog */}
      {configPanelObject && (
        <div className="border-t border-blue-200 bg-blue-50/30 p-4 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-slate-800">
              Configure: <span className="text-blue-700">{configPanelObject.schema}.{configPanelObject.table}</span>
            </p>
            <button type="button" onClick={() => setConfigPanelObject(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Target Path</Label>
              <Input
                value={objectConfig.target_path}
                onChange={(e) => setObjectConfig({ ...objectConfig, target_path: e.target.value })}
                placeholder="/schema/table"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Target Dataset Name</Label>
              <Input
                value={objectConfig.target_dataset}
                onChange={(e) => setObjectConfig({ ...objectConfig, target_dataset: e.target.value })}
                placeholder="e.g. dim_customers"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Target Format</Label>
            <Select value={objectConfig.target_format} onValueChange={v => setObjectConfig({ ...objectConfig, target_format: v })}>
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original (keep source format)</SelectItem>
                <SelectItem value="parquet">Parquet</SelectItem>
                <SelectItem value="delta">Delta Lake</SelectItem>
                <SelectItem value="iceberg">Apache Iceberg</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON (line-delimited)</SelectItem>
                <SelectItem value="avro">Avro</SelectItem>
                <SelectItem value="orc">ORC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Filter Query (WHERE clause)</Label>
              <Input
                value={objectConfig.filter_query}
                onChange={(e) => setObjectConfig({ ...objectConfig, filter_query: e.target.value })}
                placeholder="status = 'active'"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Incremental Column</Label>
              <Input
                value={objectConfig.incremental_column}
                onChange={(e) => setObjectConfig({ ...objectConfig, incremental_column: e.target.value })}
                placeholder="updated_at"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfigPanelObject(null)}>Cancel</Button>
            <Button type="button" size="sm" onClick={saveConfig} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}