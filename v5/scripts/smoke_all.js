import { spawn } from 'node:child_process';

const commands = [
  ['node', ['v5/tests/runtime-smoke.js']],
  ['node', ['v5/tests/session-model-smoke.js']],
  ['node', ['v5/tests/default-workspace-smoke.js']],
  ['node', ['v5/tests/session-repository-smoke.js']],
  ['node', ['v5/tests/session-runtime-smoke.js']],
  ['node', ['v5/tests/session-persistence-smoke.js']],
  ['node', ['v5/tests/session-setup-model-smoke.js']],
  ['node', ['v5/tests/chart-formatting-smoke.js']],
  ['node', ['v5/tests/chart-presentation-runtime-smoke.js']],
  ['node', ['v5/tests/timezone-contracts-smoke.js']],
  ['node', ['v5/tests/display-timezone-runtime-smoke.js']],
  ['node', ['v5/tests/bar-data-runtime-smoke.js']],
  ['node', ['v5/tests/chart-engine-adapter-smoke.js']],
  ['node', ['v5/tests/chart-runtime-smoke.js']],
  ['node', ['v5/tests/chart-runtime-engine-adapter-smoke.js']],
  ['node', ['v5/tests/chart-runtime-fallback-input-smoke.js']],
  ['node', ['v5/tests/chart-viewport-follow-smoke.js']],
  ['node', ['v5/tests/chart-interaction-contracts-smoke.js']],
  ['node', ['v5/tests/replay-start-bar-smoke.js']],
  ['node', ['v5/tests/replay-prefix-load-smoke.js']],
  ['node', ['v5/tests/replay-initial-render-smoke.js']],
  ['node', ['v5/tests/replay-no-future-bars-smoke.js']],
  ['node', ['v5/tests/replay-viewport-follow-smoke.js']],
  ['node', ['v5/tests/replay-manual-viewport-follow-smoke.js']],
  ['node', ['v5/tests/replay-next-smoke.js']],
  ['node', ['v5/tests/replay-play-smoke.js']],
  ['node', ['v5/tests/replay-cursor-persistence-smoke.js']],
  ['node', ['v5/tests/replay-display-contracts-smoke.js']],
  ['node', ['v5/tests/replay-display-progression-smoke.js']],
  ['node', ['v5/tests/replay-display-viewport-demand-smoke.js']],
  ['node', ['v5/tests/replay-display-viewport-demand-wiring-smoke.js']],
  ['node', ['v5/tests/replay-display-window-cache-smoke.js']],
  ['node', ['v5/tests/replay-display-timeframe-smoke.js']],
  ['node', ['v5/tests/replay-display-timeframe-no-future-smoke.js']],
  ['node', ['v5/tests/display-timezone-browser-smoke.js']],
  ['node', ['v5/tests/chart-presentation-browser-smoke.js']],
  ['node', ['v5/tests/replay-display-timeframe-browser-smoke.js']],
  ['node', ['v5/tests/replay-viewport-follow-browser-smoke.js']],
  ['node', ['v5/tests/chart-interaction-browser-smoke.js']],
  ['node', ['v5/tests/chart-crosshair-browser-smoke.js']],
  ['node', ['v5/tests/chart-go-to-time-browser-smoke.js']],
  ['node', ['v5/tests/chart-navigation-toolbar-browser-smoke.js']],
  ['node', ['v5/tests/chart-native-interaction-browser-smoke.js']],
  ['node', ['v5/tests/chart-display-usability-browser-smoke.js']],
  ['node', ['v5/tests/replay-workstation-layout-browser-smoke.js']],
  ['node', ['v5/tests/chart-price-scale-browser-smoke.js']],
  ['node', ['v5/tests/chart-overlay-visibility-browser-smoke.js']],
  ['node', ['v5/tests/chart-responsive-visual-browser-smoke.js']],
  ['node', ['v5/tests/replay-restore-smoke.js']],
  ['node', ['v5/tests/replay-reset-smoke.js']],
  ['node', ['v5/tests/replay-session-switch-smoke.js']],
  ['node', ['v5/tests/replay-session-end-smoke.js']],
  ['node', ['v5/tests/replay-right-pan-smoke.js']],
  ['node', ['v5/tests/prefix-demand-detect-smoke.js']],
  ['node', ['v5/tests/prefix-demand-load-smoke.js']],
  ['node', ['v5/tests/prefix-demand-merge-smoke.js']],
  ['node', ['v5/tests/prefix-retention-smoke.js']],
  ['node', ['v5/tests/boundary-smoke.js']],
  ['node', ['v5/tests/runtime-boundary-smoke.js']],
  ['node', ['v5/tests/bar-data-boundary-smoke.js']],
  ['node', ['v5/tests/bar-data-preload-boundary-smoke.js']],
  ['node', ['v5/tests/chart-boundary-smoke.js']],
  ['node', ['v5/tests/chart-engine-boundary-smoke.js']],
  ['node', ['v5/tests/app-shell-browser-smoke.js']],
  ['node', ['v5/tests/session-setup-browser-smoke.js']],
  ['node', ['v5/tests/replay-initial-browser-smoke.js']],
  ['node', ['v5/tests/replay-controls-browser-smoke.js']],
  ['node', ['v5/tests/replay-restore-browser-smoke.js']],
  ['node', ['v5/tests/chart-overflow-browser-smoke.js']],
];

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code || 0));
  });
}

let failures = 0;
for (const [command, args] of commands) {
  const code = await run(command, args);
  if (code !== 0) {
    failures += 1;
  }
}

if (failures) {
  console.error(`v5 smoke failed: ${failures} command(s) failed`);
  process.exit(1);
}

console.log('v5 smoke passed');
