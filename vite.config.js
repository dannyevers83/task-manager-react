import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Keep the last working deployment instead of publishing an unconnected app.
  if (env.NETLIFY === 'true' && !env.VITE_API_URL?.trim()) {
    throw new Error(
      'Set VITE_API_URL in Netlify to the deployed Express API URL.',
    );
  }

  return {
    plugins: [react()],
    server: { proxy: { '/tasks': 'http://localhost:3000' } },
    test: { environment: 'jsdom' },
  };
});
