import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_SESSION_AWARE_HTF_SELECTION_STEP266.md', 'utf8');
const normalizedDoc = doc.replace(/\s+/g, ' ');
const todo = await readFile('v6/TODO.md', 'utf8');
const capabilities = await readFile('v6/src/display-timeframe/display-timeframe-capabilities.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');

assert.match(doc, /introduce a focused `session-calendar` boundary/);
assert.match(doc, /`session-calendar` owns trading day\/week\/month bucket boundaries/);
assert.match(doc, /`chart-data-projection` owns OHLC aggregation/);
assert.match(doc, /`replay` remains source-bar driven/);
assert.match(normalizedDoc, /must not enable daily, weekly, or monthly menu items/);
assert.match(doc, /Step 267 - Session Calendar Boundary/);
assert.match(doc, /Step 268 - Daily Projection/);
assert.match(doc, /Step 269 - Weekly Projection/);
assert.match(doc, /Step 270 - Monthly Projection/);
assert.match(todo, /Step 266 - Session-Aware Higher Timeframe Selection/);

for (const id of ['1D', '1W', '1M']) {
  const pattern = new RegExp(`id: '${id}'[\\s\\S]*?projectionMode: 'session-aware'[\\s\\S]*?status: 'planned'`);
  assert.match(capabilities, pattern);
}

assert.equal(shell.includes('Globex'), false);
assert.equal(shell.includes('trading day'), false);
assert.equal(projectionDomain.includes('Globex'), false);
assert.equal(projectionDomain.includes('trading week'), false);

console.log('v6 session-aware HTF selection step266 static smoke passed');
