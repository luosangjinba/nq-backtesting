import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const normalize = async (path) => (await readFile(path, 'utf8')).replaceAll(/\s+/g, ' ');

const doc = await normalize('v6/docs/V6_ETH_RTH_LOCAL_DATA_CONTRACT_PHASE_A1.md');
const priceLookup = await normalize('v4/server/price_lookup.py');
const barsService = await normalize('v4/server/bars_service.py');

for (const invariant of [
  'exchange wall-clock labels encoded as UTC-like epoch seconds',
  'No second timezone conversion is applied',
  'maintenance gap is `17:00–17:59`',
  'RTH projection cannot reuse current ETH fixed/daily aggregate results',
]) {
  assert.equal(doc.includes(invariant), true, invariant);
}

assert.equal(priceLookup.includes('row[0].replace(tzinfo=timezone.utc).timestamp()'), true);
assert.equal(priceLookup.includes('V4 chart timestamps represent US/Eastern wall-clock values as UTC epoch seconds'), true);
assert.equal(priceLookup.includes('anchor_offset = 7200 if tf == 240 else 0'), true);
assert.equal(barsService.includes('and not (extract(hour from ts) = 17)'), true);

console.log('v6 ETH/RTH local data contract phase A1 smoke passed');
