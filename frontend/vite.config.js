import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = 'http://127.0.0.1:8080';

const configureBackendProxy = (proxy) => {
  proxy.on('error', (_err, _req, res) => {
    if (res && !res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 503,
          error: 'Backend Unavailable',
          message: 'Backend server on http://localhost:8080 is not running. Start it with: java -jar backend/target/vognix-backend-1.0.0.jar',
        })
      );
    }
  });
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        configure: configureBackendProxy,
      },
      '/swagger-ui': {
        target: backendTarget,
        changeOrigin: true,
        configure: configureBackendProxy,
      },
      '/swagger-ui.html': {
        target: backendTarget,
        changeOrigin: true,
        configure: configureBackendProxy,
      },
      '/api-docs': {
        target: backendTarget,
        changeOrigin: true,
        configure: configureBackendProxy,
      },
      '/v3': {
        target: backendTarget,
        changeOrigin: true,
        configure: configureBackendProxy,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
});
