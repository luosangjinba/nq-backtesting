import assert from 'node:assert/strict';
import {
  canApplyChartOnlySyncEffect,
  createLayoutSyncEffectRecord,
  getEnabledChartOnlySyncKeys,
} from '../src/layout/layout-sync-effects-model.js';

const snapshot = {
  sync: {
    crosshair: true,
    dateRange: false,
    interval: true,
    symbol: true,
    time: true,
  },
};

assert.equal(canApplyChartOnlySyncEffect('crosshair', snapshot), true);
assert.equal(canApplyChartOnlySyncEffect('time', snapshot), true);
assert.equal(canApplyChartOnlySyncEffect('dateRange', snapshot), false);
assert.equal(canApplyChartOnlySyncEffect('symbol', snapshot), false);
assert.equal(canApplyChartOnlySyncEffect('interval', snapshot), false);
assert.deepEqual(getEnabledChartOnlySyncKeys(snapshot), ['crosshair', 'time']);

assert.deepEqual(createLayoutSyncEffectRecord('crosshair', { paneId: 'main' }, snapshot), {
  enabled: true,
  key: 'crosshair',
  payload: { paneId: 'main' },
  requiresBarDataReload: false,
});
assert.deepEqual(createLayoutSyncEffectRecord('symbol', { symbol: 'ES' }, snapshot), {
  enabled: false,
  key: 'symbol',
  payload: { symbol: 'ES' },
  requiresBarDataReload: true,
});
assert.throws(() => canApplyChartOnlySyncEffect('orders', snapshot), /Unsupported layout sync effect key/);

console.log('v6 layout sync effects model step 166 smoke passed');
