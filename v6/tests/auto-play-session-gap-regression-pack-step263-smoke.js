import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TESTS = Object.freeze([
  'v6/tests/auto-play-session-gap-ownership-step263-smoke.js',
  'v6/tests/auto-play-session-gap-step263-smoke.js',
  'v6/tests/auto-play-session-gap-browser-step263-smoke.js',
  'v6/tests/chart-entry-auto-play-runtime-smoke.js',
  'v6/tests/chart-entry-auto-play-browser-smoke.js',
  'v6/tests/auto-play-htf-projection-step199-smoke.js',
  'v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js',
  'v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js',
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
  console.log(`[auto-play-session-gap-pack] start ${script}`);
  const result = await runTest(script);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[auto-play-session-gap-pack] ${status} ${script} ${result.durationMs}ms`);
  if (result.code !== 0) {
    break;
  }
}

const failed = results.find((result) => result.code !== 0);
if (failed) {
  console.error('[auto-play-session-gap-pack] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
console.log(`[auto-play-session-gap-pack] passed ${results.length}/${TESTS.length} in ${totalMs}ms`);
