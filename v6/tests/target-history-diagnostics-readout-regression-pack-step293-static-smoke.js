import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const successSmoke = await readFile('v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js', 'utf8');
const fallbackSmoke = await readFile('v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js', 'utf8');

const requiredMembers = [
  'target-history-diagnostics-readout-browser-step291-smoke.js',
  'target-history-diagnostics-readout-fallback-browser-step292-smoke.js',
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

console.log('v6 target history diagnostics readout regression pack step293 static smoke passed');
