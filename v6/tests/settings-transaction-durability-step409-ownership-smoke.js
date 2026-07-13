import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile(
  'v6/docs/V6_SETTINGS_TRANSACTION_DURABILITY_SELECTION_STEP409.md',
  'utf8',
);
const model = await readFile('v6/src/settings/settings-model.js', 'utf8');
const panel = await readFile('v6/src/shell/settings-panel.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const bridge = await readFile('v6/src/chart-engine/settings-chart-surface-bridge.js', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');

assert.match(doc, /Status: completed; automated and human visual acceptance passed/);
assert.match(doc, /All five checks passed/);
assert.match(model, /SETTINGS_RECORD_VERSION = 2/);
assert.doesNotMatch(model, /timeFormat/);
assert.doesNotMatch(panel, /localStorage|LightweightCharts|createChart/);
assert.match(panel, /SETTINGS_COMMANDS\.UPDATE, draftSettings/);
assert.match(panel, /SETTINGS_COMMANDS\.GET_DEFAULTS/);
assert.match(bridge, /chartSurface\.applySettings/);
assert.match(bridge, /chartGrid: settings\.chartGrid/);
assert.doesNotMatch(bridge, /localStorage|LightweightCharts|createChart/);
assert.deepEqual(
  [...shell.matchAll(/data-v6-settings-field="([^"]+)"/g)].map((match) => match[1]),
  ['chartGrid'],
);
assert.match(todo, /Step 409 is closed/);

console.log('V6 Settings transaction and durability Step 409 ownership smoke passed.');
