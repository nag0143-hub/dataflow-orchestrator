import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Plus, Search, MoreVertical, Edit, Trash2, TestTube,
  Cable, Filter, Shield, CheckCircle2, XCircle, Loader2, Wifi, Server, BookOpen, RefreshCw,
  Tag, X, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/StatusBadge";
import PlatformIcon, { platformConfig } from "@/components/PlatformIcon";
import { useTenant } from "@/components/useTenant";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorState from "@/components/ErrorState";
import moment from "moment";
import { toast } from "sonner";

import PrerequisitePanel from "@/components/PrerequisitePanel";
import ConnectionProfilePicker from "@/components/ConnectionProfilePicker";

function SaveAsProfileButton({ formData }) {
  const [saving, setSaving] = useState(false);
  const [namePrompt, setNamePrompt] = useState(false);
  const [profileName, setProfileName] = useState("");

  const handleSave = async () => {
    if (!formData.platform) { toast.error("Select a platform first"); return; }
    if (!profileName.trim()) return;
    setSaving(true);
    try {
      const { status, last_tested, notes, name: connName, ...fields } = formData;
      await base44.entities.ConnectionProfile.create({ ...fields, name: profileName.trim() });
      toast.success(`Saved as profile "${profileName.trim()}"`);
      setNamePrompt(false);
      setProfileName("");
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (namePrompt) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={profileName}
          onChange={e => setProfileName(e.target.value)}
          placeholder="Profile name..."
          className="h-8 text-sm w-44"
          autoFocus
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } if (e.key === "Escape") setNamePrompt(false); }}
        />
        <Button type="button" size="sm" disabled={saving || !profileName.trim()} onClick={handleSave} className="h-8 text-xs">Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setNamePrompt(false)} className="h-8 text-xs">✕</Button>
      </div>
    );
  }

  return (
    <Button
      type="button" variant="ghost" size="sm"
      className="text-xs text-slate-500 hover:text-slate-800 gap-1.5"
      onClick={() => { setProfileName(formData.name || ""); setNamePrompt(true); }}
    >
      <BookOpen className="w-3.5 h-3.5" />
      Save as Profile
    </Button>
  );
}

const PLATFORM_TEMPLATES = {
  sql_server:  { port: 1433, auth_method: "password", host: "" },
  oracle:      { port: 1521, auth_method: "password", host: "" },
  postgresql:  { port: 5432, auth_method: "password", host: "localhost", database: "postgres" },
  mysql:       { port: 3306, auth_method: "password", host: "localhost" },
  mongodb:     { port: 27017, auth_method: "password", host: "localhost", database: "admin" },
  adls2:       { auth_method: "managed_identity", region: "eastus", host: "https://<account>.dfs.core.windows.net" },
  s3:          { auth_method: "key", region: "us-east-1", host: "s3.amazonaws.com" },
  flat_file_delimited: { auth_method: "none", file_config: { delimiter: ",", encoding: "UTF-8", has_header: true, quote_char: '"', escape_char: "\\", file_pattern: "*.csv", nas_path: "", archive_path: "" } },
  flat_file_fixed_width: { auth_method: "none", file_config: { encoding: "UTF-8", record_length: 80, file_pattern: "*.dat", nas_path: "", archive_path: "" } },
  cobol_ebcdic: { auth_method: "none", file_config: { encoding: "EBCDIC-US", record_length: 80, file_pattern: "*.dat", copybook_path: "", nas_path: "", archive_path: "" } },
  sftp:   { port: 22, auth_method: "sftp_key" },
  nas:    { auth_method: "none", file_config: { encoding: "UTF-8", file_pattern: "*", nas_path: "", archive_path: "" } },
  local_fs: { auth_method: "none", file_config: { encoding: "UTF-8", file_pattern: "*", nas_path: "", archive_path: "" } },
};

const defaultFormData = {
  name: "", source_system_name: "", description: "", car_id: "",
  connection_type: "source", platform: "", host: "", port: "", database: "",
  username: "", auth_method: "password", region: "", bucket_container: "",
  status: "active", notes: "", tags: [],
  file_config: { delimiter: ",", encoding: "UTF-8", has_header: true, quote_char: '"', escape_char: "\\", record_length: "", copybook_path: "", file_pattern: "*", nas_path: "", archive_path: "" }
};

