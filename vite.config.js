import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { baseHeaders, contentSecurityPolicy, previewHeaders } from './security-headers.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The studio API (backend/, PORT in backend/.env). /api is forwarded to it, so the site and the API
  // share one origin: the refresh and CSRF cookies stay first-party and no CORS is needed.
  const target = env.API_PROXY || 'http://localhost:8009';
  const proxy = { '/api': { target, changeOrigin: false, xfwd: true } };
  // An API on another origin (VITE_API_URL) must be allowed to be called.
  const apiOrigin = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : '';

  // The built index.html carries the Content Security Policy itself, so it holds on any host.
  const cspMeta = {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy({ apiOrigin, framing: false }) }, injectTo: 'head-prepend' },
    ],
  };

  return {
    plugins: [react(), cspMeta],
    // No CSP in development: Vite's hot reload runs inline scripts and a websocket.
    server: { proxy, headers: baseHeaders },
    preview: { proxy, headers: previewHeaders({ apiOrigin }) },
  };
});
