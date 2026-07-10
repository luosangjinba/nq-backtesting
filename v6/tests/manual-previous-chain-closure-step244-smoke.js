import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const closureDoc = await read('v6/docs/V6_MANUAL_PREVIOUS_CHAIN_CLOSURE_AUDIT_STEP244.md');
const todo = await read('v6/TODO.md');
const contracts = await read('v6/src/contracts/app-contracts.js');
const replayDomain = await read('v6/src/replay/replay-domain.js');
const replayRuntime = await read('v6/src/replay/replay-runtime.js');
const chartEntryPrevious = await read('v6/src/chart-entry/chart-entry-manual-previous-runtime.js');
const chartDataRuntime = await read('v6/src/chart-data/chart-data-runtime.js');
const chartViewportRuntime = await read('v6/src/chart-viewport/chart-viewport-runtime.js');
const transport = await read('v6/src/shell/replay-transport.js');
const chartEntryNext = await read('v6/src/chart-entry/chart-entry-manual-next-runtime.js');
const step235Smoke = await read('v6/tests/replay-step-back-owner-readiness-step235-smoke.js');
const step236Smoke = await read('v6/tests/replay-previous-domain-command-step236-smoke.js');
const step237Smoke = await read('v6/tests/chart-entry-manual-previous-contract-step237-smoke.js');

for (const required of [
  'Current Owner Map',
  'Replay domain owns previous cursor state',
  'Chart-entry manual Previous owns dispatching replay previous',
  'Chart-data owns pane-local series records',
  'Chart viewport owns cursor intent updates',
  'Shell transport owns only button enabled state and command dispatch',
  'No duplicate chart-data rollback/remove path exists',
  'Early Step 234-237 static smokes had stale assertions',
  'Step 245 - Replay/Transport Chain Regression Pack',
]) {
  assert.match(closureDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 244 - Manual Previous Chain Closure Audit/);
assert.match(todo, /Step 245 - Replay\/Transport Chain Regression Pack/);

assert.match(contracts, /PREVIOUS: 'replay\.previous'/);
assert.match(contracts, /REWOUND: 'replay:rewound'/);
assert.match(contracts, /CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS/);
assert.match(replayDomain, /previousReplayState/);
assert.match(replayDomain, /previousAvailable: boundedIndex > 0/);
assert.match(replayRuntime, /REPLAY_COMMANDS\.PREVIOUS/);
assert.match(chartEntryPrevious, /REPLAY_COMMANDS\.PREVIOUS/);
assert.match(chartEntryPrevious, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.match(chartViewportRuntime, /REPLAY_EVENTS\.REWOUND/);
assert.match(transport, /case 'previous'/);
assert.match(transport, /CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS\.PREVIOUS/);
assert.match(transport, /previousAvailable/);
assert.match(chartDataRuntime, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.doesNotMatch(chartDataRuntime, /ROLLBACK|REMOVE_BARS|removeBars|rollback/i);
assert.doesNotMatch(chartEntryNext, /REPLAY_COMMANDS\.PREVIOUS|MANUAL_PREVIOUS/i);

for (const smoke of [step235Smoke, step236Smoke, step237Smoke]) {
  assert.doesNotMatch(smoke, /doesNotMatch\(transport, \/transport-action="previous"\|case 'previous'\|case "previous"\//);
  assert.match(smoke, /CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS/);
}

console.log('v6 manual previous chain closure step 244 smoke passed');
