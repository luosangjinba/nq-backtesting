import assert from 'node:assert/strict';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkstationSettings } from '../src/workstation-settings/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';
import {
  createWorkspaceStateRuntime,
  readWorkspaceStateSnapshot,
} from '../src/workspace-state-runtime/public.js';
import { createPaneTimeLocationController } from '../src/replay-workspace-composition/public.js';

const sessionId = createSessionId('pane-time-location');
const activationGeneration = createActivationGeneration(1);
const workspaceState = createWorkspaceStateRuntime({
  activationGeneration,
  allowedInstrumentIds: ['instrument.cme.nq', 'instrument.cme.es'],
  calendarRevision: 'calendar-r1',
  checkpointContext: {
    historicalRange: { startEpochMs: 0, endEpochMs: 100_000 },
    instrumentIds: ['instrument.cme.nq', 'instrument.cme.es'],
  },
  initialCursorEpochMs: 10_000,
  initialPaneCount: 3,
  initialSessionHoursMode: 'eth',
  initialTarget: {
    instrumentId: 'instrument.cme.nq',
    timeframeId: 'timeframe.fixed.1-minute',
  },
  paneIds: ['pane-main', 'pane-secondary', 'pane-tertiary'],
  primaryInstrumentId: 'instrument.cme.nq',
  sessionHoursModes: ['eth', 'rth'],
  sessionId,
});
let transactionSequence = 0;
function commit(paneWorkspace) {
  transactionSequence += 1;
  const identity = createWorkspaceTransactionIdentity({
    activationGeneration,
    sessionId,
    transactionId: createTransactionId(`pane-location-${transactionSequence}`),
  });
  const state = readWorkspaceStateSnapshot(workspaceState.snapshot());
  workspaceState.begin(identity);
  workspaceState.accept({
    cursorEpochMs: 10_000,
    identity,
    paneWorkspace,
    sessionHours: state.sessionHours,
  });
}
workspaceState.focus('pane-secondary');
commit(workspaceState.desiredInstrument('instrument.cme.es'));
commit(workspaceState.desiredTimeframe('timeframe.calendar.4-hour'));
workspaceState.focus('pane-tertiary');
commit(workspaceState.desiredTimeframe('timeframe.fixed.15-minute'));
workspaceState.focus('pane-secondary');
const menuModels = [];
const feedback = [];
const historyRequests = [];
const locateCounts = new Map();
let selectionObservation = Object.freeze({ displayEpochMs: 20_000, marketEpochMs: 10_000 });
const adapter = {
  locateMarketTime(paneId, marketEpochMs) {
    const count = (locateCounts.get(paneId) ?? 0) + 1;
    locateCounts.set(paneId, count);
    if (paneId === 'pane-main' && count === 1) return { marketEpochMs, status: 'history-required' };
    if (paneId === 'pane-tertiary') {
      return { marketEpochMs, reason: 'no-containing-bar', status: 'unavailable' };
    }
    return { displayEpochMs: 20_000, marketEpochMs, status: 'located' };
  },
  resolveTimeLocationSelection: () => selectionObservation,
};
const execution = {
  isPending: () => false,
  requestTimeLocationHistory(paneId, targetEpochMs) {
    historyRequests.push({ paneId, targetEpochMs });
    return Promise.resolve({ status: 'committed' });
  },
};
const controller = createPaneTimeLocationController({
  adapter,
  execution,
  market: {
    instrumentOptions: [
      { id: 'instrument.cme.nq', label: 'NQ' },
      { id: 'instrument.cme.es', label: 'ES' },
    ],
    timeframes: [
      { id: 'timeframe.fixed.1-minute', label: '1m' },
      { id: 'timeframe.fixed.15-minute', label: '15m' },
      { id: 'timeframe.calendar.4-hour', label: '4h' },
    ],
  },
  readSettings: createWorkstationSettings,
  view: {
    openPaneTimeLocationMenu: (model) => menuModels.push(model),
    setGotoFeedback: (message) => feedback.push(message),
  },
  workspaceState,
});

assert.equal(controller.open({ clientX: 20, clientY: 30, coordinateX: 40, paneId: 'pane-secondary' }), true);
assert.equal(menuModels.length, 1);
assert.equal(menuModels[0].sourceLabel, 'P2 · ES · 4h');
assert.deepEqual(menuModels[0].targets, [
  { label: 'P1 · NQ · 1m', paneId: 'pane-main' },
  { label: 'P3 · NQ · 15m', paneId: 'pane-tertiary' },
]);
assert.match(menuModels[0].timeLabel, /1969/);

const results = await controller.locate({
  selection: menuModels[0].selection,
  targetPaneIds: ['pane-main', 'pane-tertiary'],
});
assert.deepEqual(historyRequests, [{ paneId: 'pane-main', targetEpochMs: 10_000 }],
  'only the target Pane with insufficient history may request a bounded extension');
assert.deepEqual(results.map(({ paneId, result }) => ({ paneId, status: result.status })), [
  { paneId: 'pane-main', status: 'located' },
  { paneId: 'pane-tertiary', status: 'unavailable' },
]);
assert.match(feedback.at(-1), /P3 · NQ · 15m/);
assert.match(feedback.at(-1), /no unrelated candle was selected/);
assert.equal(
  workspaceState.read(readWorkspaceStateSnapshot(workspaceState.snapshot()).paneWorkspace).activePaneId,
  'pane-secondary',
  'time location never changes the active source Pane',
);

selectionObservation = null;
assert.equal(controller.open({ clientX: 1, clientY: 1, coordinateX: 1, paneId: 'pane-main' }), false,
  'future whitespace or an inter-bar gap must leave the native context menu untouched');
assert.equal(controller.open({ clientX: 1, clientY: 1, coordinateX: 1, paneId: 'unknown' }), false);
controller.dispose();
workspaceState.dispose();
assert.equal(controller.open({ clientX: 1, clientY: 1, coordinateX: 1, paneId: 'pane-main' }), false);

console.log('v7 Pane Time Location Controller harness passed (explicit/partial/history controls)');
