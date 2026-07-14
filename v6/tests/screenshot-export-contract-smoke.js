import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createDefaultScreenshotExportIntent,
  createScreenshotExportContract,
  getScreenshotExportAllowedFields,
  getScreenshotExportAllowedFormats,
  getScreenshotExportAllowedSurfaces,
  getScreenshotExportBlockedIntegrations,
  getScreenshotExportOwner,
  validateScreenshotExportIntent,
} from '../src/screenshot-export/screenshot-export-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contractSource = await readFile('v6/src/screenshot-export/screenshot-export-contract.js', 'utf8');
const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md', 'utf8');
const contractDoc = await readFile('v6/docs/V6_SCREENSHOT_EXPORT_OWNER_CONTRACT.md', 'utf8');
const docsIndex = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(getScreenshotExportOwner(), 'screenshot-export-runtime');
assert.deepEqual(getScreenshotExportAllowedFields(), [
  'sourceSurface',
  'format',
  'filename',
  'width',
  'height',
  'background',
  'metadata',
]);
assert.deepEqual(getScreenshotExportAllowedFormats(), ['png', 'jpeg']);
assert.deepEqual(getScreenshotExportAllowedSurfaces(), ['workstation', 'chart']);
assert.deepEqual(getScreenshotExportBlockedIntegrations(), [
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'default-wall',
  'display-timeframe',
  'orders',
  'replay',
  'session-dashboard',
  'session-settings',
  'settings',
  'viewport',
]);

const intent = createDefaultScreenshotExportIntent();
assert.deepEqual(intent, {
  background: 'transparent',
  controlsEnabled: false,
  filename: 'v6-workstation',
  format: 'png',
  height: null,
  metadata: null,
  readOnly: true,
  sourceSurface: 'workstation',
  width: null,
});
assert.equal(Object.isFrozen(intent), true);
assert.deepEqual(validateScreenshotExportIntent(intent), { errors: [], valid: true });

const custom = createDefaultScreenshotExportIntent({
  background: '#101820',
  controlsEnabled: true,
  filename: 'London AM',
  format: 'JPEG',
  height: '720',
  metadata: { sessionId: 'v6-session-0001', symbol: 'NQ' },
  readOnly: false,
  sourceSurface: 'chart',
  width: '1280',
});
assert.deepEqual(custom, {
  background: '#101820',
  controlsEnabled: false,
  filename: 'London AM',
  format: 'jpeg',
  height: 720,
  metadata: { sessionId: 'v6-session-0001', symbol: 'NQ' },
  readOnly: true,
  sourceSurface: 'chart',
  width: 1280,
});
assert.deepEqual(validateScreenshotExportIntent(custom), { errors: [], valid: true });

const invalid = validateScreenshotExportIntent({
  background: '',
  filename: '',
  format: 'gif',
  height: 0,
  metadata: ['bad'],
  sourceSurface: 'pane',
  width: -1,
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  ['sourceSurface', 'format', 'filename', 'width', 'height', 'background', 'metadata'],
);

assert.deepEqual(createScreenshotExportContract(), {
  allowedFields: getScreenshotExportAllowedFields(),
  allowedFormats: getScreenshotExportAllowedFormats(),
  allowedSurfaces: getScreenshotExportAllowedSurfaces(),
  blockedIntegrations: getScreenshotExportBlockedIntegrations(),
  commandSurfaceReady: false,
  intentReady: true,
  owner: 'screenshot-export-runtime',
  persistenceReady: false,
  runtimeWiringReady: false,
  toolbarControlEnabled: false,
  writeReady: false,
});
assert.equal(Object.isFrozen(createScreenshotExportContract()), true);
assert.match(selectionDoc, /Screenshot\/Export Owner\s+Contract/);
assert.match(contractDoc, /Step 135 establishes the screenshot\/export owner contract/);
assert.match(contractDoc, /top-toolbar Screenshot button remains disabled and inert/);
assert.match(contractDoc, /Dashboard visible\s+row actions remain Summary, Stats, Copy, and Journal/);
assert.match(docsIndex, /V6_SCREENSHOT_EXPORT_OWNER_CONTRACT\.md/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'ORDERS_COMMANDS',
  'REPLAY_COMMANDS',
  'SESSION_SETTINGS_COMMANDS',
  'SCREENSHOT_EXPORT_COMMANDS',
  'SETTINGS_COMMANDS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'captureScreenshot',
  'toDataURL',
  'toBlob',
  'createObjectURL',
  'localStorage',
  'fetch(',
  'XMLHttpRequest',
]) {
  assert.equal(contractSource.includes(forbiddenToken), false, `screenshot export contract must not expose ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 screenshot export contract smoke passed');
