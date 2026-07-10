import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_PERFORMANCE_OBSERVABILITY_STEP288.md', 'utf8');
const runtime = await readFile('v6/src/chart-history/leftward-history-extension-runtime.js', 'utf8');
const browserSmoke = await readFile('v6/tests/activated-target-history-browser-step287-smoke.js', 'utf8');

assert.match(todo, /Step 288 - Activated Target-History Performance Observability/);
assert.match(todo, /Step 289 - Target-History Optimization Decision/);
assert.match(todo, /duration,\s+path,\s+target\/source request counts/);
assert.match(index, /V6_TARGET_HISTORY_PERFORMANCE_OBSERVABILITY_STEP288\.md/);

for (const field of [
  'durationMs',
  'targetRequestCount',
  'targetLoadMs',
  'targetBarCount',
  'sourceRequestCount',
  'sourceLoadMs',
  'prependedBarCount',
  'fallbackReason',
]) {
  assert.match(doc, new RegExp(field));
  assert.match(runtime, new RegExp(field));
}

assert.match(browserSmoke, /diagnostics\.path, 'target-history'/);
assert.match(browserSmoke, /diagnostics\.targetLoadMs/);
assert.match(browserSmoke, /diagnostics\.prependedBarCount/);

console.log('v6 target history observability closeout step288 static smoke passed');