export default function Connections() {
  const { user, scope } = useTenant();
  const [connections, setConnections] = useState([]);
  const [prereqs, setPrereqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [groupByTag, setGroupByTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prereqDialogConn, setPrereqDialogConn] = useState(null);
  const [editingConnection, setEditingConnection] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState("general");
  const [testingId, setTestingId] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, prereqData] = await Promise.all([
        base44.entities.Connection.list(),
        base44.entities.ConnectionPrerequisite.list()
      ]);
      setConnections(scope(data));
      setPrereqs(prereqData);
    } catch (err) {
      console.error("[Connections] loadData error:", err);
      setError(err?.message || "Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  const getPrereqSummary = (connectionId) => {
    const items = prereqs.filter(p => p.connection_id === connectionId);
    const done = items.filter(p => p.status === "completed" || p.status === "not_required").length;
    return { total: items.length, done, pending: items.filter(p => p.status === "pending").length };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) { toast.error("Connection name is required"); return; }
    if (!formData.platform) { toast.error("Platform is required"); return; }

    setSaving(true);
    const payload = { ...formData, port: formData.port ? Number(formData.port) : null, last_tested: null };

    try {
      if (editingConnection) {
        await base44.entities.Connection.update(editingConnection.id, payload);
        base44.entities.ActivityLog.create({ log_type: "info", category: "connection", connection_id: editingConnection.id, message: `Connection "${formData.name}" updated` }).catch(() => {});
        toast.success("Connection updated");
      } else {
        const created = await base44.entities.Connection.create(payload);
        base44.entities.ActivityLog.create({ log_type: "success", category: "connection", connection_id: created.id, message: `Connection "${formData.name}" created` }).catch(() => {});
        toast.success("Connection created");
      }
      setDialogOpen(false);
      setEditingConnection(null);
      setFormData(defaultFormData);
      loadData();
    } catch (err) {
      console.error("[Connections] handleSubmit error:", err);
      toast.error(editingConnection ? "Failed to update connection" : "Failed to create connection");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (connection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name || "", source_system_name: connection.source_system_name || "",
      description: connection.description || "", car_id: connection.car_id || "",
      connection_type: connection.connection_type || "source", platform: connection.platform || "",
      host: connection.host || "", port: connection.port || "", database: connection.database || "",
      username: connection.username || "", auth_method: connection.auth_method || "password",
      region: connection.region || "", bucket_container: connection.bucket_container || "",
      status: connection.status || "active", notes: connection.notes || "",
      tags: connection.tags || [],
      file_config: connection.file_config || defaultFormData.file_config
    });
    setFormTab("general");
    setDialogOpen(true);
  };

  const handleDelete = async (connection) => {
    if (!confirm(`Delete connection "${connection.name}"?`)) return;
    try {
      await base44.entities.Connection.delete(connection.id);
      base44.entities.ActivityLog.create({ log_type: "warning", category: "connection", message: `Connection "${connection.name}" deleted` }).catch(() => {});
      toast.success("Connection deleted");
      loadData();
    } catch (err) {
      console.error("[Connections] handleDelete error:", err);
      toast.error("Failed to delete connection");
    }
  };

  const handleTestConnection = async (connection) => {
    setTestingId(connection.id);
    setTestResult(null);
    const startTime = Date.now();
    try {
      const hasRequired = connection.host || connection.bucket_container || connection.file_config?.nas_path;
      const hasAuth = connection.auth_method === "none" || connection.username;
      const success = !!(hasRequired && hasAuth);
      const latency = Date.now() - startTime;

      await base44.entities.Connection.update(connection.id, { status: success ? "active" : "error", last_tested: new Date().toISOString() });
      base44.entities.ActivityLog.create({
        log_type: success ? "success" : "error", category: "connection", connection_id: connection.id,
        message: success ? `Connection "${connection.name}" test passed (${latency}ms)` : `Connection "${connection.name}" test failed`
      }).catch(() => {});

      setTestResult({ connection, success, latency_ms: latency, error_code: success ? null : "INVALID_CONFIG", error_message: success ? null : "Missing required connection details", server_version: success ? "Connection validated" : null });
      loadData();
    } catch (err) {
      console.error("[Connections] handleTestConnection error:", err);
      toast.error("Test failed unexpectedly");
    } finally {
      setTestingId(null);
    }
  };

  const filteredConnections = connections.filter(c => {
    const matchesSearch = (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (c.platform || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (filterType === "all" || c.connection_type === filterType);
  });

  // Collect all unique tags across all connections
  const allTags = [...new Set(connections.flatMap(c => c.tags || []))].sort();

  // Group filtered connections by tag (connections with no tags go under "Untagged")
  const groupedByTag = groupByTag ? filteredConnections.reduce((acc, c) => {
    const tags = c.tags?.length ? c.tags : ["Untagged"];
    tags.forEach(tag => {
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(c);
    });
    return acc;
  }, {}) : null;

  const isCloudPlatform = formData.platform === "adls2" || formData.platform === "s3";
  const isFilePlatform = ["flat_file_delimited", "flat_file_fixed_width", "cobol_ebcdic", "sftp", "nas", "local_fs"].includes(formData.platform);
  const isFixedOrCobol = formData.platform === "flat_file_fixed_width" || formData.platform === "cobol_ebcdic";
  const isDelimited = formData.platform === "flat_file_delimited";
  const isCobol = formData.platform === "cobol_ebcdic";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Failed to load connections" message={error} onRetry={loadData} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Connections</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your data sources and targets</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => { setEditingConnection(null); setFormData(defaultFormData); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              New Connection
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search connections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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

        {/* Grid */}
        {filteredConnections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnections.map((connection) => (
              <Card key={connection.id} className="border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={connection.platform} />
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{connection.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{connection.connection_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-slate-500 hover:text-slate-800" onClick={() => setPrereqDialogConn(connection)}>
                        <Shield className="w-3.5 h-3.5" />
                        {(() => { const s = getPrereqSummary(connection.id); return s.total > 0 ? `${s.done}/${s.total}` : "Setup"; })()}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTestConnection(connection)}><TestTube className="w-4 h-4 mr-2" />Test Connection</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(connection)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(connection)} className="text-red-600 focus:text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Platform</span><span className="text-slate-700 dark:text-slate-300 font-medium">{platformConfig[connection.platform]?.label || connection.platform}</span></div>
                    {connection.source_system_name && <div className="flex justify-between"><span className="text-slate-500">System</span><span className="text-slate-700 dark:text-slate-300">{connection.source_system_name}</span></div>}
                    {connection.car_id && <div className="flex justify-between"><span className="text-slate-500">CarID</span><span className="text-slate-700 dark:text-slate-300">{connection.car_id}</span></div>}
                    {connection.host && <div className="flex justify-between"><span className="text-slate-500">Host</span><span className="text-slate-700 dark:text-slate-300 truncate ml-2 max-w-[150px]">{connection.host}</span></div>}
                    {connection.database && <div className="flex justify-between"><span className="text-slate-500">Database</span><span className="text-slate-700 dark:text-slate-300">{connection.database}</span></div>}
                    {connection.bucket_container && <div className="flex justify-between"><span className="text-slate-500">Container</span><span className="text-slate-700 dark:text-slate-300">{connection.bucket_container}</span></div>}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <StatusBadge status={connection.status} size="sm" />
                    <div className="flex items-center gap-2">
                      {connection.last_tested && <span className="text-xs text-slate-400">{moment(connection.last_tested).fromNow()}</span>}
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleTestConnection(connection)} disabled={testingId === connection.id}>
                        {testingId === connection.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                        {testingId === connection.id ? "Testing..." : "Test"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="py-16 text-center">
              <Cable className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No connections found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">{searchTerm ? "Try adjusting your search" : "Create your first connection to get started"}</p>
              {!searchTerm && <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />New Connection</Button>}
            </CardContent>
          </Card>
        )}

        {/* Connection Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{editingConnection ? "Edit Connection" : "New Connection"}</DialogTitle>
                {!editingConnection && (
                  <ConnectionProfilePicker onApply={(fields) => setFormData(prev => ({ ...prev, ...fields }))} />
                )}
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <Tabs value={formTab} onValueChange={setFormTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="fileconfig" disabled={!isFilePlatform}>File Config</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Connection Name *</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="My Database Connection" required />
                    </div>
                    <div>
                      <Label>Source System Name</Label>
                      <Input value={formData.source_system_name} onChange={(e) => setFormData({...formData, source_system_name: e.target.value})} placeholder="System name" />
                    </div>
                    <div>
                      <Label>CarID</Label>
                      <Input value={formData.car_id} onChange={(e) => setFormData({...formData, car_id: e.target.value})} placeholder="CAR ID" />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Connection description" />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={formData.connection_type} onValueChange={(v) => setFormData({...formData, connection_type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="source">Source</SelectItem><SelectItem value="target">Target</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Platform *</Label>
                      <Select value={formData.platform} onValueChange={(v) => {
                        const template = PLATFORM_TEMPLATES[v] || {};
                        setFormData(prev => ({ ...defaultFormData, name: prev.name, source_system_name: prev.source_system_name, description: prev.description, car_id: prev.car_id, connection_type: prev.connection_type, status: prev.status, notes: prev.notes, platform: v, ...template, file_config: { ...defaultFormData.file_config, ...(template.file_config || {}) } }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sql_server">SQL Server</SelectItem>
                          <SelectItem value="oracle">Oracle</SelectItem>
                          <SelectItem value="postgresql">PostgreSQL</SelectItem>
                          <SelectItem value="mysql">MySQL</SelectItem>
                          <SelectItem value="mongodb">MongoDB</SelectItem>
                          <SelectItem value="adls2">Azure ADLS Gen2</SelectItem>
                          <SelectItem value="s3">AWS S3</SelectItem>
                          <SelectItem value="flat_file_delimited">Flat File – Delimited</SelectItem>
                          <SelectItem value="flat_file_fixed_width">Flat File – Fixed Width</SelectItem>
                          <SelectItem value="cobol_ebcdic">COBOL / EBCDIC</SelectItem>
                          <SelectItem value="sftp">SFTP</SelectItem>
                          <SelectItem value="nas">NAS / Network Share</SelectItem>
                          <SelectItem value="local_fs">Local Filesystem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.platform && PLATFORM_TEMPLATES[formData.platform] && !editingConnection && (
                      <div className="col-span-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                        <span className="shrink-0">✦</span>
                        <span>Default values pre-filled for <strong>{platformConfig[formData.platform]?.label}</strong>. Adjust as needed.</span>
                      </div>
                    )}

                    {!isCloudPlatform && !isFilePlatform && (
                      <>
                        <div><Label>Host</Label><Input value={formData.host} onChange={(e) => setFormData({...formData, host: e.target.value})} placeholder="localhost or IP" /></div>
                        <div><Label>Port</Label><Input type="number" value={formData.port} onChange={(e) => setFormData({...formData, port: e.target.value})} placeholder="1433" /></div>
                        <div className="col-span-2"><Label>Database</Label><Input value={formData.database} onChange={(e) => setFormData({...formData, database: e.target.value})} placeholder="Database name" /></div>
                      </>
                    )}

                    {isCloudPlatform && (
                      <>
                        <div><Label>Region</Label><Input value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} placeholder={formData.platform === "s3" ? "us-east-1" : "eastus"} /></div>
                        <div><Label>{formData.platform === "s3" ? "Bucket" : "Container"}</Label><Input value={formData.bucket_container} onChange={(e) => setFormData({...formData, bucket_container: e.target.value})} placeholder="my-bucket" /></div>
                        <div className="col-span-2"><Label>Endpoint / Account URL</Label><Input value={formData.host} onChange={(e) => setFormData({...formData, host: e.target.value})} /></div>
                      </>
                    )}

                    {isFilePlatform && (
                      <>
                        {formData.platform === "sftp" && (
                          <>
                            <div><Label>SFTP Host</Label><Input value={formData.host} onChange={(e) => setFormData({...formData, host: e.target.value})} placeholder="sftp.example.com" /></div>
                            <div><Label>Port</Label><Input type="number" value={formData.port} onChange={(e) => setFormData({...formData, port: e.target.value})} placeholder="22" /></div>
                          </>
                        )}
                        {(formData.platform === "nas" || formData.platform === "local_fs") && (
                          <div className="col-span-2"><Label>Base Path</Label><Input value={formData.file_config?.nas_path || ""} onChange={(e) => setFormData({...formData, file_config: {...formData.file_config, nas_path: e.target.value}})} placeholder="\\\\server\\share or /mnt/data" /></div>
                        )}
                      </>
                    )}

                    <div>
                      <Label>Auth Method</Label>
                      <Select value={formData.auth_method} onValueChange={(v) => setFormData({...formData, auth_method: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="password">Password</SelectItem>
                          <SelectItem value="key">Access Key</SelectItem>
                          <SelectItem value="sftp_key">SFTP Private Key</SelectItem>
                          <SelectItem value="connection_string">Connection String</SelectItem>
                          <SelectItem value="managed_identity">Managed Identity</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Username / Access Key ID</Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="Username" /></div>
                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending_setup">Pending Setup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..." rows={2} /></div>
                  </div>
                </TabsContent>

                <TabsContent value="fileconfig" className="space-y-4">
                  {isDelimited && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Delimiter</Label>
                        <Select value={formData.file_config?.delimiter || ","} onValueChange={v => setFormData({...formData, file_config: {...formData.file_config, delimiter: v}})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value=",">Comma (,)</SelectItem>
                            <SelectItem value="|">Pipe (|)</SelectItem>
                            <SelectItem value="\t">Tab (\t)</SelectItem>
                            <SelectItem value=";">Semicolon (;)</SelectItem>
                            <SelectItem value=" ">Space</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Quote Character</Label><Input value={formData.file_config?.quote_char || '"'} onChange={e => setFormData({...formData, file_config: {...formData.file_config, quote_char: e.target.value}})} /></div>
                      <div><Label>Escape Character</Label><Input value={formData.file_config?.escape_char || "\\"} onChange={e => setFormData({...formData, file_config: {...formData.file_config, escape_char: e.target.value}})} /></div>
                      <div className="flex items-center gap-3 pt-6"><Switch checked={formData.file_config?.has_header ?? true} onCheckedChange={v => setFormData({...formData, file_config: {...formData.file_config, has_header: v}})} /><Label>Has Header Row</Label></div>
                    </div>
                  )}
                  {isFixedOrCobol && (
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Record Length (bytes)</Label><Input type="number" value={formData.file_config?.record_length || ""} onChange={e => setFormData({...formData, file_config: {...formData.file_config, record_length: e.target.value}})} placeholder="80" /></div>
                      {isCobol && <div className="col-span-2"><Label>Copybook Path</Label><Input value={formData.file_config?.copybook_path || ""} onChange={e => setFormData({...formData, file_config: {...formData.file_config, copybook_path: e.target.value}})} placeholder="/layouts/CUSTMAST.cbl" /></div>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Encoding</Label>
                      <Select value={formData.file_config?.encoding || "UTF-8"} onValueChange={v => setFormData({...formData, file_config: {...formData.file_config, encoding: v}})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTF-8">UTF-8</SelectItem>
                          <SelectItem value="UTF-16">UTF-16</SelectItem>
                          <SelectItem value="ISO-8859-1">ISO-8859-1</SelectItem>
                          <SelectItem value="EBCDIC-US">EBCDIC US</SelectItem>
                          <SelectItem value="EBCDIC-UK">EBCDIC UK</SelectItem>
                          <SelectItem value="ASCII">ASCII</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>File Pattern</Label><Input value={formData.file_config?.file_pattern || "*"} onChange={e => setFormData({...formData, file_config: {...formData.file_config, file_pattern: e.target.value}})} placeholder="*.csv" /></div>
                    <div className="col-span-2"><Label>Source Path</Label><Input value={formData.file_config?.nas_path || ""} onChange={e => setFormData({...formData, file_config: {...formData.file_config, nas_path: e.target.value}})} placeholder="\\\\nas01\\data or /mnt/data/in" /></div>
                    <div className="col-span-2"><Label>Archive Path</Label><Input value={formData.file_config?.archive_path || ""} onChange={e => setFormData({...formData, file_config: {...formData.file_config, archive_path: e.target.value}})} placeholder="\\\\nas01\\archive" /></div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <SaveAsProfileButton formData={formData} />
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingConnection ? "Update" : "Create"}</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Test Result Dialog */}
        <Dialog open={!!testResult} onOpenChange={(open) => !open && setTestResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {testResult?.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                Connection Test — {testResult?.connection?.name}
              </DialogTitle>
            </DialogHeader>
            {testResult && (
              <div className="space-y-4 mt-2">
                <div className={`rounded-lg p-4 flex items-start gap-3 ${testResult.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                  {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />}
                  <div>
                    <p className={`font-semibold text-sm ${testResult.success ? "text-emerald-800" : "text-red-800"}`}>{testResult.success ? "Connection Successful" : "Connection Failed"}</p>
                    {testResult.success && testResult.server_version && <p className="text-xs text-emerald-700 mt-1">{testResult.server_version}</p>}
                    {!testResult.success && testResult.error_message && <p className="text-xs text-red-700 mt-1">{testResult.error_message}</p>}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {testResult.latency_ms > 0 && <div className="flex items-center justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Latency</span><span className="font-medium">{testResult.latency_ms} ms</span></div>}
                  {!testResult.success && testResult.error_code && <div className="flex items-center justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Error Code</span><code className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded font-mono">{testResult.error_code}</code></div>}
                  <div className="flex items-center justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Platform</span><span className="font-medium">{platformConfig[testResult.connection?.platform]?.label || testResult.connection?.platform}</span></div>
                  <div className="flex items-center justify-between py-2"><span className="text-slate-500">Tested at</span><span>{moment().format("HH:mm:ss")}</span></div>
                </div>
                <div className="flex justify-end pt-2"><Button onClick={() => setTestResult(null)}>Close</Button></div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Prerequisites Dialog */}
        <Dialog open={!!prereqDialogConn} onOpenChange={(open) => !open && setPrereqDialogConn(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Setup Prerequisites — {prereqDialogConn?.name}
              </DialogTitle>
            </DialogHeader>
            {prereqDialogConn && (
              <ErrorBoundary>
                <PrerequisitePanel connection={prereqDialogConn} onUpdate={loadData} />
              </ErrorBoundary>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}