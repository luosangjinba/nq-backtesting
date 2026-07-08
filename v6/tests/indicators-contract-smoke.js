import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createDefaultIndicatorIntent,
  createIndicatorsContract,
  getIndicatorsAllowedFields,
  getIndicatorsAllowedIds,
  getIndicatorsAllowedPanePlacements,
  getIndicatorsAllowedSourceSeries,
  getIndicatorsBlockedIntegrations,
  getIndicatorsOwner,
  validateIndicatorIntent,
} from '../src/indicators/indicators-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contractSource = await readFile('v6/src/indicators/indicators-contract.js', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP136.md', 'utf8');
const contractDoc = await readFile('v6/docs/V6_INDICATORS_OWNER_CONTRACT.md', 'utf8');
const docsIndex = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(getIndicatorsOwner(), 'indicators-runtime');
assert.deepEqual(getIndicatorsAllowedIds(), ['sma', 'ema', 'rsi', 'macd', 'volume', 'vwap', 'atr']);
assert.equal(getIndicatorsAllowedIds().includes('custom'), false);
assert.deepEqual(getIndicatorsAllowedSourceSeries(), ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4', 'volume']);
assert.deepEqual(getIndicatorsAllowedPanePlacements(), ['overlay', 'separate']);
assert.deepEqual(getIndicatorsAllowedFields(), [
  'indicatorId',
  'sourceSeries',
  'panePlacement',
  'inputs',
  'style',
  'visible',
  'metadata',
]);
assert.deepEqual(getIndicatorsBlockedIntegrations(), [
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'default-wall',
  'display-timeframe',
  'orders',
  'replay',
  'screenshot-export',
  'session-dashboard',
  'session-settings',
  'settings',
  'viewport',
]);

const intent = createDefaultIndicatorIntent();
assert.deepEqual(intent, {
  controlsEnabled: false,
  indicatorId: 'sma',
  inputs: { length: 20 },
  metadata: null,
  panePlacement: 'overlay',
  readOnly: true,
  sourceSeries: 'close',
  style: { color: '#4ea1ff', lineWidth: 2 },
  visible: true,
});
assert.equal(Object.isFrozen(intent), true);
assert.equal(Object.isFrozen(intent.inputs), true);
assert.equal(Object.isFrozen(intent.style), true);
assert.deepEqual(validateIndicatorIntent(intent), { errors: [], valid: true });

const custom = createDefaultIndicatorIntent({
  controlsEnabled: true,
  indicatorId: 'RSI',
  inputs: { length: 14 },
  metadata: { label: 'RSI 14' },
  panePlacement: 'separate',
  readOnly: false,
  sourceSeries: 'hlc3',
  style: { color: '#ffb020', lineWidth: 1 },
  visible: false,
});
assert.deepEqual(custom, {
  controlsEnabled: false,
  indicatorId: 'rsi',
  inputs: { length: 14 },
  metadata: { label: 'RSI 14' },
  panePlacement: 'separate',
  readOnly: true,
  sourceSeries: 'hlc3',
  style: { color: '#ffb020', lineWidth: 1 },
  visible: false,
});
assert.deepEqual(validateIndicatorIntent(custom), { errors: [], valid: true });

const invalid = validateIndicatorIntent({
  indicatorId: 'custom',
  inputs: ['bad'],
  metadata: ['bad'],
  panePlacement: 'floating',
  sourceSeries: 'spread',
  style: ['bad'],
  visible: 'yes',
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  ['indicatorId', 'sourceSeries', 'panePlacement', 'inputs', 'style', 'visible', 'metadata'],
);

assert.deepEqual(createIndicatorsContract(), {
  allowedFields: getIndicatorsAllowedFields(),
  allowedIds: getIndicatorsAllowedIds(),
  allowedPanePlacements: getIndicatorsAllowedPanePlacements(),
  allowedSourceSeries: getIndicatorsAllowedSourceSeries(),
  blockedIntegrations: getIndicatorsBlockedIntegrations(),
  calculationReady: false,
  commandSurfaceReady: false,
  customDefinitionsReady: false,
  intentReady: true,
  owner: 'indicators-runtime',
  paneCreationReady: false,
  persistenceReady: false,
  runtimeWiringReady: false,
  toolbarControlEnabled: false,
  writeReady: false,
});
assert.equal(Object.isFrozen(createIndicatorsContract()), true);
assert.match(selectionDoc, /Indicators Owner\s+Contract/);
assert.match(contractDoc, /Step 137 establishes the indicators owner contract/);
assert.match(contractDoc, /custom indicators and Pine Script execution are not supported/);
assert.match(contractDoc, /top-toolbar Indicators button remains disabled and inert/);
assert.match(contractDoc, /Dashboard visible row actions\s+remain Summary, Stats, Copy, and Journal/);
assert.match(docsIndex, /V6_INDICATORS_OWNER_CONTRACT\.md/);
assert.match(shellSource, /data-v6-top-indicators disabled/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'INDICATORS_COMMANDS',
  'ORDERS_COMMANDS',
  'REPLAY_COMMANDS',
  'SCREENSHOT_EXPORT_COMMANDS',
  'SESSION_SETTINGS_COMMANDS',
  'SETTINGS_COMMANDS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'createChart',
  'series.setData',
  'series.update',
  'setVisibleLogicalRange',
  'addLineSeries',
  'addHistogramSeries',
  'localStorage',
  'fetch(',
  'XMLHttpRequest',
]) {
  assert.equal(contractSource.includes(forbiddenToken), false, `indicators contract must not expose ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 indicators contract smoke passed');
