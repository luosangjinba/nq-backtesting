import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TESTS = Object.freeze([
  'v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js',
  'v6/tests/multi-pane-replay-append-browser-step156-smoke.js',
  'v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js',
  'v6/tests/multi-pane-leftward-history-browser-step155-smoke.js',
  'v6/tests/pane-local-reset-controls-browser-step163-smoke.js',
  'v6/tests/pane-maximize-state-browser-step185-smoke.js',
  'v6/tests/maximize-restore-control-browser-step186-smoke.js',
  'v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js',
  'v6/tests/multi-pane-active-focus-chain-step251-smoke.js',
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
  console.log(`[multi-pane-foundation-pack] start ${script}`);
  const result = await runTest(script);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[multi-pane-foundation-pack] ${status} ${script} ${result.durationMs}ms`);
  if (result.code !== 0) {
    break;
  }
}

const failed = results.find((result) => result.code !== 0);
if (failed) {
  console.error('[multi-pane-foundation-pack] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
console.log(`[multi-pane-foundation-pack] passed ${results.length}/${TESTS.length} in ${totalMs}ms`);
