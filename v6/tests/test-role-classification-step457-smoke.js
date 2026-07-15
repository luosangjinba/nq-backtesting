import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyTestFile } from './test-catalog-domain.js';
import {
  EXPLICIT_SUPPORT_FILES,
  EXPLICIT_SUPPORT_PREFIXES,
} from './test-role-manifest.js';

for (const path of EXPLICIT_SUPPORT_FILES) {
  const source = await readFile(path, 'utf8');
  assert.equal(classifyTestFile({ path, source }).role, 'support', path);
}

for (const prefix of EXPLICIT_SUPPORT_PREFIXES) {
  const path = `${prefix}classification-probe.js`;
  assert.equal(classifyTestFile({ path, source: '' }).role, 'support', path);
}

assert.equal(classifyTestFile({
  path: 'v6/tests/ordinary-smoke.js',
  source: '',
}).role, 'gate');

console.log('v6 explicit support classification Step 457 smoke passed');
