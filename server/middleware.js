import express from 'express';
import { initializeDatabase, pool, entityNameToTable, sanitizeFieldName, config } from './db.js';

function formatRecord(row) {
  return {
    id: String(row.id),
    ...row.data,
    created_date: row.created_date,
    updated_date: row.updated_date,
    created_by: row.created_by
  };
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
              subConditions.push(`data->>'${sanitizeFieldName(subKey)}' ~* $${paramIndex}`);
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
        conditions.push(`data->>'${sanitizeFieldName(key)}' ~* $${paramIndex}`);
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
    conditions.push(`data::text ~* $${paramIndex}`);
    params.push(searchTerm);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  paramIndex++;
  params.push(parseInt(limit));

  const result = await pool.query(
    `SELECT * FROM "${table}" ${where} ORDER BY created_date DESC LIMIT $${paramIndex}`,
    params
  );

  return result.rows.map(formatRecord);
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
  initializeDatabase().then(() => {
    dbReady = true;
    console.log('[api] Database ready');
  }).catch(err => {
    console.error('[api] Database init failed:', err);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbReady });
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
      const { sort, limit, skip = '0' } = req.query;
      const sortClause = buildSortClause(sort);
      const params = [clampPageSize(limit), parseInt(skip) || 0];
      const result = await pool.query(
        `SELECT * FROM "${table}" ${sortClause} LIMIT $1 OFFSET $2`,
        params
      );
      res.json(result.rows.map(formatRecord));
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
      res.json(result.rows.map(formatRecord));
    } catch (err) {
      if (err.code === '42P01') return res.json([]);
      console.error('Filter error:', err.message);
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
      res.json(formatRecord(result.rows[0]));
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
      res.status(201).json(formatRecord(result.rows[0]));
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
      const result = await pool.query(
        `UPDATE "${table}" SET data = data || $1, updated_date = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(data), parseInt(req.params.id)]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(formatRecord(result.rows[0]));
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
        case 'fetchVaultCredentials':
          res.json({ error: 'Vault not configured in local environment' });
          break;
        case 'generateLineage':
          res.json({ jobId: req.body?.jobId, lineage: [] });
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

  return (req, res, next) => {
    if (!req.url.startsWith('/api')) {
      return next();
    }
    app(req, res, next);
  };
}
