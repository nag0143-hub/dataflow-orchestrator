import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Database, Table2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function SchemaDiscoveryModal({ connection, open, onClose, onSelect }) {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [selectedTables, setSelectedTables] = useState(new Set());

  useEffect(() => {
    if (open) {
      loadDiscoveries();
    }
  }, [open, connection?.id]);

  const loadDiscoveries = async () => {
    setLoading(true);
    const results = await base44.entities.DiscoveredSchema.filter({
      connection_id: connection.id
    });
    setDiscoveries(results);
    setLoading(false);
  };

  const handleDiscoverSchema = async () => {
    setDiscovering(true);
    try {
      // Simulate schema discovery based on platform
      const mockSchemas = generateMockSchemas(connection.platform);
      
      // Save discoveries
      for (const schema of mockSchemas) {
        await base44.entities.DiscoveredSchema.create({
          connection_id: connection.id,
          schema_name: schema.schema_name,
          tables: schema.tables,
          discovered_at: new Date().toISOString(),
          status: "completed"
        });
      }
      
      toast.success("Schema discovery completed");
      setSelectedTables(new Set());
      await loadDiscoveries();
    } catch (err) {
      toast.error("Discovery failed: " + err.message);
      await base44.entities.DiscoveredSchema.create({
        connection_id: connection.id,
        schema_name: "error",
        tables: [],
        status: "failed",
        error_message: err.message,
        discovered_at: new Date().toISOString()
      });
    }
    setDiscovering(false);
  };

  const generateMockSchemas = (platform) => {
    if (["adls2", "s3"].includes(platform)) {
      return [{
        schema_name: "default",
        tables: [
          { name: "customers", row_count: 5234, columns: [{ name: "id", data_type: "INT" }, { name: "name", data_type: "VARCHAR" }] },
          { name: "orders", row_count: 18976, columns: [{ name: "id", data_type: "INT" }, { name: "customer_id", data_type: "INT" }] },
          { name: "products", row_count: 1200, columns: [{ name: "id", data_type: "INT" }, { name: "name", data_type: "VARCHAR" }] }
        ]
      }];
    }
    return [
      {
        schema_name: "dbo",
        tables: [
          { name: "Customers", row_count: 5234, columns: [{ name: "CustomerID", data_type: "INT" }, { name: "CustomerName", data_type: "NVARCHAR" }] },
          { name: "Orders", row_count: 18976, columns: [{ name: "OrderID", data_type: "INT" }, { name: "CustomerID", data_type: "INT" }] }
        ]
      },
      {
        schema_name: "sales",
        tables: [
          { name: "SalesDetail", row_count: 42891, columns: [{ name: "SalesID", data_type: "INT" }, { name: "Amount", data_type: "DECIMAL" }] },
          { name: "Territory", row_count: 10, columns: [{ name: "TerritoryID", data_type: "INT" }] }
        ]
      }
    ];
  };

  const toggleTableSelection = (schemaName, tableName) => {
    const key = `${schemaName}.${tableName}`;
    const newSelected = new Set(selectedTables);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedTables(newSelected);
  };

  const handleConfirmSelection = () => {
    const selected = Array.from(selectedTables).map(key => {
      const [schema, table] = key.split(".");
      return { schema, table };
    });
    onSelect(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Discover Schemas — {connection?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!loading && discoveries.length === 0 && (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No schemas discovered yet</p>
              <Button onClick={handleDiscoverSchema} disabled={discovering} className="gap-2">
                {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Discover Schemas
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {discoveries.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">{discoveries.length} schema(s) discovered</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDiscoverSchema} 
                  disabled={discovering}
                  className="gap-1.5"
                >
                  {discovering ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Refresh
                </Button>
              </div>

              <div className="space-y-4 border-t pt-4">
                {discoveries.map((schema) => (
                  <div key={schema.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Database className="w-4 h-4 text-slate-500" />
                        {schema.schema_name}
                      </h3>
                      {schema.status === "failed" && (
                        <div className="flex items-center gap-1 text-red-600 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          {schema.error_message || "Failed"}
                        </div>
                      )}
                      {schema.status === "completed" && (
                        <span className="text-xs text-slate-500">{schema.tables?.length || 0} tables</span>
                      )}
                    </div>

                    {schema.status === "completed" && schema.tables?.length > 0 && (
                      <div className="space-y-2">
                        {schema.tables.map((table) => (
                          <div key={`${schema.schema_name}.${table.name}`} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
                            <Checkbox
                              checked={selectedTables.has(`${schema.schema_name}.${table.name}`)}
                              onCheckedChange={() => toggleTableSelection(schema.schema_name, table.name)}
                            />
                            <Table2 className="w-4 h-4 text-slate-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{table.name}</p>
                              {table.row_count !== undefined && (
                                <p className="text-xs text-slate-500">{table.row_count?.toLocaleString()} rows</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button 
                  onClick={handleConfirmSelection} 
                  disabled={selectedTables.size === 0}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Select {selectedTables.size > 0 ? `${selectedTables.size} table(s)` : "Tables"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}