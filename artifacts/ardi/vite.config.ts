import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const DEFAULT_PORT = 5173;
const DEFAULT_BASE_PATH = '/';
const DEFAULT_API_PROXY_TARGET = 'http://localhost:8080';

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : DEFAULT_PORT;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || DEFAULT_BASE_PATH;

// The frontend calls the API with relative `/api/*` paths (Orval is configured
// with baseUrl "/api"), so the dev server has to forward them to the API server.
const apiProxyTarget =
  process.env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET;

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/.pnpm/react@') || id.includes('/node_modules/.pnpm/react-dom@')) return 'vendor-react';
          if (id.includes('/node_modules/.pnpm/@radix-ui+')) return 'vendor-radix';
          if (id.includes('/node_modules/.pnpm/@tanstack+')) return 'vendor-query';
          if (id.includes('/node_modules/.pnpm/recharts@')) return 'vendor-charts';
          return undefined;
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
