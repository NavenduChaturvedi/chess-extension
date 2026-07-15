/**
 * Build the content script using esbuild (bundled from src/content.ts).
 * Outputs a single JS file to dist/content.js (IIFE, no modules).
 */
import { build } from 'esbuild';
import { resolve } from 'path';

await build({
  entryPoints: [resolve('src/content.ts')],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  target: 'chrome100',
  platform: 'browser',
  minify: true,
  sourcemap: false,
  // External: chess.js types are bundled, no node_modules needed
  external: [],
  // Alias @ to src for consistent imports
  alias: {
    '@': resolve('src'),
  },
  // Replace chrome API references (content scripts have chrome global)
  define: {},
  logLevel: 'info',
});

console.log('  → dist/content.js');
