import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: config.database.idleTimeoutMs,
  connectionTimeoutMillis: config.database.connectionTimeoutMs,
});

const ENTITY_TABLES = [
  'pipeline',
  'connection',
  'pipeline_run',
  'activity_log',
  'audit_log',
  'ingestion_job',
  'airflow_dag',
  'custom_function',
  'connection_profile',
  'connection_prerequisite',
  'pipeline_version',
  'data_catalog_entry'
];

function entityNameToTable(entityName) {
  const table = entityName
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();

  if (!ENTITY_TABLES.includes(table)) {
    throw new Error(`Unknown entity: ${entityName}`);
  }
  return table;
}

function sanitizeFieldName(field) {
  const sanitized = field.replace(/[^a-zA-Z0-9_]/g, '');
  if (!sanitized) throw new Error(`Invalid field name: ${field}`);
  return sanitized;
}

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    for (const table of ENTITY_TABLES) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${table}" (
          id SERIAL PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}',
          created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by TEXT DEFAULT 'system'
        )
      `);
    }
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

export { pool, initializeDatabase, entityNameToTable, sanitizeFieldName, ENTITY_TABLES };
export { default as config } from '../config/index.js';
