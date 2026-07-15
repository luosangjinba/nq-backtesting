import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = (await readFile('v6/docs/V6_ETH_RTH_EXCHANGE_CALENDAR_PHASE_A2.md', 'utf8'))
  .replaceAll(/\s+/g, ' ');

for (const invariant of [
  'ETH normal eligibility is `[18:00 previous day, 17:00)` ET',
  'RTH normal eligibility is `[09:30, 16:15)` ET',
  'Eligibility uses half-open source-bar-open timestamps',
  'Wall-clock boundaries do not shift across DST',
  'Versioned CME exception records override normal weekly rules',
  'Missing bars are never synthesized',
  'Lightweight Charts receives already eligible/projected bars',
]) {
  assert.equal(doc.includes(invariant), true, invariant);
}

assert.equal(doc.includes('https://www.cmegroup.com/trading-hours.html'), true);
assert.equal(doc.includes('43000670909-regular-and-electronic-trading-hours-for-cme-futures'), true);
assert.equal(doc.includes('CSS hiding is not an accepted implementation'), true);

console.log('v6 ETH/RTH exchange calendar phase A2 smoke passed');
