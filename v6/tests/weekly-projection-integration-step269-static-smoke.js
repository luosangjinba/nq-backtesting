import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_WEEKLY_PROJECTION_INTEGRATION_STEP269.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const sessionCalendar = await readFile('v6/src/session-calendar/session-calendar-domain.js', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const capabilities = await readFile('v6/src/display-timeframe/display-timeframe-capabilities.js', 'utf8');

assert.match(doc, /enables `1W` display projection/);
assert.match(doc, /Consume `resolveTradingWeekBucket\(\)` from `session-calendar`/);
assert.match(doc, /requires an instrument/);
assert.match(doc, /emits OHLC bars at the trading week bucket start timestamp/);
assert.match(doc, /never creates synthetic OHLC bars/);
assert.match(doc, /`1M` remains planned\/disabled/);
assert.match(doc, /`replay` remains source-bar driven/);
assert.match(todo, /Step 269 - Weekly Projection Integration/);
assert.match(index, /V6_WEEKLY_PROJECTION_INTEGRATION_STEP269/);
assert.match(sessionCalendar, /resolveTradingWeekBucket/);
assert.match(projectionDomain, /resolveTradingWeekBucket/);
assert.match(projectionDomain, /targetTimeframe: '1W'/);
assert.match(capabilities, /id: '1W'[\s\S]*?status: 'planned'/);
assert.match(capabilities, /id: '1M'[\s\S]*?status: 'planned'/);

console.log('v6 weekly projection integration step269 static smoke passed');
