import assert from 'node:assert/strict';
import { createChartReplayControlsController } from '../src/features/chart-replay/chart-replay-controls.js';

function createControl(selector) {
  const listeners = new Map();
  return {
    selector,
    disabled: false,
    hidden: false,
    value: '1',
    checked: false,
    attributes: {},
    selectedOptions: [{ textContent: '1m' }],
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    click() {
      listeners.get('click')?.({ type: 'click' });
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
  };
}

function deferred() {
  let resolve = null;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

const controls = new Map([
  ['[data-replay-next]', createControl('[data-replay-next]')],
  ['[data-replay-play]', createControl('[data-replay-play]')],
  ['[data-replay-pause]', createControl('[data-replay-pause]')],
  ['[data-replay-reset]', createControl('[data-replay-reset]')],
  ['[data-replay-truncate-to-selection]', createControl('[data-replay-truncate-to-selection]')],
  ['[data-replay-previous]', createControl('[data-replay-previous]')],
  ['[data-replay-speed]', createControl('[data-replay-speed]')],
  ['[data-replay-interval-select]', createControl('[data-replay-interval-select]')],
  ['[data-replay-sync-interval]', createControl('[data-replay-sync-interval]')],
  ['[data-display-timeframe-select]', createControl('[data-display-timeframe-select]')],
  ['[data-chart-go-to-open]', createControl('[data-chart-go-to-open]')],
  ['[data-chart-go-to-input]', createControl('[data-chart-go-to-input]')],
  ['[data-chart-go-to]', createControl('[data-chart-go-to]')],
  ['[data-chart-jump-cursor]', createControl('[data-chart-jump-cursor]')],
  ['[data-chart-jump-cursor-popover]', createControl('[data-chart-jump-cursor-popover]')],
]);
const root = {
  querySelector(selector) {
    return controls.get(selector) || null;
  },
  querySelectorAll() {
    return [];
  },
};

let commandInFlight = false;
let revealedCount = 0;
let statusRefreshCount = 0;
const calls = [];
const pendingCalls = [];

createChartReplayControlsController({
  root,
  dispatchCommand: async (name, payload) => {
    calls.push({ name, payload });
    const gate = deferred();
    pendingCalls.push(gate);
    await gate.promise;
    revealedCount += Number(payload.stepCount || 1);
    return {
      advanced: true,
      displayBars: Array.from({ length: revealedCount }, (_, index) => ({ timestamp: index + 1 })),
    };
  },
  getSessionId: () => 'session-fast-next-controls',
  getReplayLoaded: () => true,
  getPlaybackPlaying: () => false,
  setPlaybackPlaying: () => {},
  getPlaybackIntervalMs: () => 500,
  setPlaybackIntervalMs: () => {},
  getTerminalReason: () => '',
  setTerminalReason: () => {},
  getRevealedCount: () => revealedCount,
  getSessionTimeframe: () => 1,
  getDisplayTimeframe: () => 1,
  setDisplayTimeframe: () => {},
  setActivePaneDisplayTimeframe: () => {},
  getReplayIntervalTimeframe: () => 1,
  setReplayIntervalTimeframe: () => {},
  getReplayIntervalSync: () => false,
  setReplayIntervalSync: () => {},
  getTruncatePickMode: () => false,
  getGoToInputValue: () => '',
  formatReplayTimestamp: (value) => String(value || ''),
  refreshReplayStatus: async () => {
    statusRefreshCount += 1;
  },
  setStatusText: () => {},
  getCommandInFlight: () => commandInFlight,
  setCommandInFlight: (value) => {
    commandInFlight = Boolean(value);
  },
});

const nextButton = controls.get('[data-replay-next]');
nextButton.click();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(calls.length, 1);
assert.equal(calls[0].payload.stepCount, 1);

for (let index = 0; index < 9; index += 1) {
  nextButton.click();
}
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(calls.length, 1, 'clicks during an active next command should be accumulated');

pendingCalls[0].resolve();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(calls.length, 2);
assert.equal(calls[1].payload.stepCount, 9);

pendingCalls[1].resolve();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(revealedCount, 10);
assert.equal(statusRefreshCount, 1, 'batched next commands should refresh status once after the batch');

console.log('v5 chart replay fast next controls smoke passed');
