import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RUNTIME_OPTIMIZATION_PROBE_STEP313.md', 'utf8');
const probe = await readFile('v6/tests/governance/helpers/chart-history/high-timeframe-target-history-runtime-optimization-probe.js', 'utf8');
const smoke = await readFile('v6/tests/high-timeframe-target-history-runtime-optimization-probe-step313-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_RUNTIME_OPTIMIZATION_PROBE_STEP313\.md/);
assert.match(todo, /Latest completed target-TF optimization probe step: Step 313/);
assert.match(todo, /### Step 314 - High-Timeframe Target-History Browser Phase Timing Probe/);

assert.match(doc, /fetch/);
assert.match(doc, /chart-data-replacement/);
assert.match(doc, /viewport-reapply/);
assert.match(doc, /browser-visible-apply-lag/);
assert.match(doc, /browser phase-timing probe/);
assert.match(doc, /Runtime behavior should still remain/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(probe, /createHighTimeframeTargetHistoryResponsivenessBudgetReport/);
assert.match(probe, /createHighTimeframeTargetHistoryRuntimeOptimizationProbe/);
assert.match(probe, /chartDataReplacementMs/);
assert.match(probe, /viewportReapplyMs/);
assert.match(probe, /applyLagMs/);
assert.match(probe, /target-history-runtime-optimization-dominant-phase-found/);
assert.match(probe, /target-history-runtime-optimization-not-needed/);
assert.match(probe, /target-history-runtime-optimization-measurement-incomplete/);

assert.match(smoke, /target-history-fetch-optimization/);
assert.match(smoke, /target-history-chart-data-replacement-optimization/);
assert.match(smoke, /target-history-viewport-reapply-optimization/);
assert.match(smoke, /target-history-browser-visible-apply-lag-optimization/);
assert.match(smoke, /replay-coordination-materialization-transition/);

console.log('v6 high timeframe target history runtime optimization probe closeout step313 static smoke passed');
