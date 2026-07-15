import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { classifyTestFile } from './test-catalog-domain.js';

const auditOnly = process.argv.includes('--audit');
const candidates = (await readdir('v6/tests'))
  .filter((name) => name.endsWith('static-smoke.js'))
  .sort()
  .map((name) => `v6/tests/${name}`);
const tests = [];
const excludedByRole = {};
for (const test of candidates) {
  const source = await readFile(test, 'utf8');
  const entry = classifyTestFile({ path: test, source });
  if (entry.role === 'gate') tests.push(test);
  else excludedByRole[entry.role] = (excludedByRole[entry.role] || 0) + 1;
}

const failures = [];
for (const test of tests) {
  const result = spawnSync(process.execPath, [test], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(test);
}

console.log(JSON.stringify({
  total: tests.length,
  passed: tests.length - failures.length,
  failed: failures.length,
  failures,
  excludedByRole,
}, null, 2));

if (failures.length && !auditOnly) process.exitCode = 1;
