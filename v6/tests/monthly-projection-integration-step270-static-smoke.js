import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_MONTHLY_PROJECTION_INTEGRATION_STEP270.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const sessionCalendar = await readFile('v6/src/session-calendar/session-calendar-domain.js', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const capabilities = await readFile('v6/src/display-timeframe/display-timeframe-capabilities.js', 'utf8');

assert.match(doc, /enables `1M` display projection/);
assert.match(doc, /Consume `resolveTradingMonthBucket\(\)` from `session-calendar`/);
assert.match(doc, /requires an instrument/);
assert.match(doc, /emits OHLC bars at the trading month bucket start timestamp/);
assert.match(doc, /never creates synthetic OHLC bars/);
assert.match(doc, /`replay` remains source-bar driven/);
assert.match(todo, /Step 270 - Monthly Projection Integration/);
assert.match(index, /V6_MONTHLY_PROJECTION_INTEGRATION_STEP270/);
assert.match(sessionCalendar, /resolveTradingMonthBucket/);
assert.match(projectionDomain, /resolveTradingMonthBucket/);
assert.match(projectionDomain, /targetTimeframe: '1M'/);
assert.match(capabilities, /id: '1M'[\s\S]*?status: 'enabled'/);

console.log('v6 monthly projection integration step270 static smoke passed');
