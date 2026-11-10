import {defineConfig} from 'tsup';

export default defineConfig(options => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // Watch mode (pnpm dev) must not wipe dist/: the backend and Vite read it while it rebuilds.
  clean: !options.watch,
  sourcemap: true,
  target: 'es2022',
}));
