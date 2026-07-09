import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TESTS = Object.freeze([
  'v6/tests/pane-reload-pipeline-browser-step179-smoke.js',
  'v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js',
  'v6/tests/multi-pane-replay-append-browser-step156-smoke.js',
  'v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js',
  'v6/tests/pane-local-reset-controls-browser-step163-smoke.js',
  'v6/tests/pane-status-readout-browser-step183-smoke.js',
  'v6/tests/pane-action-rail-browser-step184-smoke.js',
  'v6/tests/pane-maximize-state-browser-step185-smoke.js',
  'v6/tests/maximize-restore-control-browser-step186-smoke.js',
  'v6/tests/chart-drag-release-lifecycle-browser-smoke.js',
  'v6/tests/fast-right-drag-stability-browser-smoke.js',
  'v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js',
  'v6/tests/leftward-history-auto-chain-browser-smoke.js',
  'v6/tests/initial-htf-chart-entry-browser-step195-smoke.js',
  'v6/tests/pane-reload-htf-projection-browser-step196-smoke.js',
  'v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js',
  'v6/tests/leftward-history-htf-stability-browser-step198-smoke.js',
  'v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js',
  'v6/tests/reset-view-htf-browser-step200-smoke.js',
  'v6/tests/pane-identity-display-timeframe-browser-step202-smoke.js',
  'v6/tests/pane-identity-bootstrap-browser-step203-smoke.js',
  'v6/tests/display-timeframe-target-pane-browser-step206-smoke.js',
  'v6/tests/display-timeframe-active-pane-browser-step207-smoke.js',
  'v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js',
  'v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js',
  'v6/tests/pane-local-header-state-browser-step210-smoke.js',
  'v6/tests/top-symbol-active-pane-browser-step212-smoke.js',
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
  console.log(`[chart-browser-pack] start ${script}`);
  const result = await runTest(script);
  results.push(result);
  const status = result.code === 0 ? 'pass' : 'fail';
  console.log(`[chart-browser-pack] ${status} ${script} ${result.durationMs}ms`);
  if (result.code !== 0) {
    break;
  }
}

const failed = results.find((result) => result.code !== 0);
if (failed) {
  console.error('[chart-browser-pack] failed');
  console.error(JSON.stringify(failed, null, 2));
  process.exit(failed.code || 1);
}

const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
console.log(`[chart-browser-pack] passed ${results.length}/${TESTS.length} in ${totalMs}ms`);
