import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_REPLAY_COORDINATION_STEP337.md', 'utf8');
const browserSmoke = await readFile(
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/display-timeframe-target-materialization-replay-coordination-boundary-step337-static-smoke.js',
  'utf8',
);
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');

assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_REPLAY_COORDINATION_STEP337\.md/);
assert.match(todo, /Latest completed display-timeframe target materialization replay coordination\s+step: Step 337/);
assert.match(todo, /### Step 338 - Target-Timeframe Materialization Next Slice Reselection/);
assert.match(handoff, /Latest completed step: Step 337 - Display-Timeframe Target Materialization\s+Replay Coordination Browser Regression/);
assert.match(handoff, /start with Step 338/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /manual next advances source `1m` replay cursor/);
assert.match(doc, /autoplay continues through the same gap to `18:01`/);
assert.match(doc, /target-history-no-visible-bars/);
assert.match(doc, /source cursor timestamp as the chart-data append cursor/);
assert.match(doc, /Step 338 should re-select/);

for (const requiredBrowserTerm of [
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE',
  '2026-06-01T18:00:00.000Z',
  '2026-06-01T18:01:00.000Z',
  "targetMode = 'empty'",
  "runtime.bar-data",
  "runtime.chart-data-projection",
]) {
  assert.match(browserSmoke, new RegExp(requiredBrowserTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /manualNextRuntime/);
assert.match(boundarySmoke, /LOAD_TARGET_WINDOW/);
assert.match(boundarySmoke, /fetchV4TargetBars/);
assert.match(manualNextRuntime, /parseReplayTimestamp\(replayState\.cursorTime, 'cursorTime'\)/);

console.log('v6 display timeframe target materialization replay coordination closeout step337 static smoke passed');
