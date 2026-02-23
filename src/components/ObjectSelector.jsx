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
  Plus,
  Trash2,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock schema/tables for demonstration
const mockSchemas = [
  {
    name: "dbo",
    tables: ["Customers", "Orders", "Products", "Inventory", "Suppliers", "Categories"]
  },
  {
    name: "sales",
    tables: ["Transactions", "Returns", "Discounts", "Promotions"]
  },
  {
    name: "hr",
    tables: ["Employees", "Departments", "Salaries", "Attendance"]
  }
];

export default function ObjectSelector({ selectedObjects = [], onChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSchemas, setExpandedSchemas] = useState(["dbo"]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [currentObject, setCurrentObject] = useState(null);
  const [objectConfig, setObjectConfig] = useState({
    filter_query: "",
    target_path: "",
    incremental_column: ""
  });

  const toggleSchema = (schema) => {
    setExpandedSchemas(prev => 
      prev.includes(schema) 
        ? prev.filter(s => s !== schema)
        : [...prev, schema]
    );
  };

  const isSelected = (schema, table) => {
    return selectedObjects.some(obj => obj.schema === schema && obj.table === table);
  };

  const getObjectConfig = (schema, table) => {
    return selectedObjects.find(obj => obj.schema === schema && obj.table === table);
  };

  const toggleTable = (schema, table) => {
    if (isSelected(schema, table)) {
      onChange(selectedObjects.filter(obj => !(obj.schema === schema && obj.table === table)));
    } else {
      onChange([...selectedObjects, { schema, table, target_path: `/${schema}/${table}` }]);
    }
  };

  const selectAllInSchema = (schema, tables) => {
    const schemasToAdd = tables
      .filter(t => !isSelected(schema, t))
      .map(t => ({ schema, table: t, target_path: `/${schema}/${t}` }));
    onChange([...selectedObjects, ...schemasToAdd]);
  };

  const deselectAllInSchema = (schema, tables) => {
    onChange(selectedObjects.filter(obj => obj.schema !== schema));
  };

  const openConfig = (schema, table) => {
    const existing = getObjectConfig(schema, table);
    setCurrentObject({ schema, table });
    setObjectConfig({
      filter_query: existing?.filter_query || "",
      target_path: existing?.target_path || `/${schema}/${table}`,
      incremental_column: existing?.incremental_column || ""
    });
    setConfigDialogOpen(true);
  };

  const saveConfig = () => {
    onChange(selectedObjects.map(obj => 
      obj.schema === currentObject.schema && obj.table === currentObject.table
        ? { ...obj, ...objectConfig }
        : obj
    ));
    setConfigDialogOpen(false);
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
      {/* Search */}
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
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
                      isSelected(schema.name, table) && "bg-blue-50/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected(schema.name, table)}
                      onCheckedChange={() => toggleTable(schema.name, table)}
                    />
                    <Table2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 flex-1">{table}</span>
                    {isSelected(schema.name, table) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                        onClick={() => openConfig(schema.name, table)}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </Button>
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
        </p>
      </div>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configure {currentObject?.schema}.{currentObject?.table}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Target Path</Label>
              <Input
                value={objectConfig.target_path}
                onChange={(e) => setObjectConfig({...objectConfig, target_path: e.target.value})}
                placeholder="/schema/table"
              />
              <p className="text-xs text-slate-500 mt-1">Path in target storage</p>
            </div>
            
            <div>
              <Label>Filter Query (WHERE clause)</Label>
              <Input
                value={objectConfig.filter_query}
                onChange={(e) => setObjectConfig({...objectConfig, filter_query: e.target.value})}
                placeholder="status = 'active' AND created_date > '2024-01-01'"
              />
              <p className="text-xs text-slate-500 mt-1">Optional filter condition</p>
            </div>
            
            <div>
              <Label>Incremental Column</Label>
              <Input
                value={objectConfig.incremental_column}
                onChange={(e) => setObjectConfig({...objectConfig, incremental_column: e.target.value})}
                placeholder="updated_at"
              />
              <p className="text-xs text-slate-500 mt-1">Column for incremental loads</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveConfig}>
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}