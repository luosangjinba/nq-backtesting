import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  canApplyChartOnlySyncEffect,
  createLayoutSyncEffectRecord,
  getEnabledChartOnlySyncKeys,
} from '../src/layout/layout-sync-effects-model.js';

const snapshot = {
  sync: {
    crosshair: true,
    dateRange: true,
    interval: true,
    symbol: true,
    time: true,
  },
};

assert.deepEqual(getEnabledChartOnlySyncKeys(snapshot), ['crosshair', 'time', 'dateRange']);
assert.equal(canApplyChartOnlySyncEffect('symbol', snapshot), false);
assert.equal(canApplyChartOnlySyncEffect('interval', snapshot), false);
assert.equal(createLayoutSyncEffectRecord('symbol', {}, snapshot).requiresBarDataReload, true);
assert.equal(createLayoutSyncEffectRecord('interval', {}, snapshot).requiresBarDataReload, true);

const bridgeSource = fs.readFileSync(
  new URL('../src/chart-engine/layout-sync-surface-bridge.js', import.meta.url),
  'utf8',
);

const forbiddenBridgeTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'REPLAY_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'PANE_COMMANDS',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'SET_DISPLAY_TIMEFRAME',
  'symbol',
  'interval',
];

for (const token of forbiddenBridgeTokens) {
  assert.equal(
    bridgeSource.includes(token),
    false,
    `layout sync surface bridge must not contain ${token}`,
  );
}

const doc = fs.readFileSync(
  new URL('../docs/V6_SYMBOL_INTERVAL_SYNC_BOUNDARY_STEP168.md', import.meta.url),
  'utf8',
);
assert.match(doc, /Symbol and Interval sync are not chart-only effects\./);
assert.match(doc, /dedicated future runtime boundary for fan-out/);
assert.match(doc, /must not fetch bars directly/);
assert.match(doc, /must not reveal future bars/);

console.log('v6 symbol interval sync boundary step 168 smoke passed');
