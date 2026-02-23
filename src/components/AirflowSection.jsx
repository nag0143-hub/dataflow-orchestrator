import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import AirflowDAGViewer from "./AirflowDAGViewer";

export default function AirflowSection() {
  const [airflowConnections, setAirflowConnections] = useState([]);
  const [dags, setDags] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [connections, dagsData] = await Promise.all([
        base44.entities.Connection.filter({ platform: "airflow" }),
        base44.entities.AirflowDAG.list()
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
            await base44.entities.AirflowDAG.update(existingDag.id, {
              is_paused: airflowDag.is_paused,
              last_sync: new Date().toISOString(),
              status: airflowDag.is_paused ? "paused" : "active"
            });
          } else {
            await base44.entities.AirflowDAG.create({
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

  if (airflowConnections.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Airflow Connections</h3>
          <p className="text-slate-500 mb-4">Add an Airflow connection to view and manage DAGs</p>
          <Link to={createPageUrl("Connections")}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Airflow Connection
            </Button>
          </Link>
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