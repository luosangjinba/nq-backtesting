import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const selection = await readFile(
  'v6/docs/V6_SETTINGS_TRANSACTION_DURABILITY_SELECTION_STEP409.md',
  'utf8',
);
const roadmap = await readFile('v6/docs/V6_EXECUTION_ROADMAP.md', 'utf8');
const contract = await readFile('v6/docs/V6_GLOBAL_TIME_FORMAT_SETTINGS_CONTRACT.md', 'utf8');
const catalog = await readFile(
  'v6/docs/V6_SETTINGS_CATALOG_ARCHITECTURE_STEP409_5.md',
  'utf8',
);
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const settingsModel = await readFile('v6/src/settings/settings-model.js', 'utf8');

assert.match(selection, /Status: completed; automated and human visual acceptance passed/);
assert.match(selection, /Opening Settings snapshots committed state into a panel-local draft/);
assert.match(selection, /Persist only normalized committed records/);
assert.match(selection, /Reuse the existing persistence repository\/Web Storage adapter/);
assert.match(selection, /LocalizationOptions\.timeFormatter/);
assert.match(selection, /TimeScaleOptions\.tickMarkFormatter/);
assert.match(selection, /without a custom\s+chart primitive/);
assert.match(selection, /Step 409\.5 is the planning-only/);
assert.ok(roadmap.indexOf('Step 409 transactional') < roadmap.indexOf('Step 409.5'));
assert.match(contract, /accepted Step 416 Settings requirement/);
assert.match(catalog, /Step 410 - Canvas Direct Chart Options/);
assert.match(catalog, /Production work remains blocked until Step 409 human visual acceptance/);
assert.match(todo, /Latest implemented Phase 7 closeout step: Step 409/);
assert.match(todo, /Human visual acceptance passed/);
assert.match(index, /V6_SETTINGS_TRANSACTION_DURABILITY_SELECTION_STEP409/);
assert.doesNotMatch(settingsModel, /timeFormat/);

console.log('V6 next Settings parity selection Step 409 smoke passed.');
