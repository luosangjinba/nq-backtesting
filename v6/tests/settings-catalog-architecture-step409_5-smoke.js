import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalog = readFileSync(
  'v6/docs/V6_SETTINGS_CATALOG_ARCHITECTURE_STEP409_5.md',
  'utf8',
);
const settingsModel = readFileSync('v6/src/settings/settings-model.js', 'utf8');

for (const tab of ['### Canvas', '### Symbol', '### Status line', '### Scales and lines']) {
  assert.ok(catalog.includes(tab));
}

for (const scope of ['`workstation`', '`workspace-chart`', '`pane`', '`symbol`', '`session`']) {
  assert.ok(catalog.includes(scope));
}

assert.match(catalog, /catalog-driven shell/);
assert.match(catalog, /A field must not become active until its consumer/);
assert.match(catalog, /Chart Viewport runtime remains the only owner/);
assert.match(catalog, /Session Calendar owns ET\/DST day boundaries/);
assert.match(catalog, /Initial chart[\s\S]*target all panes/);
assert.match(catalog, /Step 410 - Canvas Direct Chart Options/);
assert.match(catalog, /Step 416 - Global Time Presentation/);
assert.match(catalog, /Production work remains blocked until Step 409 human visual acceptance/);

for (const rejected of [
  'colorByPreviousClose',
  'lockPriceToBarRatio',
  'countdownToBarClose',
  'keepLeftEdgeOnIntervalChange',
]) {
  assert.match(catalog, new RegExp(`${rejected}[^\\n]*Reject`));
}

// Step 409.5 is planning-only: no future catalog field ships accidentally.
for (const field of ['backgroundColor', 'crosshairColor', 'scaleFontSize', 'timeFormat']) {
  assert.equal(settingsModel.includes(field), false);
}

console.log('V6 Settings catalog architecture Step 409.5 smoke passed.');
