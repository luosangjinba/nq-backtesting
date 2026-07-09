import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_PANE_IDENTITY_DISPLAY_TIMEFRAME_REVIEW_STEP202.md');
const index = await read('v6/docs/INDEX.md');
const paneModel = await read('v6/src/panes/pane-model.js');
const workstationShell = await read('v6/src/shell/workstation-shell.js');
const manualNext = await read('v6/src/chart-entry/chart-entry-manual-next-runtime.js');
const leftwardHistory = await read('v6/src/chart-history/leftward-history-extension-runtime.js');
const displayTimeframeRuntime = await read('v6/src/display-timeframe/display-timeframe-runtime.js');
const statusReadout = await read('v6/src/shell/pane-status-readout.js');
const regressionPack = await read('v6/tests/chart-browser-regression-pack.js');

[
  'pane-default',
  'main',
  'secondary',
  'tertiary',
  'active-pane fallback',
  'Step 203 Recommendation',
].forEach((text) => assert.equal(doc.includes(text), true));

assert.match(paneModel, /DEFAULT_PANE_ID\s*=\s*'pane-default'/);
[
  'data-v6-pane-id="main"',
  'data-v6-pane-id="secondary"',
  'data-v6-pane-id="tertiary"',
].forEach((text) => assert.equal(workstationShell.includes(text), true));

[
  manualNext,
  leftwardHistory,
].forEach((text) => {
  assert.equal(text.includes('PANE_COMMANDS.GET_BY_ID'), true);
  assert.equal(text.includes('PANE_COMMANDS.GET_ACTIVE'), true);
});

assert.equal(displayTimeframeRuntime.includes('PANE_COMMANDS.GET_BY_ID'), true);
assert.equal(displayTimeframeRuntime.includes('PANE_COMMANDS.GET_ACTIVE'), true);
assert.equal(statusReadout.includes('record.displayTimeframe || record.timeframe'), true);
assert.match(index, /V6_PANE_IDENTITY_DISPLAY_TIMEFRAME_REVIEW_STEP202\.md/);
assert.match(regressionPack, /pane-identity-display-timeframe-browser-step202-smoke\.js/);

console.log('v6 pane identity display timeframe review step 202 smoke passed');
