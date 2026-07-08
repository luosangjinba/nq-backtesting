import assert from 'node:assert/strict';
import {
  CHART_DATA_EVENTS,
  CHART_SURFACE_EVENTS,
  DEFAULT_WALL_EVENTS,
  REPLAY_EVENTS,
} from '../src/contracts/app-contracts.js';
import { mountStatusReadout } from '../src/shell/status-readout.js';

function createFakeRoot() {
  const elements = new Map();
  const root = {
    dataset: {},
    querySelector(selector) {
      if (!elements.has(selector)) {
        elements.set(selector, { textContent: '' });
      }
      return elements.get(selector);
    },
    text(selector) {
      return elements.get(selector)?.textContent || '';
    },
  };
  return root;
}

const listeners = new Map();
const root = createFakeRoot();
const controller = mountStatusReadout(root, {
  subscribeEvent: (eventName, listener) => {
    listeners.set(eventName, listener);
    return () => listeners.delete(eventName);
  },
});

listeners.get(DEFAULT_WALL_EVENTS.LOADED)({
  replayState: {
    cursorTime: '2026-06-01T09:30:00.000Z',
    endTime: '2026-06-01T09:33:00.000Z',
    revealedCount: 1,
    sessionId: 'session-status',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 4,
  },
  state: {
    latestBar: {
      close: 100.5,
      high: 101,
      low: 99,
      open: 100,
      timestamp: 1780306200,
    },
  },
});

assert.equal(root.text('[data-v6-status-open]'), 'O --');
assert.equal(root.text('[data-v6-status-high]'), 'H --');
assert.equal(root.text('[data-v6-status-low]'), 'L --');
assert.equal(root.text('[data-v6-status-close]'), 'C --');
assert.equal(root.text('[data-v6-status-price]'), '--');
assert.equal(root.text('[data-v6-footer-session]'), 'Session session-status');
assert.equal(root.text('[data-v6-footer-no-future]'), 'No future 3 hidden');

listeners.get(REPLAY_EVENTS.PLAYBACK_CHANGED)({ status: 'playing' });
assert.equal(root.text('[data-v6-footer-playback]'), 'Playback playing');
assert.equal(controller.getState().ohlc.close, 'C --');

listeners.get(CHART_DATA_EVENTS.BARS_CHANGED)({
  record: {
    bars: [
      {
        close: 101.5,
        high: 102,
        low: 100,
        open: 101,
        timestamp: 1780306260,
      },
    ],
  },
});
assert.equal(root.text('[data-v6-status-open]'), 'O --');
assert.equal(root.text('[data-v6-status-high]'), 'H --');
assert.equal(root.text('[data-v6-status-low]'), 'L --');
assert.equal(root.text('[data-v6-status-close]'), 'C --');
assert.equal(root.text('[data-v6-status-price]'), '--');

listeners.get(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED)({
  bar: {
    close: 101.5,
    high: 102,
    low: 100,
    open: 101,
    timestamp: 1780306260,
  },
  paneId: 'main',
});
assert.equal(root.text('[data-v6-status-open]'), 'O 101.00');
assert.equal(root.text('[data-v6-status-high]'), 'H 102.00');
assert.equal(root.text('[data-v6-status-low]'), 'L 100.00');
assert.equal(root.text('[data-v6-status-close]'), 'C 101.50');
assert.equal(root.text('[data-v6-status-price]'), '101.50');
assert.equal(root.text('[data-v6-footer-playback]'), 'Playback playing');

listeners.get(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED)({
  bar: null,
  paneId: 'main',
});
assert.equal(root.text('[data-v6-status-open]'), 'O --');
assert.equal(root.text('[data-v6-status-high]'), 'H --');
assert.equal(root.text('[data-v6-status-low]'), 'L --');
assert.equal(root.text('[data-v6-status-close]'), 'C --');

controller.destroy();
assert.equal(listeners.size, 0);

console.log('v6 status readout controller smoke passed');
