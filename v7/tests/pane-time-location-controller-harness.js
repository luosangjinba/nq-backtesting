import assert from 'node:assert/strict';
import { createWorkstationSettings } from '../src/workstation-settings/public.js';
import { createPaneTimeLocationController } from '../src/replay-workspace-ui/pane-time-location-controller.js';

const panes = Object.freeze([
  Object.freeze({ instrumentId: 'nq', paneId: 'pane-main', timeframeId: '1m' }),
  Object.freeze({ instrumentId: 'es', paneId: 'pane-secondary', timeframeId: '4h' }),
  Object.freeze({ instrumentId: 'nq', paneId: 'pane-tertiary', timeframeId: '15m' }),
]);
const workspace = Object.freeze({ activePaneId: 'pane-secondary', panes });
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
      { id: 'nq', label: 'NQ' },
      { id: 'es', label: 'ES' },
    ],
    timeframes: [
      { id: '1m', label: '1m' },
      { id: '15m', label: '15m' },
      { id: '4h', label: '4h' },
    ],
  },
  paneState: { read: () => workspace },
  readSettings: createWorkstationSettings,
  view: {
    openPaneTimeLocationMenu: (model) => menuModels.push(model),
    setGotoFeedback: (message) => feedback.push(message),
  },
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
assert.equal(workspace.activePaneId, 'pane-secondary', 'time location never changes the active source Pane');

selectionObservation = null;
assert.equal(controller.open({ clientX: 1, clientY: 1, coordinateX: 1, paneId: 'pane-main' }), false,
  'future whitespace or an inter-bar gap must leave the native context menu untouched');
assert.equal(controller.open({ clientX: 1, clientY: 1, coordinateX: 1, paneId: 'unknown' }), false);
controller.dispose();
assert.equal(controller.open({ clientX: 1, clientY: 1, coordinateX: 1, paneId: 'pane-main' }), false);

console.log('v7 Pane Time Location Controller harness passed (explicit/partial/history controls)');
