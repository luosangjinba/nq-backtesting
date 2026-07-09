import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_TIME_HELPER_CLOSURE_REVIEW_STEP231.md');
const todo = await read('v6/TODO.md');

for (const required of [
  'closes the chart-foundation time and timeframe helper migration line',
  'Steps 215 through 230',
  'No additional runtime migration is recommended in Step 231',
  'SMC/ICT-focused',
  'normalizeUnixSeconds',
  'Chart-Foundation Helpers Now Centralized',
  'Remaining Local Logic To Keep',
  'already-normalized array comparison',
  'Playback period is not chart source timeframe parsing',
  'chart-engine/lightweight-chart-adapter',
  'Step 232',
  'Do not add new TFs',
  'Do not move chart series writes',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 231 - Chart Time Helper Closure Review/);
assert.match(todo, /Step 232 - Chart Foundation Post Time-Helper Slice Selection/);

for (const [file, evidence] of [
  ['v6/src/chart-entry/chart-entry-context-plan.js', 'normalizeUnixMilliseconds'],
  ['v6/src/chart-entry/chart-entry-default-wall-plan.js', 'normalizeUnixMilliseconds'],
  ['v6/src/chart-entry/chart-entry-playback-period-policy.js', 'normalizeMinuteTimeframe'],
  ['v6/src/chart-data/chart-bars.js', 'normalizeUnixSeconds'],
  ['v6/src/default-wall/default-wall-runtime.js', 'normalizeMinuteTimeframe'],
  ['v6/src/default-wall/default-wall-replay.js', 'normalizeUnixSeconds'],
  ['v6/src/display-timeframe/display-timeframe-runtime.js', 'summarizeProjectionSource'],
  ['v6/src/chart-history/leftward-extension-planner.js', 'assertDisplayTimeframeMultiple'],
  ['v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js', 'summarizeProjectionSource'],
  ['v6/src/layout/layout-pane-bootstrap-runtime.js', 'normalizeUnixSeconds'],
  ['v6/src/replay/replay-domain.js', 'normalizeMinuteTimeframe'],
  ['v6/src/panes/pane-model.js', 'normalizeMinuteTimeframe'],
]) {
  const source = await read(file);
  assert.match(source, new RegExp(evidence));
  assert.match(doc, new RegExp(file.split('/').slice(2, -1).join('|') || evidence));
}

for (const requiredLocal of [
  'new Date().toISOString()',
  'new Date(normalizedMs).toISOString()',
  'Number(bar.timestamp ?? bar.time)',
  'bar-data/bar-window-cache',
  '30s',
  'shell, session, journal',
]) {
  assert.match(doc, new RegExp(requiredLocal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('v6 chart time helper closure review step 231 smoke passed');
