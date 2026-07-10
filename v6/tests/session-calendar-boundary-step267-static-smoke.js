import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_SESSION_CALENDAR_BOUNDARY_STEP267.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const step266 = await readFile('v6/docs/V6_SESSION_AWARE_HTF_SELECTION_STEP266.md', 'utf8');

for (const token of [
  '`session-calendar` domain boundary',
  '`NQ`',
  '`ES`',
  '`2026-05-31T18:00:00Z` belongs to trading day `2026-06-01`',
  '`2026-06-01T17:59:00Z` still belongs to trading day `2026-06-01`',
  '`2026-06-01T18:00:00Z` belongs to trading day `2026-06-02`',
  'Unsupported instruments should fail explicitly',
  'getTradingDayKey',
  'resolveTradingDayBucket',
  'resolveTradingWeekBucket',
  'resolveTradingMonthBucket',
]) {
  assert.match(doc, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(doc, /must not enable `1D`, `1W`, or `1M`/);
assert.match(doc, /Runtime behavior is unchanged/);
assert.match(step266, /Step 267 - Session Calendar Boundary/);
assert.match(todo, /Step 267 - Session Calendar Boundary/);

console.log('v6 session calendar boundary step267 static smoke passed');
