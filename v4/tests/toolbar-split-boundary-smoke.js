import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const toolbarSource = readFileSync(resolve('v4/src/ui/toolbar.js'), 'utf8');

const forbiddenPatterns = [
  /\bfunction\s+renderInstrumentOptions\b/,
  /\bfunction\s+renderComparisonControls\b/,
  /\bfunction\s+renderActivePaneTimeframeControls\b/,
  /\bfunction\s+renderDisplayControls\b/,
  /\bfunction\s+renderSettingsOptions\b/,
  /\bfunction\s+renderSettingsSelect\b/,
  /\bfunction\s+applyChartLayout\b/,
  /\bfunction\s+handleLayoutClick\b/,
  /\bfunction\s+renderSettingsPopover\b/,
  /\bfunction\s+handleSettingsChange\b/,
  /\bfunction\s+syncPaneStateFromComparison\b/,
  /\bfunction\s+applyActivePaneInstrument\b/,
  /\bfunction\s+applyActivePaneTimeframe\b/,
  /\bfunction\s+handleLoad\b/,
  /\bconst\s+UI_SCALE_LABELS\b/,
  /\bconst\s+CHART_TEXT_LABELS\b/,
  /\bconst\s+INSPECTOR_DENSITY_LABELS\b/,
  /\bfunction\s+escapeHtml\b/,
];

const violations = forbiddenPatterns
  .filter((pattern) => pattern.test(toolbarSource))
  .map((pattern) => pattern.toString());

assert.deepEqual(violations, []);
assert.match(toolbarSource, /renderToolbarShell\(getToolbarRenderState\(\)\)/);
assert.match(toolbarSource, /initToolbarSettingsController/);
assert.match(toolbarSource, /initToolbarLayoutController/);
assert.match(toolbarSource, /handleToolbarRangeLoad/);
assert.match(toolbarSource, /applyActivePaneInstrument/);

console.log('toolbar split boundary smoke passed');
