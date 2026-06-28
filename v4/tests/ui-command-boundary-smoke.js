import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const checkedRoot = 'v4/src/ui';

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
  const source = readFileSync(resolve(file), 'utf8');
  if (/primary-bars-runtime\.js/.test(source) || /\bloadPrimaryBars\s*\(/.test(source)) {
    violations.push(`${normalized}: bypasses runtime commands for primary bar loading`);
  }
}

assert.deepEqual(violations, []);

console.log('ui command boundary smoke passed');
