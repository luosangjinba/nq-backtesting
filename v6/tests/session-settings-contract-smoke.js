import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createDefaultSessionSettingsDraft,
  createSessionSettingsContract,
  getSessionSettingsAllowedFields,
  getSessionSettingsBlockedIntegrations,
  getSessionSettingsFieldGroups,
  getSessionSettingsOwner,
  validateSessionSettingsDraft,
} from '../src/session-settings/session-settings-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contractSource = await readFile('v6/src/session-settings/session-settings-contract.js', 'utf8');
const contractDoc = await readFile('v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md', 'utf8');
const docsIndex = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(getSessionSettingsOwner(), 'session-settings-runtime');
assert.deepEqual(getSessionSettingsFieldGroups(), [
  { id: 'sessionInfo', label: 'Session Info', fields: ['name', 'profileId'] },
  { id: 'balanceAssets', label: 'Balance & Assets', fields: ['balance', 'asset'] },
  { id: 'spreadsCommissions', label: 'Spreads & Commissions', fields: ['spread', 'commission'] },
  { id: 'dateRange', label: 'Date Range', fields: ['startTime', 'endTime'] },
]);
assert.deepEqual(getSessionSettingsAllowedFields(), [
  'name',
  'profileId',
  'balance',
  'asset',
  'spread',
  'commission',
  'startTime',
  'endTime',
]);
assert.deepEqual(getSessionSettingsBlockedIntegrations(), [
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
  'settings',
  'viewport',
]);

const draft = createDefaultSessionSettingsDraft();
assert.deepEqual(draft, {
  asset: 'USD',
  balance: null,
  commission: 0,
  controlsEnabled: false,
  endTime: null,
  name: 'Backtesting session',
  profileId: 'default-profile',
  readOnly: true,
  spread: 0,
  startTime: null,
});
assert.equal(Object.isFrozen(draft), true);
assert.deepEqual(validateSessionSettingsDraft(draft), { errors: [], valid: true });

const custom = createDefaultSessionSettingsDraft({
  asset: 'EUR',
  balance: '250000',
  commission: '1.5',
  controlsEnabled: true,
  endTime: '2026-06-02T16:00:00-04:00',
  name: 'London review',
  profileId: 'fx-profile',
  readOnly: false,
  spread: '0.4',
  startTime: '2026-06-02T09:30:00-04:00',
});
assert.deepEqual(custom, {
  asset: 'EUR',
  balance: 250000,
  commission: 1.5,
  controlsEnabled: false,
  endTime: '2026-06-02T20:00:00.000Z',
  name: 'London review',
  profileId: 'fx-profile',
  readOnly: true,
  spread: 0.4,
  startTime: '2026-06-02T13:30:00.000Z',
});
assert.deepEqual(validateSessionSettingsDraft(custom), { errors: [], valid: true });

const invalid = validateSessionSettingsDraft({
  asset: '',
  balance: -1,
  commission: Number.NaN,
  endTime: '2026-06-02T09:30:00Z',
  name: '',
  profileId: '',
  spread: -0.1,
  startTime: '2026-06-02T10:00:00Z',
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  ['name', 'profileId', 'asset', 'balance', 'spread', 'commission', 'endTime'],
);

assert.deepEqual(createSessionSettingsContract(), {
  allowedFields: getSessionSettingsAllowedFields(),
  blockedIntegrations: getSessionSettingsBlockedIntegrations(),
  commandSurfaceReady: false,
  fieldGroups: getSessionSettingsFieldGroups(),
  owner: 'session-settings-runtime',
  panelControlsEnabled: false,
  persistenceReady: false,
  readOnlyDraftReady: true,
  runtimeWiringReady: false,
  writeReady: false,
});
assert.equal(Object.isFrozen(createSessionSettingsContract()), true);
assert.match(contractDoc, /Step 133 establishes the session-settings owner contract/);
assert.match(contractDoc, /right-rail Session settings panel remains a disabled shell-owned\s+placeholder/);
assert.match(contractDoc, /Dashboard visible row actions remain Summary, Stats, Copy, and Journal/);
assert.match(docsIndex, /V6_SESSION_SETTINGS_OWNER_CONTRACT\.md/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'ORDERS_COMMANDS',
  'REPLAY_COMMANDS',
  'SESSION_COMMANDS',
  'SETTINGS_COMMANDS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'localStorage',
  'fetch(',
  'XMLHttpRequest',
]) {
  assert.equal(contractSource.includes(forbiddenToken), false, `session settings contract must not expose ${forbiddenToken}`);
}

assert.deepEqual(getVisibleRecentSessionRowActions().map((action) => action.id), ['summary', 'analytics', 'copy', 'journal']);

console.log('v6 session settings contract smoke passed');
