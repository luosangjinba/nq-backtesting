import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_AFTER_HANDOFF_STEP367.md',
  'utf8',
);
const browserSmoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-performance-after-handoff-browser-step367-smoke.js',
  'utf8',
);
const staticSmoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-performance-after-handoff-step367-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_AFTER_HANDOFF_STEP367\.md/);
assert.match(index, /measurement-only HTF leftward-extension browser coverage/);

assert.match(
  todo,
  /Latest completed HTF leftward extension performance measurement step:\s+Step 367/,
);
assert.match(todo, /### Step 368 - HTF Leftward Extension Bottleneck Owner Selection After Handoff Measurement/);
assert.match(todo, /### Step 367 - HTF Leftward Extension Performance Measurement After Runtime Handoff/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /measurement-only/);
assert.match(doc, /`4h`, `8h`, `1D`, and\s+`1W`/);
assert.match(doc, /Observed Step 367 Run/);
assert.match(doc, /largest measured bucket was the test-only two-frame browser\s+paint observation window/);
assert.match(doc, /Step 368 should consume the Step 367 phase summary/);
assert.match(doc, /Do not start a runtime optimization before the owner selection is explicit/);

for (const pattern of [
  /label: '4h'[\s\S]*targetTimeframe: 240/,
  /label: '8h'[\s\S]*targetTimeframe: 480/,
  /label: '1D'[\s\S]*targetTimeframe: '1D'/,
  /label: '1W'[\s\S]*targetTimeframe: '1W'/,
  /sourceRequestMs/,
  /targetRequestMs/,
  /chartDataReplacementMs/,
  /viewportReapplyMs/,
  /visibleApplyLagMs/,
  /browserPaintLagMs/,
  /runtimeDurationMs/,
  /JSON\.stringify\(\{/,
]) {
  assert.match(browserSmoke, pattern);
}

assert.match(staticSmoke, /handoff-registration/);
assert.match(staticSmoke, /runtime\.replay-coordination-materialization-handoff/);
assert.doesNotMatch(browserSmoke, /registerCommand|registerRuntime|UPDATE_SNAPSHOT/);

console.log('v6 high timeframe leftward extension performance after handoff closeout step367 static smoke passed');
