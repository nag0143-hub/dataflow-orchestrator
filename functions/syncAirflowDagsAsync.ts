import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Async background job for syncing Airflow DAGs
 * Prevents blocking user requests during long-running sync operations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { connectionId } = body;

    const connection = await base44.entities.Connection.filter(
      { id: connectionId, platform: 'airflow' }
    ).then(arr => arr[0]);

    if (!connection) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Start async sync (fire and forget, but track status)
    performSync(base44, connection).catch(err =>
      console.error(`Sync failed for ${connectionId}:`, err)
    );

    return Response.json({
      status: 'sync_started',
      message: `Airflow sync initiated for ${connection.name}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function performSync(base44, connection) {
  const airflowUrl = `${connection.host}/api/v1/dags`;
  const token = connection.username;

  const response = await fetch(airflowUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch DAGs from Airflow');
  }

  const { dags: airflowDags } = await response.json();
  const existingDags = await base44.entities.AirflowDAG.filter({
    airflow_connection_id: connection.id,
  });

  const dagMap = new Map(existingDags.map(d => [d.dag_id, d]));

  for (const dag of airflowDags) {
    const existing = dagMap.get(dag.dag_id);
    if (existing) {
      await base44.entities.AirflowDAG.update(existing.id, {
        is_paused: dag.is_paused,
        last_sync: new Date().toISOString(),
      });
    } else {
      await base44.entities.AirflowDAG.create({
        airflow_connection_id: connection.id,
        dag_id: dag.dag_id,
        dag_name: dag.dag_id,
        owner: dag.owner || 'unknown',
        is_paused: dag.is_paused,
        schedule_interval: dag.schedule_interval || 'None',
        status: dag.is_paused ? 'paused' : 'active',
        task_count: 0,
        last_sync: new Date().toISOString(),
      });
    }
  }

  console.log(`✓ Synced ${airflowDags.length} DAGs for ${connection.name}`);
}