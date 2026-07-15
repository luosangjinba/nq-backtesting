import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TESTS = Object.freeze([
  'v6/tests/replay-runtime-smoke.js',
  'v6/tests/replay-transport-controller-smoke.js',
  'v6/tests/replay-transport-visual-state-browser-smoke.js',
  'v6/tests/manual-previous-chain-closure-step244-smoke.js',
  'v6/tests/manual-previous-transport-readiness-browser-step241-smoke.js',
  'v6/tests/manual-previous-transport-button-browser-step242-smoke.js',
  'v6/tests/manual-previous-transport-multi-pane-browser-step243-smoke.js',
  'v6/tests/leftward-extension-planner-smoke.js',
  'v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js',
  'v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js',
  'v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js',
  'v6/tests/pane-local-reset-controls-browser-step163-smoke.js',
  'v6/tests/reset-view-htf-browser-step200-smoke.js',
  'v6/tests/display-timeframe-target-pane-browser-step206-smoke.js',
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
  console.log(`[replay-transport-chain-pack] start ${script}`);
  const result = await runTest(script);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[replay-transport-chain-pack] ${status} ${script} ${result.durationMs}ms`);
  if (result.code !== 0) {
    break;
  }
}

const failed = results.find((result) => result.code !== 0);
if (failed) {
  console.error('[replay-transport-chain-pack] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
console.log(`[replay-transport-chain-pack] passed ${results.length}/${TESTS.length} in ${totalMs}ms`);
