import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_DAILY_PROJECTION_INTEGRATION_STEP268.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const step267 = await readFile('v6/docs/V6_SESSION_CALENDAR_BOUNDARY_STEP267.md', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const capabilities = await readFile('v6/src/display-timeframe/display-timeframe-capabilities.js', 'utf8');

assert.match(doc, /enables `1D` display projection/);
assert.match(doc, /Consume `resolveTradingDayBucket\(\)` from `session-calendar`/);
assert.match(doc, /requires an instrument/);
assert.match(doc, /emits OHLC bars at the trading day bucket start timestamp/);
assert.match(doc, /never creates synthetic OHLC bars/);
assert.match(doc, /`1W` and `1M` remain planned\/disabled/);
assert.match(doc, /`replay` remains source-bar driven/);
assert.match(step267, /resolveTradingDayBucket/);
assert.match(todo, /Step 268 - Daily Projection Integration/);
assert.match(projectionDomain, /resolveTradingDayBucket/);
assert.match(projectionDomain, /targetTimeframe: '1D'/);
assert.match(capabilities, /id: '1D'[\s\S]*?status: 'enabled'/);
assert.match(capabilities, /id: '1W'[\s\S]*?status: 'enabled'/);
assert.match(capabilities, /id: '1M'[\s\S]*?status: 'planned'/);

console.log('v6 daily projection integration step268 static smoke passed');
