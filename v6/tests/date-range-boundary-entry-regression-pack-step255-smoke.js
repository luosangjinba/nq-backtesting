import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TESTS = Object.freeze([
  'v6/tests/date-range-entry-viewport-alignment-browser-step247-smoke.js',
  'v6/tests/real-date-boundary-metadata-browser-step190-smoke.js',
  'v6/tests/chart-entry-initial-visibility-browser-smoke.js',
  'v6/tests/chart-entry-playback-period-boundary-browser-smoke.js',
  'v6/tests/real-date-leftward-gap-browser-step189-smoke.js',
  'v6/tests/bar-data-boundary-metadata-step190-smoke.js',
  'v6/tests/chart-boundary-metadata-runtime-step191-smoke.js',
]);

function runTest(script) {
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('close', (code, signal) => {
      resolve({
        code,
        durationMs: Math.round(performance.now() - startedAt),
        script,
        signal,
      });
    });
  });
}

const results = [];
for (const script of TESTS) {
  console.log(`[date-range-boundary-entry-pack] start ${script}`);
  const result = await runTest(script);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[date-range-boundary-entry-pack] ${status} ${script} ${result.durationMs}ms`);
  if (result.code !== 0) {
    break;
  }
}

const failed = results.find((result) => result.code !== 0);
if (failed) {
  console.error('[date-range-boundary-entry-pack] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
console.log(`[date-range-boundary-entry-pack] passed ${results.length}/${TESTS.length} in ${totalMs}ms`);
