import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const v5Root = resolve(repoRoot, 'v5/src');

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

const featureFiles = listJsFiles(resolve(v5Root, 'features'));
const violations = [];
const forbiddenRuntimeImportPattern = /from\s+['"][^'"]*runtime\/(?!commands\.js|events\.js)[^'"]+['"]/;

for (const file of featureFiles) {
  const source = readFileSync(file, 'utf8');
  const path = relative(repoRoot, file);
  if (forbiddenRuntimeImportPattern.test(source)) {
    violations.push(`${path}: feature must import runtime contracts, not runtime implementations`);
  }
  [
    'chart-runtime',
    'bar-data-runtime',
    'bars-api',
    'bars-client',
    'replay-runtime',
    'session-repository',
    'session-storage',
  ].forEach((forbidden) => {
    if (source.includes(forbidden)) {
      violations.push(`${path}: feature must not import or name ${forbidden}`);
    }
  });
}

const runtimeRouter = readFileSync(resolve(v5Root, 'runtime/router.js'), 'utf8');
assert.equal(
  runtimeRouter.includes('../features/'),
  false,
  'runtime/router.js must not import feature modules'
);

assert.deepEqual(violations, []);

console.log('v5 boundary smoke passed');
