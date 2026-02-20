import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  TestTube,
  Cable,
  Database,
  Cloud,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/StatusBadge";
import PlatformIcon, { platformConfig } from "@/components/PlatformIcon";
import moment from "moment";
import { toast } from "sonner";

const defaultFormData = {
  name: "",
  connection_type: "source",
  platform: "",
  host: "",
  port: "",
  database: "",
  username: "",
  auth_method: "password",
  region: "",
  bucket_container: "",
  status: "active",
  notes: ""
};

export default function Connections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const data = await base44.entities.Connection.list();
    setConnections(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      ...formData,
      port: formData.port ? Number(formData.port) : null,
      last_tested: null
    };

    if (editingConnection) {
      await base44.entities.Connection.update(editingConnection.id, payload);
      await base44.entities.ActivityLog.create({
        log_type: "info",
        category: "connection",
        connection_id: editingConnection.id,
        message: `Connection "${formData.name}" updated`
      });
      toast.success("Connection updated");
    } else {
      const created = await base44.entities.Connection.create(payload);
      await base44.entities.ActivityLog.create({
        log_type: "success",
        category: "connection",
        connection_id: created.id,
        message: `Connection "${formData.name}" created`
      });
      toast.success("Connection created");
    }

    setDialogOpen(false);
    setEditingConnection(null);
    setFormData(defaultFormData);
    setSaving(false);
    loadConnections();
  };

  const handleEdit = (connection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name || "",
      connection_type: connection.connection_type || "source",
      platform: connection.platform || "",
      host: connection.host || "",
      port: connection.port || "",
      database: connection.database || "",
      username: connection.username || "",
      auth_method: connection.auth_method || "password",
      region: connection.region || "",
      bucket_container: connection.bucket_container || "",
      status: connection.status || "active",
      notes: connection.notes || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (connection) => {
    if (!confirm(`Delete connection "${connection.name}"?`)) return;
    
    await base44.entities.Connection.delete(connection.id);
    await base44.entities.ActivityLog.create({
      log_type: "warning",
      category: "connection",
      message: `Connection "${connection.name}" deleted`
    });
    toast.success("Connection deleted");
    loadConnections();
  };

  const handleTestConnection = async (connection) => {
    toast.info("Testing connection...");
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.3; // 70% success rate simulation
    
    await base44.entities.Connection.update(connection.id, {
      status: success ? "active" : "error",
      last_tested: new Date().toISOString()
    });
    
    await base44.entities.ActivityLog.create({
      log_type: success ? "success" : "error",
      category: "connection",
      connection_id: connection.id,
      message: success 
        ? `Connection "${connection.name}" test successful` 
        : `Connection "${connection.name}" test failed`
    });
    
    toast[success ? "success" : "error"](
      success ? "Connection test successful" : "Connection test failed"
    );
    
    loadConnections();
  };

  const filteredConnections = connections.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.platform?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || c.connection_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const isCloudPlatform = formData.platform === "adls2" || formData.platform === "s3";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Connections</h1>
          <p className="text-slate-500 mt-1">Manage your data sources and targets</p>
        </div>
        <Button 
          onClick={() => { setEditingConnection(null); setFormData(defaultFormData); setDialogOpen(true); }}
          className="bg-slate-900 hover:bg-slate-800 gap-2"
        >
          <Plus className="w-4 h-4" />
          New Connection
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search connections..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="source">Sources</SelectItem>
            <SelectItem value="target">Targets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Connections Grid */}
      {filteredConnections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConnections.map((connection) => (
            <Card key={connection.id} className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={connection.platform} />
                    <div>
                      <h3 className="font-semibold text-slate-900">{connection.name}</h3>
                      <p className="text-xs text-slate-500 capitalize">{connection.connection_type}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTestConnection(connection)}>
                        <TestTube className="w-4 h-4 mr-2" />
                        Test Connection
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(connection)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(connection)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Platform</span>
                    <span className="text-slate-700 font-medium">
                      {platformConfig[connection.platform]?.label || connection.platform}
                    </span>
                  </div>
                  {connection.host && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Host</span>
                      <span className="text-slate-700 truncate ml-2 max-w-[150px]">{connection.host}</span>
                    </div>
                  )}
                  {connection.database && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Database</span>
                      <span className="text-slate-700">{connection.database}</span>
                    </div>
                  )}
                  {connection.bucket_container && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Container</span>
                      <span className="text-slate-700">{connection.bucket_container}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <StatusBadge status={connection.status} size="sm" />
                  {connection.last_tested && (
                    <span className="text-xs text-slate-400">
                      Tested {moment(connection.last_tested).fromNow()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <Cable className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No connections found</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm ? "Try adjusting your search" : "Create your first connection to get started"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Connection
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConnection ? "Edit Connection" : "New Connection"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Connection Name</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="My Database Connection"
                  required
                />
              </div>
              
              <div>
                <Label>Type</Label>
                <Select 
                  value={formData.connection_type}
                  onValueChange={(v) => setFormData({...formData, connection_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="target">Target</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Platform</Label>
                <Select 
                  value={formData.platform}
                  onValueChange={(v) => setFormData({...formData, platform: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sql_server">SQL Server</SelectItem>
                    <SelectItem value="oracle">Oracle</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                    <SelectItem value="adls2">Azure ADLS Gen2</SelectItem>
                    <SelectItem value="s3">AWS S3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isCloudPlatform && (
                <>
                  <div>
                    <Label>Host</Label>
                    <Input 
                      value={formData.host}
                      onChange={(e) => setFormData({...formData, host: e.target.value})}
                      placeholder="localhost or IP"
                    />
                  </div>
                  
                  <div>
                    <Label>Port</Label>
                    <Input 
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({...formData, port: e.target.value})}
                      placeholder="1433"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Database</Label>
                    <Input 
                      value={formData.database}
                      onChange={(e) => setFormData({...formData, database: e.target.value})}
                      placeholder="Database name"
                    />
                  </div>
                </>
              )}

              {isCloudPlatform && (
                <>
                  <div>
                    <Label>Region</Label>
                    <Input 
                      value={formData.region}
                      onChange={(e) => setFormData({...formData, region: e.target.value})}
                      placeholder={formData.platform === "s3" ? "us-east-1" : "eastus"}
                    />
                  </div>
                  
                  <div>
                    <Label>{formData.platform === "s3" ? "Bucket" : "Container"}</Label>
                    <Input 
                      value={formData.bucket_container}
                      onChange={(e) => setFormData({...formData, bucket_container: e.target.value})}
                      placeholder="my-bucket"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Endpoint / Account URL</Label>
                    <Input 
                      value={formData.host}
                      onChange={(e) => setFormData({...formData, host: e.target.value})}
                      placeholder={formData.platform === "s3" ? "s3.amazonaws.com" : "https://account.dfs.core.windows.net"}
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Auth Method</Label>
                <Select 
                  value={formData.auth_method}
                  onValueChange={(v) => setFormData({...formData, auth_method: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password">Password</SelectItem>
                    <SelectItem value="key">Access Key</SelectItem>
                    <SelectItem value="connection_string">Connection String</SelectItem>
                    <SelectItem value="managed_identity">Managed Identity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Username / Access Key ID</Label>
                <Input 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Username"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={formData.status}
                  onValueChange={(v) => setFormData({...formData, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional notes about this connection..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingConnection ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}