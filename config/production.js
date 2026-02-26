export default {
  env: 'production',

  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    host: '0.0.0.0',
  },

  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    poolMin: 5,
    poolMax: 20,
    idleTimeoutMs: 10000,
    connectionTimeoutMs: 5000,
  },

  auth: {
    enabled: false,
    mockUser: {
      id: '1',
      email: process.env.AUTH_USER_EMAIL || 'admin@dataflow.app',
      name: process.env.AUTH_USER_NAME || 'Admin',
      role: process.env.AUTH_USER_ROLE || 'admin',
    },
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  api: {
    bodyLimit: '10mb',
    defaultPageSize: 100,
    maxPageSize: 1000,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'warn',
    requests: process.env.LOG_REQUESTS === 'true',
  },
};
