export default {
  env: 'development',

  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    host: '0.0.0.0',
  },

  database: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    poolMin: 2,
    poolMax: 10,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 5000,
  },

  auth: {
    enabled: false,
    mockUser: {
      id: '1',
      email: process.env.AUTH_USER_EMAIL || 'user@local',
      name: process.env.AUTH_USER_NAME || 'Local User',
      role: process.env.AUTH_USER_ROLE || 'admin',
    },
  },

  cors: {
    origin: '*',
    credentials: true,
  },

  api: {
    bodyLimit: '10mb',
    defaultPageSize: 100,
    maxPageSize: 1000,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    requests: true,
  },
};
