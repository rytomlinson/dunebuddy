import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Read the repo-root .env so the proxy follows DATA_SERVICE_PORT.
  const env = loadEnv(mode, '..', '');
  const apiPort = env.DATA_SERVICE_PORT || '3003';

  return {
    plugins: [react()],
    server: {
      port: 3002,
      strictPort: true,
      proxy: {
        '/trpc': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
