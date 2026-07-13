import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contract = readFileSync('v6/docs/V6_GLOBAL_TIME_FORMAT_SETTINGS_CONTRACT.md', 'utf8');
const guardrails = readFileSync('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const settingsModel = readFileSync('v6/src/settings/settings-model.js', 'utf8');

assert.match(contract, /accepted Step 416 Settings requirement/);
assert.match(contract, /owned by the\s+global Settings runtime/);
assert.match(contract, /timeFormat: '24h' \| '12h'/);
assert.match(contract, /default is `24h`/);
assert.match(contract, /separate from `displayTimezone`/);
assert.match(contract, /presentation-only/);
assert.match(contract, /canonical `HH:mm`/);
assert.match(contract, /Native `<input type="time">`/);

for (const surface of ['chart time axis', 'Go-to', 'Session', 'Journal']) {
  assert.match(contract, new RegExp(surface));
}

assert.match(guardrails, /V6_GLOBAL_TIME_FORMAT_SETTINGS_CONTRACT\.md/);
assert.match(index, /V6_GLOBAL_TIME_FORMAT_SETTINGS_CONTRACT\.md/);

// This step records a future Settings contract; it must not silently ship a
// partial production schema before the Settings-parity implementation step.
assert.equal(settingsModel.includes('timeFormat'), false);

console.log('v6 global time format Settings contract smoke passed');
