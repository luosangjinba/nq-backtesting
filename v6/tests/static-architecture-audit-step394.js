import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';

const auditOnly = process.argv.includes('--audit');
const tests = (await readdir('v6/tests'))
  .filter((name) => name.endsWith('static-smoke.js'))
  .sort()
  .map((name) => `v6/tests/${name}`);

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
}, null, 2));

if (failures.length && !auditOnly) process.exitCode = 1;
