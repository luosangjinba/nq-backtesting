import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = (await readFile('v6/docs/V6_ETH_RTH_REPLAY_PROJECTION_PHASE_A3.md', 'utf8'))
  .replaceAll(/\s+/g, ' ');

for (const invariant of [
  'A mode switch retains `cursorTime` and recomputes `visibleThroughTime`',
  'RTH Next/Previous/Play traverse eligible bars without invisible steps',
  'All visible panes replace under one Session Hours revision',
  'Eligibility precedes higher-timeframe aggregation',
  'RTH fixed-duration buckets anchor at `09:30`',
  'ETH and RTH projections never share an ambiguous cache identity',
  'Switching mode never exposes a bar later than Replay cursor',
  'Evidence drillback restores its recorded mode and calendar revision',
  'failure leaves it paused',
]) {
  assert.equal(doc.includes(invariant), true, invariant);
}

assert.equal(doc.includes('target-ineligible-for-session-hours'), true);
assert.equal(doc.includes('partial `13:30–16:15`'), true);
assert.equal(doc.includes('Current ETH target bars cannot be reused for RTH projection'), true);

console.log('v6 ETH/RTH replay projection phase A3 smoke passed');
