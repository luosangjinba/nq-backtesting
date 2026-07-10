import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_SESSION_AWARE_HTF_SELECTION_STEP266.md', 'utf8');
const capabilities = await readFile('v6/src/display-timeframe/display-timeframe-capabilities.js', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const runtime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const menuSmoke = await readFile('v6/tests/timeframe-menu-parity-browser-smoke.js', 'utf8');

for (const helper of [
  'trading day key',
  'trading day bucket start/end',
  'trading week key/start',
  'trading month key/start',
]) {
  assert.match(doc, new RegExp(helper));
}

assert.match(
  capabilities,
  /id: '1D'[\s\S]*?projectionMode: 'session-aware'[\s\S]*?status: 'enabled'[\s\S]*?unit: 'day'/,
);
assert.match(
  capabilities,
  /id: '1W'[\s\S]*?projectionMode: 'session-aware'[\s\S]*?status: 'enabled'[\s\S]*?unit: 'week'/,
);
assert.match(
  capabilities,
  /id: '1M'[\s\S]*?projectionMode: 'session-aware'[\s\S]*?sourceRequirement: 'session-calendar'[\s\S]*?status: 'planned'[\s\S]*?unit: 'month'/,
);

assert.match(menuSmoke, /plannedIds, \['1M'\]/);
assert.match(projectionDomain, /normalizeMinuteTimeframe\(targetTimeframe/);
assert.match(projectionDomain, /resolveDisplayBucketStart/);
assert.match(projectionDomain, /resolveTradingDayBucket/);
assert.match(projectionDomain, /resolveTradingWeekBucket/);
assert.equal(runtime.includes('session-calendar'), false);
assert.equal(runtime.includes('targetTimeframe: displayTimeframe'), true);

console.log('v6 session-aware HTF readiness step266 smoke passed');
