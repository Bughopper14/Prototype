import path from 'node:path';
import type {AddressInfo} from 'node:net';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Prints where to open the app and which backend the proxy uses when `pnpm dev` starts, then reports once the
 * backend answers (it usually finishes compiling a few seconds after Vite).
 */
function devBanner(api: string): Plugin {
  return {
    name: 'liugong-dev-banner',
    apply: 'serve',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const {port} = server.httpServer!.address() as AddressInfo;
        const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
        const line = '─'.repeat(64);
        console.log(
          [
            '',
            line,
            `  ${bold('LiuGong LOS · development')}`,
            `  Frontend (open this) : ${bold(`http://localhost:${port}`)}`,
            `  Backend API          : ${api}  (proxied from /api and /documents)`,
            line,
            '',
          ].join('\n'),
        );

        const startedAt = Date.now();
        const check = async () => {
          try {
            const res = await fetch(`${api}/api/v1/health`, {signal: AbortSignal.timeout(1500)});
            if (res.ok) return console.log(`  \x1b[32m✓\x1b[0m Backend API is up at ${api}\n`);
          } catch {
            /* not up yet */
          }
          if (Date.now() - startedAt > 60_000) {
            return console.log(`  \x1b[31m✗\x1b[0m Backend API is not reachable at ${api}. Is it running?\n`);
          }
          setTimeout(check, 1500);
        };
        check();
      });
    },
  };
}

export default defineConfig(({mode}) => {
  // Only VITE_* variables reach the browser bundle; API_URL is used here (dev server proxy) and never shipped.
  const env = loadEnv(mode, process.cwd(), '');
  const api = env.API_URL || 'http://localhost:3001';

  return {
    plugins: [react(), devBanner(api)],
    resolve: {alias: {'@': path.resolve(__dirname, 'src')}},
    server: {
      port: Number(env.PORT || 3000),
      // Fail instead of silently moving to 3001, which is the API port.
      strictPort: true,
      // The browser only talks to this origin; /api and /documents are forwarded to the NestJS backend.
      // changeOrigin stays false so the backend's same-origin check sees the browser's Host.
      proxy: {
        '/api': {target: api, changeOrigin: false},
        '/documents': {target: api, changeOrigin: false},
      },
    },
    preview: {
      port: Number(env.PORT || 3000),
      proxy: {
        '/api': {target: api, changeOrigin: false},
        '/documents': {target: api, changeOrigin: false},
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          // Long-lived cacheable vendor chunks, separate from app code that changes often.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            tinymce: ['@tinymce/tinymce-react'],
          },
        },
      },
    },
  };
});
