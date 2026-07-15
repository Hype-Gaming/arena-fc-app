// web/test/config.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

['react', 'react-dom', 'react-router-dom'].forEach((d) =>
  assert.ok(pkg.dependencies[d], 'missing dependency ' + d));
['vite', '@vitejs/plugin-react', 'vite-plugin-pwa', 'vitest', '@testing-library/react',
 '@testing-library/jest-dom', 'jsdom', 'typescript'].forEach((d) =>
  assert.ok(pkg.devDependencies[d], 'missing devDependency ' + d));
assert.ok(/vitest/.test(pkg.scripts.test || ''), 'test script must run vitest');

const viteConfig = fs.readFileSync(path.join(dir, 'vite.config.ts'), 'utf8');
assert.ok(/vite-plugin-pwa/.test(viteConfig), 'vite.config must use vite-plugin-pwa');
assert.ok(/jsdom/.test(viteConfig), 'vite.config must set jsdom test environment');

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'public', 'manifest.webmanifest'), 'utf8'));
assert.strictEqual(manifest.display, 'standalone', 'PWA must be installable (standalone)');
assert.strictEqual(manifest.background_color, '#0a0e1a', 'navy/black background');
assert.strictEqual(manifest.theme_color, '#0a0e1a', 'navy/black theme');
assert.strictEqual(manifest.icons.length >= 2, true, 'needs 192 and 512 icons');

console.log('web config OK');
