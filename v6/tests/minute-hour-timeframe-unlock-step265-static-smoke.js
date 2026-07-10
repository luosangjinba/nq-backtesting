import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_MINUTE_HOUR_TIMEFRAME_UNLOCK_STEP265.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const capabilities = await readFile('v6/src/display-timeframe/display-timeframe-capabilities.js', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');

for (const token of ['2m', '3m', '4m', '10m', '30m', '1h', '2h', '4h', '8h', '12h']) {
  assert.match(doc, new RegExp(`\\\`${token}\\\``));
}

for (const token of ['1D', '1W', '1M']) {
  assert.match(doc, new RegExp(`\\\`${token}\\\``));
}

assert.match(doc, /seconds: `1s`, `5s`, `10s`, `15s`, `30s`/);
assert.match(doc, /`chart-data-projection` remains the only owner/);
assert.match(doc, /`replay` remains source-bar driven/);
assert.match(doc, /`bar-data` remains source loading\/cache owner/);
assert.match(todo, /Step 265 - Minute\/Hour Timeframe Unlock/);
assert.match(capabilities, /id: '30m'/);
assert.match(capabilities, /id: '12h'/);
assert.match(projectionDomain, /assertDisplayTimeframeMultiple/);
assert.equal(shell.includes('projectSourceBarsToChartData'), false);

console.log('v6 minute hour timeframe unlock step265 static smoke passed');
