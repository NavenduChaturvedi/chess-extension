/**
 * Master build script.
 * Orchestrates: Vite (popup) → esbuild (content + SW) → copy vendor → done.
 */
import { execSync } from 'child_process';
import { cpSync, existsSync } from 'fs';

console.log('🔨 Chess Game Review — Build');
console.log('=============================\n');

// Step 1: Build popup with Vite (React + Tailwind)
console.log('📦 [1/4] Building popup (Vite + React)...');
execSync('npx vite build', { stdio: 'inherit' });
console.log('   ✓ Popup built\n');

// Step 2: Build content script with esbuild
console.log('📦 [2/4] Building content script (esbuild)...');
execSync('node build-content.mjs', { stdio: 'inherit' });
console.log('   ✓ Content script built\n');

// Step 3: Build service worker with esbuild
console.log('📦 [3/4] Building service worker (esbuild)...');
execSync('node build-sw.mjs', { stdio: 'inherit' });
console.log('   ✓ Service worker built\n');

// Step 4: Copy vendor files (Stockfish WASM)
console.log('📦 [4/4] Copying vendor files...');
if (existsSync('vendor')) {
  cpSync('vendor', 'dist/vendor', { recursive: true });
  console.log('   ✓ Vendor files copied\n');
} else {
  console.error('   ✗ vendor/ directory not found! Run: cp -r node_modules/stockfish/bin/stockfish-18-lite-single.* vendor/');
  process.exit(1);
}

console.log('=============================');
console.log('✅ Build complete! Load dist/ as an unpacked extension in chrome://extensions');
