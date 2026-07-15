/**
 * Build the background service worker using esbuild.
 * Outputs a single JS file to dist/service-worker.js (ESM).
 */
import { build } from 'esbuild';
import { resolve } from 'path';

await build({
  entryPoints: [resolve('src/service-worker.ts')],
  bundle: true,
  outfile: 'dist/service-worker.js',
  format: 'esm',
  target: 'chrome100',
  platform: 'browser',
  minify: true,
  sourcemap: false,
  alias: {
    '@': resolve('src'),
  },
  logLevel: 'info',
});

console.log('  → dist/service-worker.js');
