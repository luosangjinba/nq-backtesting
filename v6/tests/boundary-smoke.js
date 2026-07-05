import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const V6_ROOT = path.resolve('v6');
const SOURCE_ROOTS = [
  path.join(V6_ROOT, 'src'),
];
const TEST_ROOTS = [
  path.join(V6_ROOT, 'tests'),
];

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
    } else if (entry.isFile() && /\.(js|html|css)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

const forbiddenV5RuntimeImports = [
  {
    pattern: /from\s+['"]\.\.\/\.\.\/v5\/src\/runtime\//,
    reason: 'V6 must not import V5 runtime implementation modules.',
  },
  {
    pattern: /from\s+['"][^'"]*v5\/src\/runtime\//,
    reason: 'V6 must not import V5 runtime implementation modules.',
  },
];

const forbiddenSourcePatterns = [
  ...forbiddenV5RuntimeImports,
  {
    pattern: /primaryState|secondaryState|nonPrimary|non-primary/,
    reason: 'V6 Step 1 must not introduce primary/non-primary state mechanisms.',
  },
];

const violations = [];
for (const root of SOURCE_ROOTS) {
  for (const file of await walkFiles(root)) {
    const text = await readFile(file, 'utf8');
    forbiddenSourcePatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(text)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          pattern: String(pattern),
          reason,
        });
      }
    });
  }
}

for (const root of TEST_ROOTS) {
  for (const file of await walkFiles(root)) {
    const text = await readFile(file, 'utf8');
    forbiddenV5RuntimeImports.forEach(({ pattern, reason }) => {
      if (pattern.test(text)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          pattern: String(pattern),
          reason,
        });
      }
    });
  }
}

assert.deepEqual(violations, []);

console.log('v6 boundary smoke passed');
