import { CANONICAL_TEST_MANIFEST } from './canonical-test-manifest.js';
import { selectCanonicalGateScripts } from './canonical-test-runner-domain.js';
import { runTestScript } from './test-process-runner.js';

function readOption(name, fallback) {
  const prefix = `${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

const environment = readOption('--environment', 'all');
const entries = selectCanonicalGateScripts(CANONICAL_TEST_MANIFEST, { environment });

if (process.argv.includes('--list')) {
  console.log(JSON.stringify({ coverage: CANONICAL_TEST_MANIFEST.coverage, entries }, null, 2));
  process.exit(0);
}

const results = [];
for (const entry of entries) {
  console.log(`[canonical-test-runner] start ${entry.suiteId} ${entry.script}`);
  const result = await runTestScript(entry);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[canonical-test-runner] ${status} ${entry.script} ${result.durationMs}ms`);
  if (result.code !== 0) break;
}

const failed = results.find((result) => result.code !== 0);
const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
if (failed) {
  console.error('[canonical-test-runner] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

console.log(`[canonical-test-runner] passed ${results.length}/${entries.length} in ${totalMs}ms`);
