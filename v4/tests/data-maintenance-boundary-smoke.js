import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve('v4/data-maintenance.html'), 'utf8');

assert.match(
  html,
  /<script type="module" src="\.\/src\/maintenance\/data-maintenance-app\.js"><\/script>/,
  'data-maintenance.html should load the maintenance module entry'
);
assert.doesNotMatch(html, /function\s+summarize\(/, 'output summarization should not live inline in HTML');
assert.doesNotMatch(html, /function\s+resolveApiBase\(/, 'API base resolution should not live inline in HTML');
assert.doesNotMatch(html, /buildTradovateLiveRecordArchives/, 'Tradovate import workflow should not live inline in HTML');

const moduleExpectations = new Map([
  ['data-maintenance-app.js', 'initTradovateImportPanel'],
  ['maintenance-api-client.js', 'export function resolveApiBase'],
  ['environment-panel.js', 'export function initEnvironmentPanel'],
  ['refresh-range-panel.js', 'export function initRefreshRangePanel'],
  ['economic-calendar-panel.js', 'export function initEconomicCalendarPanel'],
  ['roll-calendar-panel.js', 'export function initRollCalendarPanel'],
  ['tradovate-import-panel.js', 'export function initTradovateImportPanel'],
  ['output-panel.js', 'export function formatResult'],
]);

for (const [filename, marker] of moduleExpectations) {
  const modulePath = resolve('v4/src/maintenance', filename);
  assert.ok(existsSync(modulePath), `${filename} should exist`);
  const source = readFileSync(modulePath, 'utf8');
  assert.match(source, new RegExp(marker.replaceAll(' ', '\\s+')), `${filename} should expose ${marker}`);
}

console.log('data maintenance boundary smoke passed');
