import { selectExhaustiveGateScripts } from './exhaustive-test-runner-domain.js';
import { loadTestCatalog } from './test-catalog-loader.js';
import { runTestScript } from './test-process-runner.js';

function readOption(name, fallback) {
  const prefix = `${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

const environment = readOption('--environment', 'node');
const catalog = await loadTestCatalog();
const entries = selectExhaustiveGateScripts(catalog, { environment });

if (process.argv.includes('--list')) {
  const report = JSON.stringify({
    coverage: 'exhaustive-catalog-gates',
    entries,
    environment,
  }, null, 2);
  await new Promise((resolve) => process.stdout.write(`${report}\n`, resolve));
  process.exit(0);
}

const results = [];
for (const entry of entries) {
  console.log(`[exhaustive-test-runner] start ${entry.environment} ${entry.script}`);
  const result = await runTestScript(entry);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[exhaustive-test-runner] ${status} ${entry.script} ${result.durationMs}ms`);
  if (result.code !== 0) break;
}

const failed = results.find((result) => result.code !== 0);
const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
if (failed) {
  console.error('[exhaustive-test-runner] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

console.log(`[exhaustive-test-runner] passed ${results.length}/${entries.length} in ${totalMs}ms`);
