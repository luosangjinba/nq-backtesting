import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const srcRoot = resolve(repoRoot, 'v5/src');
const allowedEngineApiFiles = new Set([
  'v5/src/runtime/chart-engine-adapter.js',
]);

function listJsFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolutePath = resolve(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(absolutePath);
    }
  }
  return files;
}

const engineApiPattern = /\b(LightweightCharts|createChart|addCandlestickSeries|addSeries|CandlestickSeries|setData|timeScale)\b/;
const violations = [];

for (const file of listJsFiles(srcRoot)) {
  const source = readFileSync(file, 'utf8');
  const path = relative(repoRoot, file);
  if (!allowedEngineApiFiles.has(path) && engineApiPattern.test(source)) {
    violations.push(`${path}: chart engine APIs must stay behind chart-engine-adapter`);
  }
}

assert.deepEqual(violations, []);

console.log('v5 chart engine boundary smoke passed');
