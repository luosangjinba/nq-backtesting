import assert from 'node:assert/strict';
import {
  CHART_SURFACE_EVENTS,
  PANE_EVENTS,
} from '../src/contracts/app-contracts.js';
import { mountPaneStatusReadout } from '../src/shell/pane-status-readout.js';

function createElement(dataset = {}) {
  const children = new Map();
  const element = {
    dataset: { ...dataset },
    querySelector(selector) {
      if (!children.has(selector)) {
        children.set(selector, { dataset: {}, textContent: '' });
      }
      return children.get(selector);
    },
    text(selector) {
      return children.get(selector)?.textContent || '';
    },
  };
  return element;
}

const main = createElement({
  v6PaneId: 'main',
  v6PaneSymbol: 'NQ',
  v6PaneTimeframe: '1m',
});
const secondary = createElement({
  v6PaneId: 'secondary',
  v6PaneSymbol: 'ES',
  v6PaneTimeframe: '5m',
});
const listeners = new Map();
const root = {
  querySelectorAll(selector) {
    return selector === '[data-v6-pane-status-readout]' ? [main, secondary] : [];
  },
};

const controller = mountPaneStatusReadout(root, {
  subscribeEvent(eventName, listener) {
    listeners.set(eventName, listener);
    return () => listeners.delete(eventName);
  },
});

assert.equal(main.text('[data-v6-status-symbol]'), 'NQ');
assert.equal(main.text('[data-v6-status-timeframe]'), '1m');
assert.equal(main.text('[data-v6-status-open]'), 'O --');
assert.equal(secondary.text('[data-v6-status-symbol]'), 'ES');
assert.equal(secondary.text('[data-v6-status-timeframe]'), '5m');

listeners.get(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED)({
  bar: { close: 101, high: 102, low: 99, open: 100, timestamp: 100 },
  paneId: 'main',
});
assert.equal(main.text('[data-v6-status-open]'), 'O 100.00');
assert.equal(main.text('[data-v6-status-close]'), 'C 101.00');
assert.equal(main.dataset.statusCandleDirection, 'up');
assert.equal(secondary.text('[data-v6-status-open]'), 'O --');
assert.equal(secondary.dataset.statusOhlc, 'empty');

listeners.get(PANE_EVENTS.SYMBOL_INTENT_CHANGED)({
  displayTimeframe: 5,
  id: 'secondary',
  instrument: 'YM',
});
assert.equal(secondary.text('[data-v6-status-symbol]'), 'YM');
assert.equal(secondary.text('[data-v6-status-timeframe]'), '5m');

listeners.get(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED)({
  bar: { close: 208, high: 212, low: 207, open: 211, timestamp: 100 },
  paneId: 'secondary',
});
assert.equal(secondary.text('[data-v6-status-open]'), 'O 211.00');
assert.equal(secondary.text('[data-v6-status-close]'), 'C 208.00');
assert.equal(secondary.dataset.statusCandleDirection, 'down');
assert.equal(main.text('[data-v6-status-close]'), 'C 101.00');

listeners.get(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED)({
  bar: null,
  paneId: 'main',
});
assert.equal(main.text('[data-v6-status-open]'), 'O --');
assert.equal(main.text('[data-v6-status-close]'), 'C --');
assert.equal(main.dataset.statusOhlc, 'empty');
assert.equal(secondary.text('[data-v6-status-close]'), 'C 208.00');

controller.destroy();
assert.equal(listeners.size, 0);

console.log('v6 pane status readout step 183 smoke passed');
