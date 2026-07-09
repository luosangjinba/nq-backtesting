import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_ENTRY_RELOAD_TIME_HELPER_AUDIT_STEP221.md');
const todo = await read('v6/TODO.md');

for (const required of [
  'Step 221 is an audit step, not an implementation step',
  'SMC/ICT-focused backtesting',
  'v6/src/chart-entry/chart-entry-projection-preparation.js',
  'v6/src/chart-entry/chart-entry-projection-preparation-runtime.js',
  'v6/src/chart-entry/chart-entry-manual-next-runtime.js',
  'v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js',
  'v6/src/layout/layout-pane-bootstrap-runtime.js',
  'normalizeUnixSeconds',
  'normalizeOptionalUnixSeconds',
  'normalizeMinuteTimeframe',
  'summarizeProjectionSource',
  'external replay cursor time text',
  'bar-data window API minute strings',
  'replay state may already carry seconds or time text',
  'Step 222',
  'Do not change chart-entry, manual-next, reload, or layout behavior in Step',
  'Do not add new TFs',
  'Do not move chart series writes',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 221 - Chart Entry \/ Reload Time Helper Readiness Audit/);

for (const [file, evidence] of [
  [
    'v6/src/chart-entry/chart-entry-projection-preparation.js',
    'parseCursorTimestamp',
  ],
  [
    'v6/src/chart-entry/chart-entry-projection-preparation-runtime.js',
    'parseOptionalTimestamp',
  ],
  [
    'v6/src/chart-entry/chart-entry-manual-next-runtime.js',
    'normalizeTimeframeMinutes',
  ],
  [
    'v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js',
    'cursorTimestampFromWindow',
  ],
  [
    'v6/src/layout/layout-pane-bootstrap-runtime.js',
    'timestampFromReplayState',
  ],
]) {
  const source = await read(file);
  assert.match(source, new RegExp(evidence));
  assert.match(doc, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('v6 chart-entry reload time helper audit step 221 smoke passed');
