import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createChartControlBridgeContract,
  getChartControlBridges,
} from '../src/chart-engine/chart-control-bridge-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contract = createChartControlBridgeContract();
const auditDoc = await readFile('v6/docs/V6_CHART_CONTROL_BRIDGE_BROWSER_REGRESSION_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const manualBrowserSmoke = await readFile('v6/tests/workstation-native-manual-wall-input-browser-smoke.js', 'utf8');
const resetBrowserSmoke = await readFile('v6/tests/chart-reset-view-browser-smoke.js', 'utf8');

assert.equal(indexDoc.includes('V6_CHART_CONTROL_BRIDGE_BROWSER_REGRESSION_AUDIT.md'), true);
assert.match(auditDoc, /Step 106 should re-audit dashboard row-action isolation/);
assert.match(auditDoc, /workstation-native-manual-wall-input-browser-smoke\.js/);
assert.match(auditDoc, /chart-reset-view-browser-smoke\.js/);
assert.match(auditDoc, /Dashboard row action visibility now includes Summary, Stats, Copy, and Journal/);

assert.deepEqual(getChartControlBridges(), [
  'manual-wall-input-bridge',
  'reset-view-control-bridge',
]);
assert.equal(contract.commandPolicy, 'viewport-commands-only');
assert.equal(contract.canDispatchViewportCommands, true);
assert.equal(contract.canWriteSeriesData, false);
assert.equal(contract.canFetchBars, false);
assert.equal(contract.canAdvanceReplay, false);
assert.equal(contract.canLoadSession, false);
assert.equal(contract.canOwnDashboardRowActions, false);

assert.equal(manualBrowserSmoke.includes('__v6ManualWallInputBridge?.destroy'), true);
assert.equal(manualBrowserSmoke.includes('Input.dispatchMouseEvent'), true);
assert.equal(manualBrowserSmoke.includes("value.manual.intent.origin, 'manual'"), true);
assert.equal(manualBrowserSmoke.includes('setup.hostRect.width > 0'), true);
assert.equal(manualBrowserSmoke.includes('setup.hostRect.height > 0'), true);
assert.equal(manualBrowserSmoke.includes('CHART_VIEWPORT_COMMANDS.GET_PANE'), true);
assert.equal(manualBrowserSmoke.includes('__v6WorkstationChartSurface.getState()'), true);

assert.equal(resetBrowserSmoke.includes('__v6ResetViewControl?.resetView'), true);
assert.equal(resetBrowserSmoke.includes("[data-v6-reset-view]"), true);
assert.equal(resetBrowserSmoke.includes("value.manual.intent.origin, 'manual'"), true);
assert.equal(resetBrowserSmoke.includes("value.reset.intent.origin, 'default'"), true);
assert.equal(resetBrowserSmoke.includes('value.chartAfterResetCount, value.chartBeforeResetCount'), true);
assert.equal(resetBrowserSmoke.includes('value.replayAfterReset, value.replayBeforeReset'), true);

for (const source of [manualBrowserSmoke, resetBrowserSmoke]) {
  for (const forbiddenToken of [
    'BAR_DATA_COMMANDS.LOAD_WINDOW',
    'REPLAY_COMMANDS.NEXT',
    'SESSION_COMMANDS.OPEN',
    'ORDER_COMMANDS',
    'JOURNAL_COMMANDS',
    'CALENDAR_COMMANDS',
    'fetch(',
    'XMLHttpRequest',
  ]) {
    assert.equal(source.includes(forbiddenToken), false, `browser control bridge smoke must not use ${forbiddenToken}`);
  }
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 chart control bridge browser regression audit smoke passed');
