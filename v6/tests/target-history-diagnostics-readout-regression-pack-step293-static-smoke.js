import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const successSmoke = await readFile('v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js', 'utf8');
const fallbackSmoke = await readFile('v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js', 'utf8');
const dailySmoke = await readFile('v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js', 'utf8');
const dailyFallbackSmoke = await readFile('v6/tests/daily-target-history-fallback-browser-step301-smoke.js', 'utf8');
const weeklySmoke = await readFile('v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js', 'utf8');
const weeklyFallbackSmoke = await readFile('v6/tests/weekly-target-history-fallback-browser-step304-smoke.js', 'utf8');

const requiredMembers = [
  'target-history-diagnostics-readout-browser-step291-smoke.js',
  'target-history-diagnostics-readout-fallback-browser-step292-smoke.js',
  'daily-target-history-request-sizing-browser-step298-smoke.js',
  'daily-target-history-fallback-browser-step301-smoke.js',
  'weekly-target-history-request-sizing-browser-step303-smoke.js',
  'weekly-target-history-fallback-browser-step304-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(pack, /const TESTS = Object\.freeze/);
assert.match(pack, /\[target-history-readout-pack\] start/);
assert.match(pack, /\[target-history-readout-pack\] passed/);
assert.match(pack, /break;/);
assert.match(pack, /process\.exit\(failed\.code \|\| 1\)/);

assert.match(successSmoke, /v6TargetHistoryDiagnosticsPath/);
assert.match(successSmoke, /target-history-opt-in/);
assert.match(successSmoke, /Fallback reason: none/);
assert.match(fallbackSmoke, /v6TargetHistoryDiagnosticsFallbackReason/);
assert.match(fallbackSmoke, /target-history-empty/);
assert.match(fallbackSmoke, /target-history-fallback-source-window/);
assert.match(dailySmoke, /targetFetch\.tf, '1D'/);
assert.match(dailySmoke, /session-aware-policy-sized/);
assert.match(dailySmoke, /restoredSourceBarCount/);
assert.match(dailyFallbackSmoke, /targetFetch\.tf, '1D'/);
assert.match(dailyFallbackSmoke, /target-history-empty/);
assert.match(dailyFallbackSmoke, /target-history-fallback-source-window/);
assert.match(dailyFallbackSmoke, /session-aware-policy-sized/);
assert.match(dailyFallbackSmoke, /restoredSourceBarCount/);
assert.match(weeklySmoke, /targetFetch\.tf, '1W'/);
assert.match(weeklySmoke, /session-aware-policy-sized/);
assert.match(weeklySmoke, /requestSizing\.targetDisplayBars, 4/);
assert.match(weeklySmoke, /requestSizing\.policy\.prefetchSourceBars, 40000/);
assert.match(weeklySmoke, /restoredSourceBarCount/);
assert.match(weeklyFallbackSmoke, /targetFetch\.tf, '1W'/);
assert.match(weeklyFallbackSmoke, /target-history-empty/);
assert.match(weeklyFallbackSmoke, /target-history-fallback-source-window/);
assert.match(weeklyFallbackSmoke, /requestSizing\.targetDisplayBars, 4/);
assert.match(weeklyFallbackSmoke, /requestSizing\.policy\.prefetchSourceBars, 40000/);
assert.match(weeklyFallbackSmoke, /restoredSourceBarCount/);

console.log('v6 target history diagnostics readout regression pack step293 static smoke passed');
