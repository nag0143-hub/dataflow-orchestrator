import express from 'express';
import { initializeDatabase, pool, entityNameToTable, sanitizeFieldName, config, ENTITY_TABLES } from './db.js';
import { testConnection } from './test-connection.js';
import airflowRouter from './airflow-proxy.js';
import { commitFilesToRepo, getUncachableGitHubClient } from './github.js';
import { gitlabCommitFiles, gitlabCheckStatus, getGitLabConfig } from './gitlab.js';

function formatRecord(row, tableName) {
  const record = {
    id: String(row.id),
    ...row.data,
    created_date: row.created_date,
    updated_date: row.updated_date,
    created_by: row.created_by
  };
  if (tableName === 'connection' && record.vault_config) {
    record.vault_config = {
      ...record.vault_config,
      vault_role_id: record.vault_config.vault_role_id ? '••••••••' : '',
      vault_secret_id: record.vault_config.vault_secret_id ? '••••••••' : '',
    };
  }
  if (tableName === 'connection') {
    if (record.password) record.password = '••••••••';
    if (record.connection_string) record.connection_string = '••••••••';
  }
  return record;
}

function buildFilterClause(query, params) {
  if (!query || Object.keys(query).length === 0) return { where: '', params };

  const conditions = [];
  let paramIndex = params.length;

  function processFilter(filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (key === '$or' && Array.isArray(value)) {
        const orConditions = [];
        for (const subFilter of value) {
          const subConditions = [];
          for (const [subKey, subValue] of Object.entries(subFilter)) {
            if (subValue && typeof subValue === 'object' && '$regex' in subValue) {
              paramIndex++;
              subConditions.push(`data->>'${sanitizeFieldName(subKey)}' ILIKE '%' || $${paramIndex} || '%'`);
              params.push(subValue.$regex);
            } else {
              paramIndex++;
              subConditions.push(`data->>'${sanitizeFieldName(subKey)}' = $${paramIndex}`);
              params.push(String(subValue));
            }
          }
          if (subConditions.length > 0) {
            orConditions.push(`(${subConditions.join(' AND ')})`);
          }
        }
        if (orConditions.length > 0) {
          conditions.push(`(${orConditions.join(' OR ')})`);
        }
      } else if (value && typeof value === 'object' && '$regex' in value) {
        paramIndex++;
        conditions.push(`data->>'${sanitizeFieldName(key)}' ILIKE '%' || $${paramIndex} || '%'`);
        params.push(value.$regex);
      } else if (value && typeof value === 'object' && '$in' in value) {
        paramIndex++;
        conditions.push(`data->>'${sanitizeFieldName(key)}' = ANY($${paramIndex})`);
        params.push(value.$in.map(String));
      } else if (value && typeof value === 'object' && '$ne' in value) {
        paramIndex++;
        conditions.push(`(data->>'${sanitizeFieldName(key)}' IS NULL OR data->>'${sanitizeFieldName(key)}' != $${paramIndex})`);
        params.push(String(value.$ne));
      } else if (value && typeof value === 'object' && '$exists' in value) {
        if (value.$exists) {
          conditions.push(`data ? '${sanitizeFieldName(key)}'`);
        } else {
          conditions.push(`NOT (data ? '${sanitizeFieldName(key)}')`);
        }
      } else {
        paramIndex++;
        conditions.push(`data->>'${sanitizeFieldName(key)}' = $${paramIndex}`);
        params.push(String(value));
      }
    }
  }

  processFilter(query);

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

function buildSortClause(sort) {
  if (!sort) return 'ORDER BY created_date DESC';
  const desc = sort.startsWith('-');
  const field = desc ? sort.substring(1) : sort;
  if (field === 'created_date' || field === 'updated_date') {
    return `ORDER BY ${field} ${desc ? 'DESC' : 'ASC'}`;
  }
  return `ORDER BY data->>'${sanitizeFieldName(field)}' ${desc ? 'DESC' : 'ASC'} NULLS LAST`;
}

