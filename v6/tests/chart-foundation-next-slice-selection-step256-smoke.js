import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP256.md');
const todo = await read('v6/TODO.md');
const latencySpec = await read('v6/docs/specs/replay-visible-latency.md');
const readinessAudit = await read('v6/docs/V6_REPLAY_CHART_READINESS_AUDIT.md');
const step255Doc = await read('v6/docs/V6_DATE_RANGE_BOUNDARY_ENTRY_REGRESSION_PACK_STEP255.md');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Visible K-Line Latency Regression Pack',
  'cache-hit visible candle latency',
  'mixed-timeframe visible latency',
  'manual-next HTF visible latency',
  'auto-play HTF visible latency',
  'replay-safe leftward history latency',
  'Replay runtime owns cursor/reveal state',
  'Chart-data runtime owns append/replace records',
  'Chart viewport owns visible-range projection intent',
  'Chart surface owns chart host application',
  'Bar-data runtime owns cache/request metadata',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const filename of [
  'visible-latency-domain-smoke.js',
  'visible-latency-cache-hit-browser-smoke.js',
  'mixed-timeframe-visible-latency-browser-smoke.js',
  'manual-next-htf-visible-latency-browser-step197-smoke.js',
  'auto-play-htf-visible-latency-browser-step199-smoke.js',
  'replay-safe-leftward-history-latency-browser-step187-smoke.js',
]) {
  assert.match(doc, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 256 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 257 - Visible K-Line Latency Regression Pack/);
assert.match(latencySpec, /V6 must not repeat the V5 K-line appearance delay problem/);
assert.match(latencySpec, /latencyMs = timestamp\(candle visible on chart\) - timestamp\(user replay input\)/);
assert.match(readinessAudit, /visible K-line delay/);
assert.match(readinessAudit, /visible-latency-cache-hit-browser-smoke.js/);
assert.match(readinessAudit, /mixed-timeframe-visible-latency-browser-smoke.js/);
assert.match(step255Doc, /Date Range \/ Loaded Boundary \/ Replay Entry Regression Pack/);

console.log('v6 chart foundation next slice selection step 256 smoke passed');
