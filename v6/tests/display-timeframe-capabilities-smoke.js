import assert from 'node:assert/strict';
import {
  createDisplayTimeframeMenuGroups,
  findDisplayTimeframeCapabilityByRuntimeValue,
  getDisplayTimeframeCapabilities,
  getEnabledDisplayTimeframeCapabilities,
  getVisibleDisplayTimeframeCapabilities,
} from '../src/display-timeframe/display-timeframe-capabilities.js';

const all = getDisplayTimeframeCapabilities();
const visible = getVisibleDisplayTimeframeCapabilities();
const enabled = getEnabledDisplayTimeframeCapabilities();
const groups = createDisplayTimeframeMenuGroups();

assert.deepEqual(
  all.filter((capability) => capability.unit === 'second').map((capability) => ({
    id: capability.id,
    status: capability.status,
    visible: capability.visible,
  })),
  [
    { id: '1s', status: 'unsupported', visible: false },
    { id: '5s', status: 'unsupported', visible: false },
    { id: '10s', status: 'unsupported', visible: false },
    { id: '15s', status: 'unsupported', visible: false },
    { id: '30s', status: 'unsupported', visible: false },
  ],
);

assert.deepEqual(
  visible.map((capability) => capability.id),
  ['1m', '2m', '3m', '4m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '8h', '12h', '1D', '1W', '1M'],
);

assert.deepEqual(
  enabled.map((capability) => ({
    id: capability.id,
    runtimeValue: capability.runtimeValue,
  })),
  [
    { id: '1m', runtimeValue: 1 },
    { id: '2m', runtimeValue: 2 },
    { id: '3m', runtimeValue: 3 },
    { id: '4m', runtimeValue: 4 },
    { id: '5m', runtimeValue: 5 },
    { id: '10m', runtimeValue: 10 },
    { id: '15m', runtimeValue: 15 },
    { id: '30m', runtimeValue: 30 },
    { id: '1h', runtimeValue: 60 },
    { id: '2h', runtimeValue: 120 },
    { id: '4h', runtimeValue: 240 },
    { id: '8h', runtimeValue: 480 },
    { id: '12h', runtimeValue: 720 },
    { id: '1D', runtimeValue: '1D' },
    { id: '1W', runtimeValue: '1W' },
    { id: '1M', runtimeValue: '1M' },
  ],
);

assert.deepEqual(
  groups.map((group) => ({
    ids: group.items.map((item) => item.id),
    label: group.label,
  })),
  [
    { ids: ['1m', '2m', '3m', '4m', '5m', '10m', '15m', '30m'], label: 'Minutes' },
    { ids: ['1h', '2h', '4h', '8h', '12h'], label: 'Hours' },
    { ids: ['1D'], label: 'Days' },
    { ids: ['1W'], label: 'Weeks' },
    { ids: ['1M'], label: 'Months' },
  ],
);

assert.equal(findDisplayTimeframeCapabilityByRuntimeValue(1)?.id, '1m');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue(5)?.id, '5m');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue(15)?.id, '15m');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue(30)?.id, '30m');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue(60)?.id, '1h');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue(720)?.id, '12h');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue('1D')?.id, '1D');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue('1W')?.id, '1W');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue('1M')?.id, '1M');
assert.equal(findDisplayTimeframeCapabilityByRuntimeValue(1440), null);

console.log('v6 display timeframe capabilities smoke passed');
