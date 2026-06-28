import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const checkedRoot = 'v4/src';
const allowedFiles = new Set([
  'v4/src/data/bar-store.js',
  'v4/src/runtime/primary-bars-runtime.js',
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
  if (/\bstore\.setBars\s*\(/.test(source)) {
    violations.push(`${normalized}: writes primary bars directly`);
  }
}

assert.deepEqual(violations, []);

console.log('primary bars runtime boundary smoke passed');
