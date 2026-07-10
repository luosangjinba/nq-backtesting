import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_CAPABILITY_REGISTRY_STEP264.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');

for (const token of [
  '1m',
  '2m',
  '3m',
  '4m',
  '5m',
  '10m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '8h',
  '12h',
  '1D',
  '1W',
  '1M',
]) {
  assert.match(doc, new RegExp(`\\\`${token}\\\``));
}

assert.match(doc, /Seconds are hidden by default/);
assert.match(doc, /Runtime behavior remains unchanged in Step 264/);
assert.match(doc, /Display-timeframe capability metadata belongs to `v6\/src\/display-timeframe`/);
assert.match(doc, /Replay remains source-bar driven/);
assert.match(doc, /Chart data projection remains the only owner/);
assert.match(doc, /Bar data runtime remains the only owner/);
assert.match(todo, /Step 264 - Display Timeframe Capability Registry/);

console.log('v6 display timeframe capability registry step264 static smoke passed');
