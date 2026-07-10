import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TESTS = Object.freeze([
  'v6/tests/display-timeframe-browser-smoke.js',
  'v6/tests/timeframe-menu-parity-browser-smoke.js',
  'v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js',
  'v6/tests/session-aware-leftward-auto-chain-browser-smoke.js',
  'v6/tests/daily-projection-browser-step268-smoke.js',
  'v6/tests/weekly-projection-browser-step269-smoke.js',
  'v6/tests/monthly-projection-browser-step270-smoke.js',
  'v6/tests/replay-gap-browser-regression-pack-step274-smoke.js',
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
  console.log(`[timeframe-replay-foundation-pack] start ${script}`);
  const result = await runTest(script);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[timeframe-replay-foundation-pack] ${status} ${script} ${result.durationMs}ms`);
  if (result.code !== 0) {
    break;
  }
}

const failed = results.find((result) => result.code !== 0);
if (failed) {
  console.error('[timeframe-replay-foundation-pack] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
console.log(`[timeframe-replay-foundation-pack] passed ${results.length}/${TESTS.length} in ${totalMs}ms`);
