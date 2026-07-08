import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtimeSource = fs.readFileSync(
  new URL('../src/pane-intent-sync/pane-intent-sync-runtime.js', import.meta.url),
  'utf8',
);
const modelSource = fs.readFileSync(
  new URL('../src/pane-intent-sync/pane-intent-sync-model.js', import.meta.url),
  'utf8',
);
const sources = `${runtimeSource}\n${modelSource}`;

const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'REPLAY_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'SET_SYMBOL_INTENT',
  'SET_INTERVAL_INTENT',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'PREPEND_BARS',
  'APPLY_CHART_DATA_REVISION',
  'RESET_VIEW',
  'LOAD_SESSION',
  'REPLAY_COMMANDS.NEXT',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
  'replayCursor',
  'barDataRuntime',
  'chartEngine',
  'chartViewportRuntime',
];

for (const token of forbiddenTokens) {
  assert.equal(sources.includes(token), false, `pane intent sync boundary must not contain ${token}`);
}

assert.equal(runtimeSource.includes('PANE_COMMANDS.GET_SNAPSHOT'), true);
assert.equal(runtimeSource.includes('LAYOUT_COMMANDS.GET_SNAPSHOT'), true);
assert.equal(runtimeSource.includes('PANE_INTENT_SYNC_EVENTS.PLANNED'), true);
assert.equal(runtimeSource.includes('PANE_EVENTS.SYMBOL_INTENT_CHANGED'), true);
assert.equal(runtimeSource.includes('PANE_EVENTS.INTERVAL_INTENT_CHANGED'), true);

const appSource = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
assert.equal(appSource.includes('createPaneIntentSyncRuntime'), true);

console.log('v6 pane intent sync boundary step 170 smoke passed');