async function searchEntities(table, searchTerm, filters, limit = 50) {
  const params = [];
  const conditions = [];
  let paramIndex = 0;

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        paramIndex++;
        conditions.push(`data->>'${sanitizeFieldName(key)}' = $${paramIndex}`);
        params.push(String(value));
      }
    }
  }

  if (searchTerm) {
    paramIndex++;
    let ftsExpr;
    if (table === 'activity_log') {
      ftsExpr = `to_tsvector('english', coalesce(data->>'message','') || ' ' || coalesce(data->>'category',''))`;
    } else if (table === 'pipeline') {
      ftsExpr = `to_tsvector('english', coalesce(data->>'name','') || ' ' || coalesce(data->>'description',''))`;
    } else if (table === 'connection') {
      ftsExpr = `to_tsvector('english', coalesce(data->>'name','') || ' ' || coalesce(data->>'description','') || ' ' || coalesce(data->>'platform',''))`;
    } else {
      ftsExpr = `to_tsvector('english', data::text)`;
    }
    conditions.push(`${ftsExpr} @@ plainto_tsquery('english', $${paramIndex})`);
    params.push(searchTerm);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  paramIndex++;
  params.push(parseInt(limit));

  const result = await pool.query(
    `SELECT * FROM "${table}" ${where} ORDER BY created_date DESC LIMIT $${paramIndex}`,
    params
  );

  return result.rows.map(r => formatRecord(r, table));
}

function clampPageSize(value, fallback) {
  const num = parseInt(value) || fallback || config.api.defaultPageSize;
  return Math.min(Math.max(1, num), config.api.maxPageSize);
}

