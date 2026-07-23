import assert from 'node:assert/strict';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createPaneWorkspaceState } from '../src/replay-workspace-ui/pane-workspace-state.js';
import { createSessionId } from '../src/session-identity/public.js';
import { readViewportIntent } from '../src/viewport-runtime/public.js';
import { createWorkspaceCheckpoint } from '../src/workspace-checkpoint-domain/public.js';

const cursorEpochMs = 1_800_000;
const state = createPaneWorkspaceState({
  initialCursorEpochMs: cursorEpochMs,
  initialPaneCount: 4,
  initialTarget: {
    instrumentId: 'instrument.cme.nq',
    timeframeId: 'timeframe.fixed.1-minute',
  },
  record: {
    activationGeneration: createActivationGeneration(1),
    configuration: { instrumentIds: ['instrument.cme.nq'] },
    sessionId: createSessionId('pane-priority-session'),
  },
});

for (const [paneId, timeframeId] of [
  ['pane-secondary', 'timeframe.fixed.2-minute'],
  ['pane-tertiary', 'timeframe.fixed.3-minute'],
  ['pane-quaternary', 'timeframe.fixed.4-minute'],
]) {
  state.focus(paneId);
  state.accept(state.desiredTimeframe(timeframeId), cursorEpochMs);
}

const three = state.read(state.desiredPaneCount(3, cursorEpochMs));
assert.deepEqual(three.panes.map(({ paneId }) => paneId), [
  'pane-main', 'pane-secondary', 'pane-tertiary',
], 'four-to-three retains P1, P2, and P3 and drops P4');
assert.deepEqual(three.panes.map(({ timeframeId }) => timeframeId), [
  'timeframe.fixed.1-minute', 'timeframe.fixed.2-minute', 'timeframe.fixed.3-minute',
], 'retained Pane content follows stable priority identity');
assert.equal(three.activePaneId, 'pane-main', 'dropping the active P4 falls back to P1');

const one = state.read(state.desiredPaneCount(1, cursorEpochMs));
assert.deepEqual(one.panes.map(({ paneId }) => paneId), ['pane-main']);
assert.equal(one.panes[0].timeframeId, 'timeframe.fixed.1-minute',
  'every multi-to-single reduction retains P1 content');

const restoredRecord = {
  activationGeneration: createActivationGeneration(2),
  configuration: {
    historicalRange: { startEpochMs: 1_000_000, endEpochMs: 2_000_000 },
    instrumentIds: ['instrument.cme.nq'],
  },
  sessionId: createSessionId('pane-restore-session'),
};
const checkpoint = createWorkspaceCheckpoint({
  activePaneId: 'pane-secondary',
  cursorEpochMs,
  panes: [
    {
      instrumentId: 'instrument.cme.nq',
      paneId: 'pane-main',
      timeframeId: 'timeframe.fixed.1-minute',
      viewport: { latestOffsetBars: 18, origin: 'default', spanBars: null },
    },
    {
      instrumentId: 'instrument.cme.nq',
      paneId: 'pane-secondary',
      timeframeId: 'timeframe.fixed.4-minute',
      viewport: { latestOffsetBars: -5, origin: 'manual', spanBars: 92 },
    },
  ],
  sessionHoursMode: 'rth',
}, restoredRecord.configuration);
const restoredState = createPaneWorkspaceState({
  initialCheckpoint: checkpoint,
  initialCursorEpochMs: cursorEpochMs,
  initialPaneCount: 2,
  initialTarget: {
    instrumentId: 'instrument.cme.nq',
    timeframeId: 'timeframe.fixed.1-minute',
  },
  record: restoredRecord,
});
assert.equal(restoredState.activePaneId(), 'pane-secondary');
assert.deepEqual(restoredState.read().panes.map(({ timeframeId }) => timeframeId), [
  'timeframe.fixed.1-minute', 'timeframe.fixed.4-minute',
]);
const restoredViewport = readViewportIntent(restoredState.viewportPort('pane-secondary').snapshot());
assert.deepEqual({
  cursorEpochMs: restoredViewport.cursorEpochMs,
  latestOffsetBars: restoredViewport.latestOffsetBars,
  origin: restoredViewport.origin,
  revision: restoredViewport.revision,
  spanBars: restoredViewport.spanBars,
}, {
  cursorEpochMs,
  latestOffsetBars: -5,
  origin: 'manual',
  revision: 0,
  spanBars: 92,
});
assert.equal(restoredViewport.scope.activationGeneration, restoredRecord.activationGeneration,
  'restore must rebrand the semantic viewport to the new activation');
restoredState.dispose();

state.dispose();
console.log('v7 Pane Workspace State harness passed (priority-preserving reductions)');
