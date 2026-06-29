import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const featuresRoot = resolve(repoRoot, 'v5/src/features');

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

const violations = [];
const chartRuntimeImportPattern = /from\s+['"][^'"]*runtime\/chart-runtime\.js['"]/;
const chartSeriesApiPattern = /\b(createChart|addCandlestickSeries|addLineSeries|setData|update)\b/;

for (const file of listJsFiles(featuresRoot)) {
  const source = readFileSync(file, 'utf8');
  const path = relative(repoRoot, file);

  if (chartRuntimeImportPattern.test(source)) {
    violations.push(`${path}: feature must not import chart runtime internals`);
  }
  if (chartSeriesApiPattern.test(source)) {
    violations.push(`${path}: feature must not call chart series APIs directly`);
  }
}

assert.deepEqual(violations, []);

console.log('v5 chart boundary smoke passed');
