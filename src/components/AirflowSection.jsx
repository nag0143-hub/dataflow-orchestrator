import { useState, useEffect } from "react";
import { dataflow } from '@/api/client';
import { RefreshCw, Plus, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AirflowDAGViewer from "./AirflowDAGViewer";

export default function AirflowSection() {
  const [airflowConnections, setAirflowConnections] = useState([]);
  const [dags, setDags] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingConnection, setAddingConnection] = useState(false);
  const [newConnForm, setNewConnForm] = useState({ name: "", host: "", username: "" });
  const [savingConnection, setSavingConnection] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [connections, dagsData] = await Promise.all([
        dataflow.entities.Connection.filter({ platform: "airflow" }),
        dataflow.entities.AirflowDAG.list()
      ]);
      setAirflowConnections(connections);
      setDags(dagsData);
      if (connections.length > 0 && !selectedConnection) {
        setSelectedConnection(connections[0].id);
      }
    } catch (err) {
      toast.error("Failed to load Airflow data");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDAGs = async () => {
    if (!selectedConnection) {
      toast.error("Select an Airflow connection first");
      return;
    }

    setSyncing(true);
    try {
      const connection = airflowConnections.find(c => c.id === selectedConnection);
      if (!connection?.host) {
        toast.error("Airflow connection not configured");
        return;
      }

      const airflowUrl = `${connection.host}/api/v1/dags`;
      const token = connection.username; // API token

      const response = await fetch(airflowUrl, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const { dags: airflowDags } = await response.json();

        // Sync each DAG
        for (const airflowDag of airflowDags) {
          const existingDag = dags.find(
            d => d.dag_id === airflowDag.dag_id && d.airflow_connection_id === selectedConnection
          );

          if (existingDag) {
            await dataflow.entities.AirflowDAG.update(existingDag.id, {
              is_paused: airflowDag.is_paused,
              last_sync: new Date().toISOString(),
              status: airflowDag.is_paused ? "paused" : "active"
            });
          } else {
            await dataflow.entities.AirflowDAG.create({
              airflow_connection_id: selectedConnection,
              dag_id: airflowDag.dag_id,
              dag_name: airflowDag.dag_id,
              owner: airflowDag.owner || "unknown",
              is_paused: airflowDag.is_paused,
              status: airflowDag.is_paused ? "paused" : "active",
              schedule_interval: airflowDag.schedule_interval || "None",
              task_count: 0,
              last_sync: new Date().toISOString()
            });
          }
        }

        toast.success(`Synced ${airflowDags.length} DAGs`);
        loadData();
      } else {
        toast.error("Failed to fetch DAGs from Airflow");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredDags = dags.filter(d => d.airflow_connection_id === selectedConnection);
  const selectedConnData = airflowConnections.find(c => c.id === selectedConnection);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const handleAddConnection = async () => {
    if (!newConnForm.name?.trim() || !newConnForm.host?.trim() || !newConnForm.username?.trim()) {
      toast.error("All fields are required");
      return;
    }

    setSavingConnection(true);
    try {
      await dataflow.entities.Connection.create({
        name: newConnForm.name,
        platform: "airflow",
        connection_type: "source",
        host: newConnForm.host,
        username: newConnForm.username,
        status: "active"
      });

      toast.success("Airflow instance added");
      setAddingConnection(false);
      setNewConnForm({ name: "", host: "", username: "" });
      loadData();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSavingConnection(false);
    }
  };

  if (airflowConnections.length === 0) {
    if (addingConnection) {
      return (
        <Card className="border-slate-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Add Airflow Instance</h3>
              <button onClick={() => setAddingConnection(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <Label className="text-sm">Instance Name</Label>
              <Input
                placeholder="My Airflow"
                value={newConnForm.name}
                onChange={(e) => setNewConnForm({ ...newConnForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm">Airflow URL</Label>
              <Input
                placeholder="https://airflow.example.com"
                value={newConnForm.host}
                onChange={(e) => setNewConnForm({ ...newConnForm, host: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm">API Token</Label>
              <Input
                type="password"
                placeholder="Your Airflow API token"
                value={newConnForm.username}
                onChange={(e) => setNewConnForm({ ...newConnForm, username: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddingConnection(false)}>Cancel</Button>
              <Button onClick={handleAddConnection} disabled={savingConnection}>
                {savingConnection ? "Adding..." : "Add Instance"}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Airflow Instances</h3>
          <p className="text-slate-500 mb-4">Monitor Airflow DAGs alongside your data transfer jobs</p>
          <Button onClick={() => setAddingConnection(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Airflow Instance
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-slate-500 mb-2 block">Airflow Instance</Label>
          <Select value={selectedConnection} onValueChange={setSelectedConnection}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {airflowConnections.map(conn => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSyncDAGs}
          disabled={syncing}
          className="gap-2 self-end"
        >
          <RefreshCw className="w-4 h-4" />
          {syncing ? "Syncing..." : "Sync DAGs"}
        </Button>
      </div>

      {filteredDags.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDags.map(dag => (
            <AirflowDAGViewer
              key={dag.id}
              dag={dag}
              airflowConnection={selectedConnData}
            />
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No DAGs Found</h3>
            <p className="text-slate-500 mb-4">Sync your Airflow instance to see DAGs</p>
            <Button onClick={handleSyncDAGs} disabled={syncing} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync DAGs
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}