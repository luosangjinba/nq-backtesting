import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const allowedFetchBarsFiles = new Set([
  'v4/src/api.js',
  'v4/src/data/bars/bars-api-client.js',
]);
const checkedRoots = [
  'v4/src/ui',
  'v4/src/pda',
  'v4/src/order',
  'v4/src/segment',
];

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
for (const root of checkedRoots) {
  for (const file of listJsFiles(root)) {
    const normalized = relative(repoRoot, resolve(file));
    if (allowedFetchBarsFiles.has(normalized)) continue;
    const source = readFileSync(resolve(file), 'utf8');
    if (source.includes("from '../api.js'") || source.includes("from '../../api.js'")) {
      violations.push(`${normalized}: imports api.js directly`);
    }
    if (/\bfetchBars\s*\(/.test(source) || /\bfetchBars\b/.test(source)) {
      violations.push(`${normalized}: references fetchBars directly`);
    }
  }
}

assert.deepEqual(violations, []);

console.log('bars api boundary smoke passed');
