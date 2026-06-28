import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const checkedRoot = 'v4/src';
const allowedFiles = new Set([
  'v4/src/chart/chart-manager.js',
  'v4/src/chart/viewport-controller.js',
  'v4/src/runtime/primary-chart-runtime.js',
]);

function listJsFiles(root) {
  const absoluteRoot = resolve(repoRoot, root);
  const files = [];
  for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
    const absolutePath = resolve(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(relative(repoRoot, absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(relative(repoRoot, absolutePath));
    }
  }
  return files;
}

const violations = [];
for (const file of listJsFiles(checkedRoot)) {
  const normalized = relative(repoRoot, resolve(file));
  if (allowedFiles.has(normalized)) continue;
  const source = readFileSync(resolve(file), 'utf8');
  const match = source.match(/\bchart\.(setData|updateBar|showStartOfData|showEndOfData)\s*\(/);
  if (match) {
    violations.push(`${normalized}: mutates primary chart series through chart.${match[1]}()`);
  }
}

assert.deepEqual(violations, []);

console.log('primary chart runtime boundary smoke passed');
