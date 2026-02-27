import express from 'express';
import { pool, entityNameToTable } from './db.js';

const router = express.Router();

const BLOCKED_IP_RANGES = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^169\.254\./, /^0\./, /^fc00:/i, /^fe80:/i, /^::1$/, /^localhost$/i,
];

function validateAirflowHost(host) {
  if (!host || typeof host !== 'string') throw new Error('Airflow URL is required');
  let url;
  try { url = new URL(host); } catch { throw new Error('Invalid Airflow URL format'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Airflow URL must use http or https');
  const hostname = url.hostname;
  for (const pattern of BLOCKED_IP_RANGES) {
    if (pattern.test(hostname)) throw new Error('Airflow URL points to a restricted network address');
  }
  return url.origin;
}

function formatRecord(row) {
  return { id: String(row.id), ...row.data, created_date: row.created_date, updated_date: row.updated_date };
}

async function getAirflowConnection(connectionId) {
  const table = entityNameToTable('Connection');
  const result = await pool.query(`SELECT * FROM "${table}" WHERE id = $1`, [parseInt(connectionId)]);
  if (result.rows.length === 0) return null;
  const rec = formatRecord(result.rows[0]);
  return rec;
}

async function airflowFetch(connection, apiPath, options = {}) {
  const baseUrl = validateAirflowHost(connection.host);

  const url = `${baseUrl}/api/v1${apiPath}`;
  const token = connection.api_token || connection.password || connection.username;
  const authUser = connection.airflow_username || connection.username;
  const authPass = connection.airflow_password || connection.password;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (connection.auth_method === 'basic' && authUser && authPass) {
    headers['Authorization'] = `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const status = resp.status;
    if (status === 401) throw new Error('Authentication failed (401) — verify your username/password or API token are correct');
    if (status === 403) throw new Error('Access denied (403) — the credentials are valid but lack permission. Check the user role in Airflow');
    if (status === 404) throw new Error('Airflow API endpoint not found (404) — verify the URL includes the correct base path (e.g., https://airflow.example.com)');
    throw new Error(`Airflow API returned ${status}: ${text.substring(0, 200)}`);
  }

  return resp.json();
}

router.get('/connections', async (req, res) => {
  try {
    const table = entityNameToTable('Connection');
    const result = await pool.query(
      `SELECT * FROM "${table}" WHERE data->>'platform' = 'airflow' ORDER BY created_date DESC`
    );
    const conns = result.rows.map(r => {
      const rec = formatRecord(r);
      delete rec.password;
      delete rec.api_token;
      delete rec.airflow_password;
      return rec;
    });
    res.json(conns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/connections', async (req, res) => {
  try {
    const { name, host, auth_method, username, password, api_token } = req.body;
    if (!name?.trim() || !host?.trim()) return res.status(400).json({ error: 'Name and Airflow URL are required' });

    const validatedHost = validateAirflowHost(host);

    const table = entityNameToTable('Connection');
    const data = {
      name, host: validatedHost, platform: 'airflow', connection_type: 'orchestrator',
      auth_method: auth_method || 'bearer', username, password, api_token, status: 'active',
    };
    const result = await pool.query(
      `INSERT INTO "${table}" (data, created_by) VALUES ($1, $2) RETURNING *`,
      [JSON.stringify(data), 'user@local']
    );
    const rec = formatRecord(result.rows[0]);
    delete rec.password; delete rec.api_token; delete rec.airflow_password;
    res.status(201).json(rec);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/connections/:id', async (req, res) => {
  try {
    const table = entityNameToTable('Connection');
    await pool.query(`DELETE FROM "${table}" WHERE id = $1`, [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/connections/test', async (req, res) => {
  const start = Date.now();
  try {
    const { host, auth_method, username, password, api_token } = req.body;
    if (!host?.trim()) return res.status(400).json({ success: false, error: 'Airflow URL is required' });

    const validatedHost = validateAirflowHost(host);
    const tempConn = { host: validatedHost, auth_method, username, password, api_token };

    const data = await airflowFetch(tempConn, '/health');
    res.json({ success: true, latency_ms: Date.now() - start, details: data });
  } catch (err) {
    let errorMsg = err.message;
    if (err.cause?.code === 'ECONNREFUSED') {
      errorMsg = 'Connection refused — the Airflow server is not reachable at this URL. Check that the host and port are correct and the server is running.';
    } else if (err.cause?.code === 'ENOTFOUND' || err.cause?.code === 'EAI_AGAIN') {
      errorMsg = 'Could not resolve hostname — check the Airflow URL for typos.';
    } else if (err.name === 'AbortError' || err.message?.includes('timed out')) {
      errorMsg = 'Connection timed out after 15 seconds — the Airflow server may be unreachable or behind a firewall.';
    } else if (err.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || err.message?.includes('certificate')) {
      errorMsg = 'SSL certificate error — the Airflow server has an untrusted certificate. Try using http:// instead of https://, or ensure the certificate is valid.';
    }
    res.json({ success: false, error: errorMsg, latency_ms: Date.now() - start });
  }
});

router.post('/connections/:id/test', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.id);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const start = Date.now();
    const data = await airflowFetch(conn, '/health');
    res.json({ success: true, latency_ms: Date.now() - start, details: data });
  } catch (err) {
    res.json({ success: false, error: err.message, latency_ms: 0 });
  }
});

router.get('/:connectionId/dags', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const onlyActive = req.query.only_active === 'true';
    const search = req.query.search || '';

    let path = `/dags?limit=${limit}&offset=${offset}&order_by=-last_parsed_time`;
    if (onlyActive) path += '&only_active=true';
    if (search) path += `&dag_id_pattern=${encodeURIComponent(search)}`;

    const data = await airflowFetch(conn, path);
    res.json({
      dags: (data.dags || []).map(d => ({
        dag_id: d.dag_id,
        description: d.description,
        file_token: d.file_token,
        is_paused: d.is_paused,
        is_active: d.is_active,
        owners: d.owners,
        schedule_interval: d.schedule_interval?.value || d.timetable_description || null,
        tags: (d.tags || []).map(t => t.name || t),
        last_parsed_time: d.last_parsed_time,
        next_dagrun: d.next_dagrun,
        has_task_concurrency_limits: d.has_task_concurrency_limits,
      })),
      total_entries: data.total_entries || 0,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/:connectionId/dags/:dagId', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const data = await airflowFetch(conn, `/dags/${encodeURIComponent(req.params.dagId)}`);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/:connectionId/dags/:dagId/dagRuns', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = parseInt(req.query.offset) || 0;
    const data = await airflowFetch(conn,
      `/dags/${encodeURIComponent(req.params.dagId)}/dagRuns?limit=${limit}&offset=${offset}&order_by=-execution_date`
    );
    res.json({
      dag_runs: (data.dag_runs || []).map(r => ({
        dag_run_id: r.dag_run_id,
        dag_id: r.dag_id,
        state: r.state,
        execution_date: r.execution_date,
        start_date: r.start_date,
        end_date: r.end_date,
        external_trigger: r.external_trigger,
        conf: r.conf,
      })),
      total_entries: data.total_entries || 0,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/:connectionId/dags/:dagId/tasks', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const data = await airflowFetch(conn, `/dags/${encodeURIComponent(req.params.dagId)}/tasks`);
    res.json({
      tasks: (data.tasks || []).map(t => ({
        task_id: t.task_id,
        operator_name: t.operator_name,
        downstream_task_ids: t.downstream_task_ids,
        pool: t.pool,
        retries: t.retries,
      })),
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/:connectionId/dags/:dagId/dagRuns/:runId/taskInstances', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const data = await airflowFetch(conn,
      `/dags/${encodeURIComponent(req.params.dagId)}/dagRuns/${encodeURIComponent(req.params.runId)}/taskInstances`
    );
    res.json({
      task_instances: (data.task_instances || []).map(ti => ({
        task_id: ti.task_id,
        state: ti.state,
        start_date: ti.start_date,
        end_date: ti.end_date,
        duration: ti.duration,
        try_number: ti.try_number,
        operator: ti.operator,
      })),
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/:connectionId/dags/:dagId/dagRuns/:runId/taskInstances/:taskId/logs/:tryNumber', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const { dagId, runId, taskId, tryNumber } = req.params;
    const baseUrl = (conn.host || '').replace(/\/+$/, '');
    const url = `${baseUrl}/api/v1/dags/${encodeURIComponent(dagId)}/dagRuns/${encodeURIComponent(runId)}/taskInstances/${encodeURIComponent(taskId)}/logs/${tryNumber}`;
    const token = conn.api_token || conn.password || conn.username;
    const headers = { 'Accept': 'text/plain' };
    if (conn.auth_method === 'basic') {
      headers['Authorization'] = `Basic ${Buffer.from(`${conn.airflow_username || conn.username}:${conn.airflow_password || conn.password}`).toString('base64')}`;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return res.status(resp.status).json({ error: 'Failed to fetch logs' });
    const text = await resp.text();
    res.type('text/plain').send(text);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/:connectionId/dags/:dagId/dagRuns', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const data = await airflowFetch(conn,
      `/dags/${encodeURIComponent(req.params.dagId)}/dagRuns`,
      { method: 'POST', body: { conf: req.body.conf || {} } }
    );
    res.json({
      dag_run_id: data.dag_run_id,
      state: data.state,
      execution_date: data.execution_date,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.patch('/:connectionId/dags/:dagId', async (req, res) => {
  try {
    const conn = await getAirflowConnection(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const data = await airflowFetch(conn,
      `/dags/${encodeURIComponent(req.params.dagId)}`,
      { method: 'PATCH', body: { is_paused: req.body.is_paused } }
    );
    res.json({ dag_id: data.dag_id, is_paused: data.is_paused });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
