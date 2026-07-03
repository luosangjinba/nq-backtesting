import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..');

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function assertIncludes(source, expected, message) {
  assert.ok(source.includes(expected), message || `Expected source to include ${expected}`);
}

const lifecycleSpec = read('v5/docs/specs/runtime-lifecycle-cleanup.md');
const lifecycleAudit = read('v5/docs/harness/lifecycle-cleanup-audit.md');
const chartRuntime = read('v5/src/runtime/chart-runtime.js');
const lightweightAdapter = read('v5/src/runtime/chart-engine-lightweight-adapter.js');
const fallbackAdapter = read('v5/src/runtime/chart-engine-fallback-adapter.js');
const viewportBridge = read('v5/src/features/chart-replay/viewport-demand-wiring.js');
const replayPlayback = read('v5/src/runtime/replay-playback-controller.js');
const chartRoute = read('v5/src/features/chart-replay/chart-replay-route.js');
const paneShell = read('v5/src/features/chart-replay/chart-replay-pane-shell.js');
const replayControls = read('v5/src/features/chart-replay/chart-replay-controls.js');

assertIncludes(
  lifecycleSpec,
  'The module that creates or owns a resource must also expose or perform the',
  'lifecycle cleanup spec must state creator-owned cleanup'
);
assertIncludes(
  lifecycleSpec,
  'DOM event listeners',
  'lifecycle cleanup spec must cover DOM listeners'
);
assertIncludes(
  lifecycleSpec,
  'chart adapters and series objects',
  'lifecycle cleanup spec must cover chart adapters'
);

assertIncludes(chartRuntime, 'function stop()', 'chart runtime must expose stop lifecycle');
assertIncludes(chartRuntime, 'observer?.disconnect()', 'chart runtime stop must disconnect MutationObserver');
assertIncludes(chartRuntime, 'unregisterCallbacks.pop()()', 'chart runtime stop must unregister commands/events');
assertIncludes(chartRuntime, 'adapter.destroy()', 'chart runtime stop must destroy adapters');

assertIncludes(lightweightAdapter, 'destroy() {', 'Lightweight adapter must expose destroy');
assertIncludes(lightweightAdapter, 'unsubscribeVisibleRange?.()', 'Lightweight adapter must unsubscribe visible range');
assertIncludes(lightweightAdapter, 'unsubscribeCrosshair?.()', 'Lightweight adapter must unsubscribe crosshair');
assertIncludes(lightweightAdapter, 'chart?.remove?.()', 'Lightweight adapter must remove chart instance');
assertIncludes(lightweightAdapter, 'interactionTracker.unbind()', 'Lightweight adapter must unbind interaction listeners');

assertIncludes(fallbackAdapter, 'destroy() {', 'fallback adapter must expose destroy');
assertIncludes(fallbackAdapter, 'unbindFallbackInput()', 'fallback adapter destroy must unbind input listeners');

assertIncludes(viewportBridge, 'function stop()', 'viewport demand bridge must expose stop');
assertIncludes(viewportBridge, 'unsubscribe?.()', 'viewport demand bridge stop must unsubscribe');
assertIncludes(viewportBridge, 'clearPendingDemand()', 'viewport demand bridge stop must clear pending timer');

assertIncludes(replayPlayback, 'function pause(', 'replay playback controller must expose pause');
assertIncludes(replayPlayback, 'clearTimer(playback.timerId)', 'replay playback pause must clear timer');
assertIncludes(replayPlayback, 'function reset()', 'replay playback controller must expose reset');

assertIncludes(chartRoute, 'section.dispose = () =>', 'chart replay route must expose dispose');
assertIncludes(chartRoute, 'viewportDemandBridge.stop()', 'chart replay route dispose must stop viewport bridge');
assertIncludes(chartRoute, 'clearTimeout(initialLoadTimer)', 'chart replay route dispose must clear initial load timer');
assertIncludes(chartRoute, 'unsubscribeCallbacks.pop()()', 'chart replay route dispose must unsubscribe route events');
assertIncludes(chartRoute, 'dispatchCommand(REPLAY_COMMANDS.PAUSE)', 'chart replay route dispose must pause replay playback');

assertIncludes(
  paneShell,
  'function dispose()',
  'pane shell controller must expose dispose'
);
assertIncludes(
  paneShell,
  "addListener(window, 'resize', scheduleHandlePosition)",
  'pane shell window resize listener must be tracked for cleanup'
);
assertIncludes(
  paneShell,
  'cleanupCallbacks.pop()()',
  'pane shell dispose must run tracked listener cleanup callbacks'
);
assertIncludes(
  paneShell,
  'cancelAnimationFrame(handleFrame)',
  'pane shell dispose must cancel pending animation frame'
);
assertIncludes(
  replayControls,
  'function dispose()',
  'replay controls controller must expose dispose'
);
assertIncludes(
  replayControls,
  'clearTimeout(pendingNextTimer)',
  'replay controls dispose must clear pending next timer'
);
assertIncludes(
  replayControls,
  'cleanupCallbacks.pop()()',
  'replay controls dispose must run tracked listener cleanup callbacks'
);
assertIncludes(
  chartRoute,
  'paneShellController?.dispose?.()',
  'chart route dispose must dispose pane shell controller'
);
assertIncludes(
  chartRoute,
  'replayControlsController?.dispose?.()',
  'chart route dispose must dispose replay controls controller'
);
assertIncludes(
  lifecycleAudit,
  'Step 493 Resolved Items',
  'lifecycle audit must document Step 493 resolved cleanup items'
);

console.log('v5 lifecycle cleanup static smoke passed');
