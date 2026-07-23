import assert from 'node:assert/strict';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createPaneWorkspaceState } from '../src/replay-workspace-ui/pane-workspace-state.js';
import { createSessionId } from '../src/session-identity/public.js';

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

state.dispose();
console.log('v7 Pane Workspace State harness passed (priority-preserving reductions)');