export function createApiMiddleware() {
  const app = express();
  app.use(express.json({ limit: config.api.bodyLimit }));

  if (config.logging.requests) {
    app.use((req, res, next) => {
      if (!req.url.startsWith('/api')) return next();
      const start = Date.now();
      res.on('finish', () => {
        console.log(`[api] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
      });
      next();
    });
  }

  let dbReady = false;
  const startTime = Date.now();
  initializeDatabase().then(() => {
    dbReady = true;
    console.log('[api] Database ready');
  }).catch(err => {
    console.error('[api] Database init failed:', err);
  });

  app.get('/api/health', async (req, res) => {
    try {
      const dbCheck = await pool.query('SELECT 1');
      res.json({
        status: 'ok',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        database: dbCheck ? 'connected' : 'error',
        dbReady,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        database: 'disconnected',
        dbReady,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ ...config.auth.mockUser, is_authenticated: true });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
  });

  app.get('/api/apps/public/prod/public-settings/by-id/:appId', (req, res) => {
    res.json({
      appId: req.params.appId,
      name: 'DataFlow',
      requiresAuth: false,
      status: 'active'
    });
  });

  app.get('/api/entities/:entityName', async (req, res) => {
    try {
      const table = entityNameToTable(req.params.entityName);
      const { sort, limit, skip = '0', cursor } = req.query;
      const pageSize = clampPageSize(limit);

      if (cursor) {
        const cursorId = parseInt(cursor);
        if (isNaN(cursorId)) return res.status(400).json({ error: 'Invalid cursor' });
        const result = await pool.query(
          `SELECT * FROM "${table}" WHERE id < $1 ORDER BY id DESC LIMIT $2`,
          [cursorId, pageSize]
        );
        const items = result.rows.map(r => formatRecord(r, table));
        const lastItem = items[items.length - 1];
        res.json({
          items,
          nextCursor: lastItem ? lastItem.id : null,
          hasMore: items.length === pageSize
        });
      } else {
        const sortClause = buildSortClause(sort);
        const params = [pageSize, parseInt(skip) || 0];
        const result = await pool.query(
          `SELECT * FROM "${table}" ${sortClause} LIMIT $1 OFFSET $2`,
          params
        );
        res.json(result.rows.map(r => formatRecord(r, table)));
      }
    } catch (err) {
      if (err.code === '42P01') return res.json([]);
      console.error('List error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/entities/:entityName/filter', async (req, res) => {
    try {
      const table = entityNameToTable(req.params.entityName);
      const { query: filterQuery, sort, limit, skip = 0 } = req.body;
      const params = [];
      const { where, params: filterParams } = buildFilterClause(filterQuery, params);
      const sortClause = buildSortClause(sort);
      const paramIdx = filterParams.length;
      filterParams.push(clampPageSize(limit), parseInt(skip) || 0);
      const result = await pool.query(
        `SELECT * FROM "${table}" ${where} ${sortClause} LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
        filterParams
      );
      res.json(result.rows.map(r => formatRecord(r, table)));
    } catch (err) {
      if (err.code === '42P01') return res.json([]);
      console.error('Filter error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/entities/:entityName/batch', async (req, res) => {
    try {
      const table = entityNameToTable(req.params.entityName);
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Request body must contain a non-empty items array' });
      }
      if (items.length > 100) {
        return res.status(400).json({ error: 'Batch size limited to 100 items' });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const values = [];
        const placeholders = [];
        let paramIdx = 0;
        for (const item of items) {
          const data = { ...item };
          const createdBy = data.created_by || 'user@local';
          delete data.created_by;
          paramIdx++;
          const dataIdx = paramIdx;
          paramIdx++;
          const byIdx = paramIdx;
          placeholders.push(`($${dataIdx}, $${byIdx})`);
          values.push(JSON.stringify(data), createdBy);
        }
        const result = await client.query(
          `INSERT INTO "${table}" (data, created_by) VALUES ${placeholders.join(', ')} RETURNING *`,
          values
        );
        await client.query('COMMIT');
        res.status(201).json(result.rows.map(r => formatRecord(r, table)));
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Batch create error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/entities/:entityName/:id', async (req, res) => {
    try {
      const table = entityNameToTable(req.params.entityName);
      const result = await pool.query(
        `SELECT * FROM "${table}" WHERE id = $1`,
        [parseInt(req.params.id)]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(formatRecord(result.rows[0], table));
    } catch (err) {
      console.error('Get error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/entities/:entityName', async (req, res) => {
    try {
      const table = entityNameToTable(req.params.entityName);
      const data = { ...req.body };
      const createdBy = data.created_by || 'user@local';
      delete data.created_by;
      const result = await pool.query(
        `INSERT INTO "${table}" (data, created_by) VALUES ($1, $2) RETURNING *`,
        [JSON.stringify(data), createdBy]
      );
      res.status(201).json(formatRecord(result.rows[0], table));
    } catch (err) {
      console.error('Create error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/entities/:entityName/:id', async (req, res) => {
    try {
      const table = entityNameToTable(req.params.entityName);
      const data = { ...req.body };
      delete data.id;
      delete data.created_date;
      delete data.updated_date;
      delete data.created_by;

      if (table === 'connection') {
        const REDACTED = '••••••••';
        if (data.password === REDACTED) delete data.password;
        if (data.connection_string === REDACTED) delete data.connection_string;
        if (data.vault_config) {
          if (data.vault_config.vault_role_id === REDACTED) delete data.vault_config.vault_role_id;
          if (data.vault_config.vault_secret_id === REDACTED) delete data.vault_config.vault_secret_id;
        }
      }

      const result = await pool.query(
        `UPDATE "${table}" SET data = data || $1, updated_date = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(data), parseInt(req.params.id)]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(formatRecord(result.rows[0], table));
    } catch (err) {
      console.error('Update error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/entities/:entityName/:id', async (req, res) => {
    try {
      const table = entityNameToTable(req.params.entityName);
      await pool.query(`DELETE FROM "${table}" WHERE id = $1`, [parseInt(req.params.id)]);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.use('/api/airflow', airflowRouter);

  app.post('/api/test-connection', async (req, res) => {
    try {
      const result = await testConnection(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error_code: 'INTERNAL_ERROR',
        error_message: err.message,
        latency_ms: 0,
      });
    }
  });

  app.post('/api/test-vault', async (req, res) => {
    try {
      const { fetchVaultCredentials } = await import('./vault.js');
      const result = await fetchVaultCredentials(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/validate-spec', async (req, res) => {
    try {
      const { validateSpecWithDB } = await import('./spec-validator.js');
      const spec = req.body.spec || req.body;
      const results = await validateSpecWithDB(spec, pool, entityNameToTable);
      res.json({ ...results, checked_at: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ valid: false, errors: [{ path: "", message: err.message, severity: "error" }], warnings: [], checked_at: new Date().toISOString() });
    }
  });

  app.post('/api/introspect-schema', async (req, res) => {
    try {
      const { connectionId } = req.body;
      const parsedId = parseInt(connectionId);
      if (!connectionId || isNaN(parsedId)) {
        return res.status(400).json({ success: false, error: 'A valid numeric connectionId is required' });
      }
      const table = entityNameToTable('Connection');
      const result = await pool.query('SELECT data FROM "' + table + '" WHERE id = $1', [parsedId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Connection not found' });
      }
      const connData = result.rows[0].data;
      const { introspectSchema } = await import('./introspect-schema.js');
      const schemas = await introspectSchema(connData);
      res.json(schemas);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/functions/:functionName', async (req, res) => {
    const { functionName } = req.params;
    try {
      switch (functionName) {
        case 'searchPipelines': {
          const { searchTerm, filters, limit } = req.body;
          const items = await searchEntities('pipeline', searchTerm, filters, limit);
          res.json(items);
          break;
        }
        case 'searchConnections': {
          const { searchTerm, filters, limit } = req.body;
          const items = await searchEntities('connection', searchTerm, filters, limit);
          res.json(items);
          break;
        }
        case 'searchActivityLogs': {
          const { searchTerm, filters, limit } = req.body;
          const items = await searchEntities('activity_log', searchTerm, filters, limit);
          res.json({ items, nextCursor: null, hasMore: false });
          break;
        }
        case 'fetchVaultCredentials': {
          const { fetchVaultCredentials: fetchVault } = await import('./vault.js');
          const vaultResult = await fetchVault(req.body);
          res.json(vaultResult);
          break;
        }
        case 'generateLineage':
          res.json({ error: 'Lineage feature has been removed' });
          break;
        case 'syncAirflowDagsAsync':
          res.json({ status: 'sync_not_available', message: 'Airflow sync not configured in local environment' });
          break;
        case 'triggerDependentPipelines':
          res.json({ triggered: [] });
          break;
        default:
          res.status(404).json({ error: `Function '${functionName}' not found` });
      }
    } catch (err) {
      console.error(`Function ${functionName} error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  const ALLOWED_GITHUB_OWNER = process.env.GITHUB_OWNER || 'nag0143-hub';
  const ALLOWED_GITHUB_REPO = process.env.GITHUB_REPO || 'dataflow-platform';
  const ALLOWED_PATH_PREFIX = 'specs/';

  const ALLOWED_GITHUB_REPOS = new Set(
    (process.env.GITHUB_ALLOWED_REPOS || `${ALLOWED_GITHUB_OWNER}/${ALLOWED_GITHUB_REPO}`)
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );

  app.post('/api/github/commit', async (req, res) => {
    try {
      const { branch, files, commitMessage, owner, repo } = req.body;
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Missing required field: files' });
      }
      for (const f of files) {
        if (!f.path || !f.path.startsWith(ALLOWED_PATH_PREFIX)) {
          return res.status(400).json({ error: `File path must start with "${ALLOWED_PATH_PREFIX}": ${f.path}` });
        }
        if (f.path.includes('..')) {
          return res.status(400).json({ error: 'Path traversal not allowed' });
        }
      }
      const safeOwner = (owner || ALLOWED_GITHUB_OWNER).replace(/[^a-zA-Z0-9_\-]/g, '') || ALLOWED_GITHUB_OWNER;
      const safeRepo = (repo || ALLOWED_GITHUB_REPO).replace(/[^a-zA-Z0-9_\-.]/g, '') || ALLOWED_GITHUB_REPO;
      const repoKey = `${safeOwner}/${safeRepo}`.toLowerCase();
      if (!ALLOWED_GITHUB_REPOS.has(repoKey)) {
        return res.status(403).json({
          success: false,
          error: `Repository "${safeOwner}/${safeRepo}" is not in the allowed list. Allowed: ${[...ALLOWED_GITHUB_REPOS].join(', ')}`,
        });
      }
      const safeBranch = (branch || 'main').replace(/[^a-zA-Z0-9_\-/.]/g, '_');
      const result = await commitFilesToRepo({
        owner: safeOwner,
        repo: safeRepo,
        branch: safeBranch,
        files,
        commitMessage: (commitMessage || 'DataFlow pipeline deployment').substring(0, 500),
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('GitHub commit error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/github/status', async (req, res) => {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: user } = await octokit.users.getAuthenticated();
      res.json({
        connected: true,
        login: user.login,
        name: user.name,
        defaultOwner: ALLOWED_GITHUB_OWNER,
        defaultRepo: ALLOWED_GITHUB_REPO,
      });
    } catch (err) {
      res.json({ connected: false, error: err.message });
    }
  });

  app.get('/api/gitlab/config', (req, res) => {
    res.json(getGitLabConfig());
  });

  app.post('/api/gitlab/status', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ connected: false, error: 'Username and password required' });
      }
      const status = await gitlabCheckStatus({ username, password });
      res.json(status);
    } catch (err) {
      res.json({ connected: false, error: err.message });
    }
  });

  app.post('/api/gitlab/commit', async (req, res) => {
    try {
      const { username, password, branch, files, commitMessage } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'LDAP credentials required' });
      }
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing required field: files' });
      }
      for (const f of files) {
        if (!f.path || !f.path.startsWith(ALLOWED_PATH_PREFIX)) {
          return res.status(400).json({ success: false, error: `File path must start with "${ALLOWED_PATH_PREFIX}": ${f.path}` });
        }
        if (f.path.includes('..')) {
          return res.status(400).json({ success: false, error: 'Path traversal not allowed' });
        }
      }
      const safeBranch = (branch || 'main').replace(/[^a-zA-Z0-9_\-/.]/g, '_');
      const result = await gitlabCommitFiles({
        username,
        password,
        branch: safeBranch,
        files,
        commitMessage: (commitMessage || 'DataFlow pipeline deployment').substring(0, 500),
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('GitLab commit error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/purge-logs', async (req, res) => {
    try {
      const days = parseInt(req.body?.days) || 30;
      const result = await pool.query(
        `DELETE FROM "activity_log" WHERE created_date < NOW() - INTERVAL '1 day' * $1`,
        [days]
      );
      res.json({ deleted: result.rowCount });
    } catch (err) {
      console.error('Purge logs error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/data-model', async (req, res) => {
    try {
      const tableNames = ENTITY_TABLES.map(t => `'${t}'`).join(',');
      const columnsResult = await pool.query(
        `SELECT table_name, column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name IN (${tableNames})
         ORDER BY table_name, ordinal_position`
      );
      const indexesResult = await pool.query(
        `SELECT tablename, indexname, indexdef
         FROM pg_indexes
         WHERE tablename IN (${tableNames})
         ORDER BY tablename, indexname`
      );
      const tablesMap = {};
      for (const row of columnsResult.rows) {
        if (!tablesMap[row.table_name]) {
          tablesMap[row.table_name] = { name: row.table_name, columns: [] };
        }
        tablesMap[row.table_name].columns.push({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable
        });
      }
      res.json({
        tables: Object.values(tablesMap),
        indexes: indexesResult.rows.map(r => ({
          tablename: r.tablename,
          indexname: r.indexname,
          indexdef: r.indexdef
        }))
      });
    } catch (err) {
      console.error('Data model error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  return (req, res, next) => {
    if (!req.url.startsWith('/api')) {
      return next();
    }
    app(req, res, next);
  };
}
