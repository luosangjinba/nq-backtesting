import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createDefaultDrawingIntent,
  createDrawingActionHistoryContract,
  getActionHistoryAllowedFields,
  getActionHistoryAllowedTypes,
  getDrawingActionHistoryBlockedIntegrations,
  getDrawingActionHistoryOwner,
  getDrawingAllowedFields,
  getDrawingAllowedToolIds,
  validateDrawingIntent,
} from '../src/drawing-action-history/drawing-action-history-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contractSource = await readFile('v6/src/drawing-action-history/drawing-action-history-contract.js', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md', 'utf8');

assert.equal(getDrawingActionHistoryOwner(), 'drawing-action-history-runtime');
assert.deepEqual(getDrawingAllowedToolIds(), ['cursor', 'trend-line', 'horizontal-line', 'rectangle', 'measure', 'text']);
assert.deepEqual(getDrawingAllowedFields(), [
  'toolId',
  'anchorPoints',
  'targetPane',
  'style',
  'label',
  'visible',
  'metadata',
]);
assert.deepEqual(getActionHistoryAllowedFields(), ['actionId', 'actionType', 'target', 'timestamp', 'metadata']);
assert.deepEqual(getActionHistoryAllowedTypes(), ['create-drawing', 'update-drawing', 'delete-drawing']);
assert.deepEqual(getDrawingActionHistoryBlockedIntegrations(), [
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'default-wall',
  'display-timeframe',
  'indicators',
  'orders',
  'replay',
  'screenshot-export',
  'session-dashboard',
  'session-settings',
  'settings',
  'viewport',
]);

const intent = createDefaultDrawingIntent();
assert.deepEqual(intent, {
  anchorPoints: [],
  controlsEnabled: false,
  label: '',
  metadata: null,
  readOnly: true,
  style: { color: '#f5c542', lineWidth: 1 },
  targetPane: 'main',
  toolId: 'cursor',
  visible: true,
});
assert.equal(Object.isFrozen(intent), true);
assert.equal(Object.isFrozen(intent.anchorPoints), true);
assert.equal(Object.isFrozen(intent.style), true);
assert.deepEqual(validateDrawingIntent(intent), { errors: [], valid: true });

const custom = createDefaultDrawingIntent({
  anchorPoints: [{ price: 101.25, time: '2026-06-02T13:30:00.000Z' }],
  controlsEnabled: true,
  label: 'London open',
  metadata: { sessionId: 'v6-session-0001' },
  readOnly: false,
  style: { color: '#ffb020', lineWidth: 2 },
  targetPane: 'main',
  toolId: 'trend-line',
  visible: false,
});
assert.deepEqual(custom, {
  anchorPoints: [{ price: 101.25, time: '2026-06-02T13:30:00.000Z' }],
  controlsEnabled: false,
  label: 'London open',
  metadata: { sessionId: 'v6-session-0001' },
  readOnly: true,
  style: { color: '#ffb020', lineWidth: 2 },
  targetPane: 'main',
  toolId: 'trend-line',
  visible: false,
});
assert.deepEqual(validateDrawingIntent(custom), { errors: [], valid: true });

const invalid = validateDrawingIntent({
  anchorPoints: [{ price: Number.NaN, time: '' }],
  label: 7,
  metadata: ['bad'],
  style: ['bad'],
  targetPane: '',
  toolId: 'fibonacci',
  visible: 'yes',
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  ['toolId', 'anchorPoints', 'targetPane', 'style', 'label', 'visible', 'metadata'],
);

assert.deepEqual(createDrawingActionHistoryContract(), {
  actionHistoryAllowedFields: getActionHistoryAllowedFields(),
  actionHistoryAllowedTypes: getActionHistoryAllowedTypes(),
  actionHistoryReady: false,
  blockedIntegrations: getDrawingActionHistoryBlockedIntegrations(),
  commandSurfaceReady: false,
  drawingAllowedFields: getDrawingAllowedFields(),
  drawingAllowedToolIds: getDrawingAllowedToolIds(),
  drawingCreationReady: false,
  intentReady: true,
  owner: 'drawing-action-history-runtime',
  overlayWriteReady: false,
  paneMutationReady: false,
  persistenceReady: false,
  railControlsEnabled: false,
  runtimeWiringReady: false,
  undoRedoEnabled: false,
  writeReady: false,
});
assert.equal(Object.isFrozen(createDrawingActionHistoryContract()), true);
assert.match(selectionDoc, /Drawing\/Action-History Owner\s+Contract/);
assert.match(shellSource, /data-v6-left-drawing-tool="cursor" disabled/);
assert.match(shellSource, /data-v6-top-undo disabled/);
assert.match(shellSource, /data-v6-top-redo disabled/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'DRAWING_ACTION_HISTORY_COMMANDS',
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
  assert.equal(contractSource.includes(forbiddenToken), false, `drawing action history contract must not expose ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 drawing action history contract smoke passed');
