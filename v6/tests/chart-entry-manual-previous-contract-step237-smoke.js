import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const doc = await read('v6/docs/V6_CHART_ENTRY_MANUAL_PREVIOUS_REPLACEMENT_CONTRACT_STEP237.md');
const todo = await read('v6/TODO.md');
const contracts = await read('v6/src/contracts/app-contracts.js');
const replayRuntime = await read('v6/src/replay/replay-runtime.js');
const shell = await read('v6/src/shell/workstation-shell.js');
const transport = await read('v6/src/shell/replay-transport.js');
const chartEntryManualNext = await read('v6/src/chart-entry/chart-entry-manual-next-runtime.js');
const chartEntryManualPrevious = await read('v6/src/chart-entry/chart-entry-manual-previous-runtime.js');
const chartDataRuntime = await read('v6/src/chart-data/chart-data-runtime.js');
const paneReloadChartData = await read('v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js');

for (const required of [
  'Step 237 defines the chart-entry contract for manual Previous replay chart',
  'does not implement chart-entry previous behavior',
  'the transport Previous button',
  'chart-entry dispatches `REPLAY_COMMANDS.PREVIOUS`',
  'chart-entry calls `CHART_DATA_COMMANDS.REPLACE_BARS`',
  'Shell, chart adapter, and chart-data must not remove a latest rendered bar',
  'Replay runtime:',
  'Chart-entry manual previous:',
  'Pane runtime:',
  'Chart-data runtime:',
  'Bar-data runtime:',
  'Chart-data projection runtime:',
  'Chart viewport runtime:',
  'Shell transport:',
  'Prefer current chart-data filtering',
  'Fall back to bounded bar-data loading',
  'Project only when needed',
  'No-Future Rule',
  'Viewport Rule',
  'Step 238 should implement **Chart Entry Manual Previous Runtime Skeleton**',
  'keep the transport Previous button disabled',
  'Do not add chart-data rollback/remove commands',
]) {
  assert.match(doc, new RegExp(escaped(required)));
}

assert.match(todo, /Step 237 - Chart Entry Manual Previous Replacement Contract/);
assert.match(todo, /Step 238 - Chart Entry Manual Previous Runtime Skeleton/);
assert.match(contracts, /PREVIOUS: 'replay\.previous'/);
assert.match(replayRuntime, /REPLAY_COMMANDS\.PREVIOUS/);
assert.match(chartDataRuntime, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.match(paneReloadChartData, /CHART_DATA_COMMANDS\.REPLACE_BARS/);

assert.match(shell, /data-v6-transport-step-back disabled/);
assert.match(transport, /case 'previous'/);
assert.match(transport, /CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS\.PREVIOUS/);
assert.match(contracts, /CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS/);
assert.match(contracts, /chartEntryManualPrevious\.previous/);
assert.match(chartEntryManualPrevious, /REPLAY_COMMANDS\.PREVIOUS/);
assert.match(chartEntryManualPrevious, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.doesNotMatch(chartEntryManualNext, /REPLAY_COMMANDS\.PREVIOUS|MANUAL_PREVIOUS/i);
assert.doesNotMatch(chartDataRuntime, /ROLLBACK|REMOVE_BARS|removeBars|rollback/i);

console.log('v6 chart-entry manual previous contract step 237 smoke passed');
