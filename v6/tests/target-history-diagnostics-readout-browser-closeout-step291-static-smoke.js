import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_BROWSER_STEP291.md', 'utf8');
const browserSmoke = await readFile('v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js', 'utf8');
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');

assert.match(todo, /Step 291 - Target-History Diagnostics Readout Browser Regression/);
assert.match(todo, /Step 292 - Target-History Diagnostics Readout Fallback Browser Regression/);
assert.match(index, /V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_BROWSER_STEP291\.md/);
assert.match(doc, /activated high-timeframe leftward-history path/);
assert.match(doc, /path=target/);
assert.match(doc, /fallback reason `none`/);
assert.match(doc, /Step 292 should add the matching browser regression/);

assert.match(browserSmoke, /data-v6-target-history-diagnostics/);
assert.match(browserSmoke, /v6TargetHistoryDiagnosticsPath/);
assert.match(browserSmoke, /v6TargetHistoryDiagnosticsFallbackReason/);
assert.match(browserSmoke, /v6TargetHistoryDiagnosticsPrependedBars/);
assert.match(browserSmoke, /target-history-opt-in/);
assert.match(browserSmoke, /targetFetch\.tf, '8h'/);
assert.match(browserSmoke, /restoredSourceBarCount/);

assert.match(paneStatus, /CHART_HISTORY_EVENTS\.LEFT_EXTENSION_LOADED/);
assert.doesNotMatch(paneStatus, /fetchV4TargetBars|LOAD_TARGET_WINDOW|LOAD_WINDOW|dispatchCommand/);

console.log('v6 target history diagnostics readout browser closeout step291 static smoke passed');
