import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_VISIBLE_KLINE_LATENCY_REGRESSION_PACK_STEP257.md');
const pack = await read('v6/tests/visible-kline-latency-regression-pack-step257-smoke.js');
const todo = await read('v6/TODO.md');
const selection = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP256.md');
const latencySpec = await read('v6/docs/specs/replay-visible-latency.md');

const requiredMembers = [
  'visible-latency-domain-smoke.js',
  'visible-latency-cache-hit-browser-smoke.js',
  'mixed-timeframe-visible-latency-browser-smoke.js',
  'manual-next-htf-visible-latency-browser-step197-smoke.js',
  'auto-play-htf-visible-latency-browser-step199-smoke.js',
  'replay-safe-leftward-history-latency-browser-step187-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Visible K-Line Latency Regression Pack',
  'Cache-hit replay command paths keep the next visible candle inside the',
  'Mixed timeframe panes keep visible candle projection inside the latency',
  'Manual-next HTF projection remains visible after user input',
  'Auto-play HTF projection remains visible while timer-driven replay advances',
  'Replay-safe leftward history latency keeps manual-next responsive',
  'The domain trace keeps one shared latency vocabulary',
  'No runtime behavior changes were made',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(selection, /Step 257 should implement \*\*Visible K-Line Latency Regression Pack/);
assert.match(todo, /Step 257 - Visible K-Line Latency Regression Pack/);
assert.match(todo, /Step 258 - Chart Foundation Next Slice Selection/);
assert.match(latencySpec, /V6 must not repeat the V5 K-line appearance delay problem/);
assert.match(pack, /\[visible-kline-latency-pack\] start/);
assert.match(pack, /\[visible-kline-latency-pack\] passed/);

console.log('v6 visible kline latency regression pack step 257 static smoke passed');
