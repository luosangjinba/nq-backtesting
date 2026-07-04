import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
const chartContracts = read('v5/src/contracts/chart-contracts.js');
const barDataContracts = read('v5/src/contracts/bar-data-contracts.js');
const chartRuntime = read('v5/src/runtime/chart-runtime.js');
const barDataRuntime = read('v5/src/runtime/bar-data-runtime.js');
const lightweightAdapter = read('v5/src/runtime/chart-engine-lightweight-adapter.js');
const fallbackAdapter = read('v5/src/runtime/chart-engine-fallback-adapter.js');
const viewportBridge = read('v5/src/features/chart-replay/viewport-demand-wiring.js');
const replayPlayback = read('v5/src/runtime/replay-playback-controller.js');
const chartRoute = read('v5/src/features/chart-replay/chart-replay-route.js');
const paneOrchestrator = read('v5/src/features/chart-replay/chart-replay-pane-orchestrator.js');
const paneShell = read('v5/src/features/chart-replay/chart-replay-pane-shell.js');
const splitResizeController = read('v5/src/features/chart-replay/chart-replay-split-resize-controller.js');
const replayControls = read('v5/src/features/chart-replay/chart-replay-controls.js');
const layoutController = read('v5/src/features/chart-replay/chart-replay-layout.js');
const navigationController = read('v5/src/features/chart-replay/chart-replay-navigation.js');
const truncateController = read('v5/src/features/chart-replay/chart-replay-truncate.js');
const floatingControls = read('v5/src/features/chart-replay/replay-floating-controls.js');
const settingsModal = read('v5/src/features/chart-replay/chart-settings-modal.js');
const settingsPanel = read('v5/src/features/chart-replay/chart-settings-panel.js');
const settingsBindings = read('v5/src/features/chart-replay/chart-settings-bindings.js');

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
assertIncludes(chartContracts, 'RELEASE_PANES', 'chart contracts must expose pane release command');
assertIncludes(chartRuntime, 'function releasePanes', 'chart runtime must expose pane-local release logic');
assertIncludes(
  chartRuntime,
  'registerCommand(CHART_COMMANDS.RELEASE_PANES',
  'chart runtime must register pane release command'
);
assertIncludes(
  chartRuntime,
  'paneStore.clear()',
  'chart runtime stop must clear pane display state store'
);
assertIncludes(
  paneOrchestrator,
  'function releaseRemovedChartPanes',
  'chart replay pane orchestrator must notify chart runtime when layout panes change'
);
assertIncludes(
  barDataContracts,
  'RELEASE_SCOPE',
  'bar data contracts must expose scope release command'
);
assertIncludes(
  barDataRuntime,
  'function releaseScope',
  'bar data runtime must expose scoped cache release logic'
);
assertIncludes(
  barDataRuntime,
  'registerCommand(BAR_DATA_COMMANDS.RELEASE_SCOPE',
  'bar data runtime must register scoped cache release command'
);
assertIncludes(
  barDataRuntime,
  'windows.clear()',
  'bar data runtime stop must clear cached windows'
);

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
  'cleanupCallbacks.push(() => target?.removeEventListener?.(type, handler, options))',
  'pane shell listeners must be tracked for cleanup'
);
assertIncludes(
  paneShell,
  'cleanupCallbacks.pop()()',
  'pane shell dispose must run tracked listener cleanup callbacks'
);
assertIncludes(
  paneShell,
  'splitResizeController.dispose()',
  'pane shell dispose must dispose split resize controller'
);
assertIncludes(
  splitResizeController,
  'cancelAnimationFrame(handleFrame)',
  'split resize controller dispose must cancel pending animation frame'
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
  'const controllerDisposers = []',
  'chart route must own a controller disposer stack'
);
assertIncludes(
  chartRoute,
  'controllerDisposers.pop()()',
  'chart route dispose must drain controller disposer stack'
);
assertIncludes(
  lifecycleAudit,
  'Step 493 Resolved Items',
  'lifecycle audit must document Step 493 resolved cleanup items'
);
assertIncludes(
  lifecycleAudit,
  'Step 494 Resolved Items',
  'lifecycle audit must document Step 494 resolved cleanup items'
);
assertIncludes(
  lifecycleAudit,
  'Step 495 Resolved Items',
  'lifecycle audit must document Step 495 resolved cleanup items'
);
assertIncludes(
  lifecycleAudit,
  'Step 496 Resolved Items',
  'lifecycle audit must document Step 496 resolved cleanup items'
);
assertIncludes(
  lifecycleAudit,
  'Step 497 Resolved Items',
  'lifecycle audit must document Step 497 resolved cleanup items'
);
assert.equal(
  existsSync(resolve(repoRoot, 'v5/tests/route-teardown-browser-smoke.js')),
  true,
  'route teardown browser smoke must exist'
);

const controllerSources = [
  ['layout controller', layoutController],
  ['navigation controller', navigationController],
  ['truncate controller', truncateController],
  ['floating controls', floatingControls],
  ['settings modal', settingsModal],
  ['settings panel', settingsPanel],
  ['settings bindings', settingsBindings],
];

for (const [label, source] of controllerSources) {
  assertIncludes(source, 'dispose', `${label} must expose a dispose path`);
}

console.log('v5 lifecycle cleanup static smoke passed');
