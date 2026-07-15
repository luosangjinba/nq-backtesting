import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectExhaustiveGateScripts } from './exhaustive-test-runner-domain.js';
import { loadTestCatalog } from './test-catalog-loader.js';

const source = await readFile('v6/tests/exhaustive-test-runner.js', 'utf8');
const catalog = await loadTestCatalog();

assert.match(source, /readOption\('--environment', 'node'\)/);
assert.match(source, /process\.argv\.includes\('--list'\)/);
assert.match(source, /runTestScript\(entry\)/);
assert.match(source, /if \(result\.code !== 0\) break/);
assert.match(source, /process\.exit\(failed\.code \|\| 1\)/);

for (const environment of ['node', 'node-service', 'browser-local', 'browser-service']) {
  const entries = selectExhaustiveGateScripts(catalog, { environment });
  assert.equal(entries.length > 0, true, environment);
  assert.equal(entries.every((entry) => entry.environment === environment), true);
}

const all = selectExhaustiveGateScripts(catalog, { environment: 'all' });
assert.equal(
  all.length,
  ['node', 'node-service', 'browser-local', 'browser-service']
    .map((environment) => selectExhaustiveGateScripts(catalog, { environment }).length)
    .reduce((sum, count) => sum + count, 0),
);

console.log('v6 exhaustive test runner static smoke passed');
