import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP211.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const session = await read('v6/sessions/session_20260708_step211_next_chart_slice_selection.md');

assert.match(doc, /Step 212 should implement \*\*Top-Toolbar Active-Pane Symbol Presentation Sync\*\*/);
assert.match(index, /V6_NEXT_CHART_SLICE_SELECTION_STEP211\.md/);
assert.match(todo, /Latest completed roadmap step: Step 211 - Next Chart Slice Selection/);
assert.match(todo, /Step 212 - Top-Toolbar Active-Pane Symbol Presentation Sync/);
assert.match(handoff, /Current V6 step state: Step 211 completed/);
assert.match(handoff, /Next planned step: Step 212 - Top-Toolbar Active-Pane Symbol Presentation Sync/);
assert.match(handoff, /session_20260708_step211_next_chart_slice_selection\.md/);
assert.match(session, /46b05629/);
assert.match(session, /node v6\/tests\/next-chart-slice-selection-step211-smoke\.js/);
assert.match(session, /node v6\/tests\/chart-browser-regression-pack\.js/);

[
  todo,
  handoff,
  session,
].forEach((text) => {
  assert.match(text, /symbol picker UI/);
  assert.match(text, /comparison symbols/);
  assert.match(text, /Pine Script/);
  assert.match(text, /trading\/order behavior/);
});

console.log('v6 next chart slice selection step 211 completion smoke passed');
