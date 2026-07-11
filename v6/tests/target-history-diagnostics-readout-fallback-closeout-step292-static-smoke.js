import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_FALLBACK_BROWSER_STEP292.md', 'utf8');
const browserSmoke = await readFile('v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js', 'utf8');
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');

assert.match(todo, /Step 292 - Target-History Diagnostics Readout Fallback Browser Regression/);
assert.match(todo, /Step 293 - Target-History Diagnostics Readout Regression Pack/);
assert.match(index, /V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_FALLBACK_BROWSER_STEP292\.md/);
assert.match(doc, /target-history-empty/);
assert.match(doc, /target-history-fallback-source-window/);
assert.match(doc, /Step 293 should consolidate/);

assert.match(browserSmoke, /data-v6-target-history-diagnostics/);
assert.match(browserSmoke, /bars: \[\]/);
assert.match(browserSmoke, /target-history-empty/);
assert.match(browserSmoke, /target-history-fallback-source-window/);
assert.match(browserSmoke, /v6TargetHistoryDiagnosticsFallbackReason/);
assert.match(browserSmoke, /sourceFetchAfterTarget/);
assert.match(browserSmoke, /restoredSourceBarCount/);

assert.match(paneStatus, /CHART_HISTORY_EVENTS\.LEFT_EXTENSION_LOADED/);
assert.doesNotMatch(paneStatus, /fetchV4TargetBars|LOAD_TARGET_WINDOW|LOAD_WINDOW|dispatchCommand/);

console.log('v6 target history diagnostics readout fallback closeout step292 static smoke passed');
