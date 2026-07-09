import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const doc = await read('v6/docs/V6_REPLAY_STEP_BACK_OWNER_READINESS_AUDIT_STEP235.md');
const todo = await read('v6/TODO.md');
const shell = await read('v6/src/shell/workstation-shell.js');
const transport = await read('v6/src/shell/replay-transport.js');
const contracts = await read('v6/src/contracts/app-contracts.js');
const replayDomain = await read('v6/src/replay/replay-domain.js');
const replayRuntime = await read('v6/src/replay/replay-runtime.js');
const chartDataRuntime = await read('v6/src/chart-data/chart-data-runtime.js');
const chartEntryManualNext = await read('v6/src/chart-entry/chart-entry-manual-next-runtime.js');

for (const required of [
  'Step 235 is an audit step, not an implementation step',
  'The reserved transport Previous replay bar control must remain disabled',
  'Remove The Latest Visible Bar',
  'Rejected for the first implementation',
  'Replay From A Cursor Snapshot',
  'Deferred',
  'Replace Chart Data From The Previous Cursor',
  'Selected as the future direction',
  'Replay domain:',
  'Replay runtime:',
  'Chart-entry:',
  'Chart-data:',
  'Bar-data:',
  'Chart viewport:',
  'Multi-pane:',
  'Shell transport:',
  'Step 236 should implement **Replay Previous Domain Command** only',
  'keep the transport Previous button disabled',
  'Do not implement previous replay behavior in Step 235',
  'Do not add new TFs',
]) {
  assert.match(doc, new RegExp(escaped(required)));
}

assert.match(todo, /Step 235 - Replay Step Back Owner Readiness Audit/);
assert.match(todo, /Step 236 - Replay Previous Domain Command/);
assert.match(shell, /data-v6-transport-step-back disabled/);
assert.match(shell, /aria-label="Previous replay bar"/);

assert.doesNotMatch(transport, /transport-action="previous"|case 'previous'|case "previous"/);
assert.doesNotMatch(contracts, /PREVIOUS|STEP_BACK|MANUAL_PREVIOUS/);
assert.doesNotMatch(replayDomain, /previousReplayState|previousReplay|prevReplay/i);
assert.doesNotMatch(replayRuntime, /REPLAY_COMMANDS\.PREVIOUS|registerCommand\([^,]*previous/i);
assert.doesNotMatch(chartDataRuntime, /ROLLBACK|REMOVE_BARS|removeBars|rollback/i);
assert.match(chartEntryManualNext, /REPLAY_COMMANDS\.NEXT/);
assert.doesNotMatch(chartEntryManualNext, /REPLAY_COMMANDS\.PREVIOUS|MANUAL_PREVIOUS/i);

console.log('v6 replay step-back owner readiness step 235 smoke passed');
