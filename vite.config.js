import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer: async (server) => {
        const { createApiMiddleware } = await import('./server/middleware.js');
        server.middlewares.use(createApiMiddleware());
      }
    }
  ],
  resolve: {
    alias: {
      '@/': '/src/',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    strictPort: true,
  },
});
