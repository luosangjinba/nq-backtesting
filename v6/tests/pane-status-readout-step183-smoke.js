import assert from 'node:assert/strict';
import {
  CHART_DATA_EVENTS,
  CHART_HISTORY_EVENTS,
  CHART_SURFACE_EVENTS,
  PANE_EVENTS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS,
} from '../src/contracts/app-contracts.js';
import { mountPaneStatusReadout } from '../src/shell/pane-status-readout.js';

function createElement(dataset = {}) {
  const children = new Map();
  const element = {
    children: [],
    dataset: { ...dataset },
    hidden: false,
    appendChild(child) {
      this.children.push(child);
      this.textContent = [this.textContent, child.textContent].filter(Boolean).join(' ');
      return child;
    },
    querySelector(selector) {
      if (!children.has(selector)) {
        children.set(selector, {
          children: [],
          dataset: {},
          hidden: false,
          textContent: '',
          appendChild(child) {
            this.children.push(child);
            this.textContent = [this.textContent, child.textContent].filter(Boolean).join(' ');
            return child;
          },
          replaceChildren() {
            this.children.length = 0;
            this.textContent = '';
          },
        });
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
const commands = [];
const root = {
  querySelectorAll(selector) {
    return selector === '[data-v6-pane-status-readout]' ? [main, secondary] : [];
  },
};

const controller = mountPaneStatusReadout(root, {
  dispatchCommand(command) {
    commands.push(command);
    assert.equal(command, TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT);
    return {
      snapshot: null,
      status: 'idle',
    };
  },
  subscribeEvent(eventName, listener) {
    listeners.set(eventName, listener);
    return () => listeners.delete(eventName);
  },
});
await Promise.resolve();

assert.equal(main.text('[data-v6-status-symbol]'), 'NQ');
assert.equal(main.text('[data-v6-status-timeframe]'), '1m');
assert.equal(main.text('[data-v6-status-open]'), 'O --');
assert.equal(main.text('[data-v6-target-history-diagnostics]'), 'History idle');
assert.equal(commands.length, 1);
assert.equal(main.querySelector('[data-v6-target-materialization-diagnostics]').hidden, true);
assert.equal(main.querySelector('[data-v6-target-materialization-diagnostics]').dataset.v6TargetMaterializationDiagnosticsMode, 'hidden');
assert.equal(secondary.querySelector('[data-v6-target-materialization-diagnostics]').hidden, true);
assert.equal(
  secondary.querySelector('[data-v6-target-materialization-diagnostics]').dataset.v6TargetMaterializationDiagnosticsPaneId,
  'secondary',
);
assert.equal(secondary.text('[data-v6-status-symbol]'), 'ES');
assert.equal(secondary.text('[data-v6-status-timeframe]'), '5m');

listeners.get(CHART_DATA_EVENTS.BARS_CHANGED)({
  paneId: 'main',
  record: {
    bars: [
      { close: 98, high: 100, low: 97, open: 99, timestamp: 99 },
      { close: 101, high: 102, low: 98, open: 100, timestamp: 100 },
    ],
    paneId: 'main',
  },
});
assert.equal(main.text('[data-v6-status-open]'), 'O 100.00');
assert.equal(main.text('[data-v6-status-close]'), 'C 101.00');
assert.equal(main.dataset.statusOhlc, 'latest');

listeners.get(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED)({
  bar: { close: 101, high: 102, low: 99, open: 100, timestamp: 100 },
  paneId: 'main',
  previousClose: 99,
});
assert.equal(main.text('[data-v6-status-open]'), 'O 100.00');
assert.equal(main.text('[data-v6-status-close]'), 'C 101.00');
assert.equal(main.text('[data-v6-status-change]'), '+2.00 (+2.02%)');
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

const appliedSettings = controller.applySettings({
  statusBackgroundColor: '#112233',
  statusBackgroundOpacityPercent: 50,
  statusBarChangeVisible: false,
  statusOhlcVisible: false,
  statusTitleMode: 'hidden',
});
assert.equal(appliedSettings.statusTitleMode, 'hidden');
assert.equal(main.dataset.v6StatusTitleMode, 'hidden');
assert.equal(main.dataset.v6StatusOhlcVisible, 'false');
assert.equal(main.dataset.v6StatusBarChangeVisible, 'false');

listeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({
  diagnostics: {
    durationMs: 25.2,
    fallbackReason: 'target-history-empty',
    path: 'target-history-fallback-source-window',
    prependedBarCount: 8,
    sourceRequestCount: 1,
    targetRequestCount: 1,
  },
  paneId: 'secondary',
});
assert.equal(secondary.text('[data-v6-target-history-diagnostics]'), 'History fallback 25ms T1/S1 +8 target-history-empty');
assert.equal(secondary.querySelector('[data-v6-target-history-diagnostics]').dataset.v6TargetHistoryDiagnosticsPath, 'fallback');
assert.equal(secondary.querySelector('[data-v6-target-history-diagnostics]').dataset.v6TargetHistoryDiagnosticsFallbackReason, 'target-history-empty');
assert.equal(main.text('[data-v6-target-history-diagnostics]'), 'History idle');

listeners.get(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY)({
  snapshot: {
    autoPlayStatus: 'stopped',
    displayApplyStatus: 'applied',
    displayTimeframe: '8h',
    fallbackStatus: 'available',
    latestDisplayTimestamp: 1780332600,
    latestSourceTimestamp: 1780332660,
    manualNextStatus: 'advanced',
    paneId: 'main',
    projectionOwner: 'runtime.bar-data',
    sourceCursorAuthority: true,
    sourceCursorTime: '2026-06-01T16:51:00.000Z',
    targetBarsDisplayInputOnly: true,
    targetHistoryReason: 'target-history-opt-in',
    targetHistoryStatus: 'applied',
  },
  status: 'ready',
});
const targetMaterializationReadout = main.querySelector('[data-v6-target-materialization-diagnostics]');
assert.equal(targetMaterializationReadout.hidden, false);
assert.equal(targetMaterializationReadout.dataset.v6TargetMaterializationDiagnosticsMode, 'collapsed');
assert.equal(targetMaterializationReadout.dataset.v6TargetMaterializationDiagnosticsReason, 'target-history-active');
assert.match(targetMaterializationReadout.textContent, /TF 8h/);
assert.match(targetMaterializationReadout.textContent, /Target applied/);
assert.match(targetMaterializationReadout.textContent, /Projection runtime\.bar-data/);
assert.match(targetMaterializationReadout.textContent, /Next advanced/);
assert.match(targetMaterializationReadout.textContent, /Auto stopped/);
assert.match(targetMaterializationReadout.textContent, /Fallback available/);
assert.doesNotMatch(targetMaterializationReadout.textContent, /sourceCursorAuthority/);
assert.doesNotMatch(targetMaterializationReadout.textContent, /targetBarsDisplayInputOnly/);

listeners.get(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY)({
  snapshot: {
    displayTimeframe: '1m',
    fallbackStatus: 'target-history-disabled',
    paneId: 'main',
    projectionOwner: 'source-projection',
    targetHistoryStatus: 'disabled',
  },
  status: 'ready',
});
assert.equal(targetMaterializationReadout.hidden, true);
assert.equal(targetMaterializationReadout.dataset.v6TargetMaterializationDiagnosticsMode, 'hidden');
assert.equal(targetMaterializationReadout.textContent, '');

listeners.get(PANE_EVENTS.ACTIVE_CHANGED)({
  displayTimeframe: 15,
  id: 'secondary',
  instrument: 'YM',
});
assert.equal(main.dataset.v6PaneActive, 'false');
assert.equal(secondary.dataset.v6PaneActive, 'true');
assert.equal(main.text('[data-v6-status-symbol]'), 'NQ');
assert.equal(main.text('[data-v6-status-close]'), 'C 101.00');
assert.equal(secondary.text('[data-v6-status-symbol]'), 'YM');
assert.equal(secondary.text('[data-v6-status-timeframe]'), '5m');
assert.equal(secondary.text('[data-v6-status-close]'), 'C 208.00');

listeners.get(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED)({
  bar: null,
  paneId: 'main',
});
assert.equal(main.text('[data-v6-status-open]'), 'O 100.00');
assert.equal(main.text('[data-v6-status-close]'), 'C 101.00');
assert.equal(main.dataset.statusOhlc, 'latest');
assert.equal(secondary.text('[data-v6-status-close]'), 'C 208.00');
assert.equal(secondary.text('[data-v6-target-history-diagnostics]'), 'History fallback 25ms T1/S1 +8 target-history-empty');

controller.destroy();
assert.equal(listeners.size, 0);

console.log('v6 pane status readout step 183 smoke passed');
