import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_STEP290.md', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const model = await readFile('v6/src/shell/target-history-diagnostics-readout-model.js', 'utf8');

assert.match(todo, /Step 290 - Target-History Diagnostics Readout/);
assert.match(todo, /Step 291 - Target-History Diagnostics Readout Browser Regression/);
assert.match(index, /V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_STEP290\.md/);
assert.match(doc, /chartHistory:leftExtensionLoaded/);
assert.match(doc, /presentation-only/);
assert.match(doc, /replay remains source-`1m` driven/);

assert.match(shell, /data-v6-target-history-diagnostics/);
assert.match(paneStatus, /CHART_HISTORY_EVENTS\.LEFT_EXTENSION_LOADED/);
assert.match(paneStatus, /createTargetHistoryDiagnosticsReadoutState/);
assert.match(model, /fallbackReason/);
assert.match(model, /targetRequestCount/);
assert.match(model, /sourceRequestCount/);
assert.match(model, /prependedBarCount/);

assert.doesNotMatch(paneStatus, /fetchV4TargetBars|LOAD_TARGET_WINDOW|LOAD_WINDOW|dispatchCommand/);
assert.doesNotMatch(model, /fetchV4TargetBars|LOAD_TARGET_WINDOW|LOAD_WINDOW|dispatchCommand/);

console.log('v6 target history diagnostics readout closeout step290 static smoke passed');
