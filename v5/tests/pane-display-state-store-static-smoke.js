import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..');

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

const bannedByFile = {
  'v5/src/runtime/chart-runtime.js': [
    'paneDisplayStateByPaneId',
    'primaryState',
    'syncGlobalDisplayHosts',
    'syncGlobalDisplayHostsAppended',
  ],
  'v5/src/runtime/chart-runtime-pane-state.js': [
    'primaryState',
    'paneDisplayStateByPaneId',
    'defaultPaneState(primaryState',
  ],
  'v5/src/runtime/replay-display-window-controller.js': [
    "statefulLoad = targetPaneId === 'primary'",
    'if (statefulLoad)',
    'statefulLoad ?',
  ],
  'v5/src/runtime/replay-pane-display-window-state.js': [
    'statefulLoad',
    'sourceState.displayBars',
    'sourceState.displayBarsTimeframe',
  ],
  'v5/src/runtime/replay-chart-sync.js': [
    'primaryFullDisplayBars',
    "paneId === 'primary'",
    "paneId || 'primary'",
  ],
  'v5/src/features/chart-replay/chart-replay-pane-display-coordinator.js': [
    'ensureNonPrimaryPaneDisplays',
    'paneId === DEFAULT_ACTIVE_PANE_ID',
    'pane.id !== DEFAULT_ACTIVE_PANE_ID',
  ],
  'v5/src/features/chart-replay/chart-replay-pane-projection.js': [
    'paneId !== DEFAULT_ACTIVE_PANE_ID',
    'paneId === DEFAULT_ACTIVE_PANE_ID',
  ],
};

for (const [relativePath, bannedTerms] of Object.entries(bannedByFile)) {
  const source = read(relativePath);
  for (const term of bannedTerms) {
    assert.equal(
      source.includes(term),
      false,
      `${relativePath} must not keep old primary/non-primary display path marker: ${term}`
    );
  }
}

console.log('v5 pane display state store static smoke passed');
