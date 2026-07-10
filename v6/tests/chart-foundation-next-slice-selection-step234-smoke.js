import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP234.md');
const todo = await read('v6/TODO.md');
const shell = await read('v6/src/shell/workstation-shell.js');
const replayDomain = await read('v6/src/replay/replay-domain.js');
const replayRuntime = await read('v6/src/replay/replay-runtime.js');
const transport = await read('v6/src/shell/replay-transport.js');
const viewportSpec = await read('v6/docs/specs/replay-viewport-intent.md');

for (const required of [
  'Replay Step Back Owner Readiness Audit',
  'data-v6-transport-step-back',
  'Replay runtime owns cursor and reveal state',
  'Chart-entry replay orchestration owns transport-facing replay chart actions',
  'Chart-data runtime owns pane-local chart series records',
  'Chart viewport runtime owns default/manual wall intent',
  'keep the transport Previous button disabled',
  'Do not implement previous replay behavior in Step 235',
  'Do not enable the Previous button in Step 235',
  'Do not add new TFs',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 234 - Chart Foundation Next Slice Selection/);
assert.match(shell, /data-v6-transport-step-back disabled/);
assert.match(shell, /aria-label="Previous replay bar"/);
assert.match(transport, /case 'previous'/);
assert.match(transport, /CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS\.PREVIOUS/);
assert.match(replayDomain, /previousReplayState|resolvePreviousReplayAvailability/);
assert.match(replayRuntime, /REPLAY_COMMANDS\.PREVIOUS/);
assert.match(viewportSpec, /Replay cursor movement updates `cursorTimestamp`/);
assert.match(viewportSpec, /Replay runtime may publish cursor updates/);

console.log('v6 chart foundation next slice selection step 234 smoke passed');
