import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve('.');
const v5Root = resolve(repoRoot, 'v5/src');
const featuresRoot = resolve(v5Root, 'features');

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
const forbiddenPatterns = [
  /from\s+['"][^'"]*runtime\/bar-data-runtime\.js['"]/,
  /from\s+['"][^'"]*data\/bars\/bars-api-client\.js['"]/,
  /from\s+['"][^'"]*data\/bars\/bars-request\.js['"]/,
  /from\s+['"][^'"]*api\.js['"]/,
  /\/v4\/bars/,
  /\bfetch\s*\(/,
];

for (const file of listJsFiles(featuresRoot)) {
  const source = readFileSync(file, 'utf8');
  const path = relative(repoRoot, file);

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      violations.push(`${path}: feature must not request bars or import bar data internals`);
    }
  }
}

assert.deepEqual(violations, []);

console.log('v5 bar data boundary smoke passed');
