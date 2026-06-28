import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const replayControls = readFileSync('v4/src/ui/replay-controls.js', 'utf8');

[
  '../chart/chart-manager.js',
  '../runtime/primary-chart-runtime.js',
  './replay-history-store.js',
  './replay/replay-history-actions.js',
  '../comparison/comparison-window-store.js',
  '../features/replay/replay-history-controller.js',
  '../features/replay/replay-toolbar-sync.js',
  '../features/replay/replay-view.js',
].forEach((forbiddenImport) => {
  assert.equal(
    replayControls.includes(forbiddenImport),
    false,
    `replay-controls.js must not import ${forbiddenImport} directly`
  );
});

[
  '../features/replay/replay-chart-adapter.js',
  '../features/replay/replay-control-dispatcher.js',
  '../features/replay/replay-toolbar-renderer.js',
].forEach((requiredImport) => {
  assert.equal(
    replayControls.includes(requiredImport),
    true,
    `replay-controls.js should use ${requiredImport}`
  );
});

console.log('replay controller boundary smoke passed');
