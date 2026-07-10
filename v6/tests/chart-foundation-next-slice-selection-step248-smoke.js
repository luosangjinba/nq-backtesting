import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP248.md');
const todo = await read('v6/TODO.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const postStep186 = await read('v6/sessions/session_20260708_post_step186_drag_history_stability.md');
const replaySafeLatency = await read('v6/docs/V6_REPLAY_SAFE_LEFTWARD_HISTORY_LATENCY_STEP187.md');
const chartPack = await read('v6/tests/chart-browser-regression-pack.js');
const fastDrag = await read('v6/tests/fast-right-drag-stability-browser-smoke.js');
const dragRelease = await read('v6/tests/chart-drag-release-lifecycle-browser-smoke.js');
const dragHistory = await read('v6/tests/drag-triggered-history-extension-browser-step149-smoke.js');
const viewportPrepend = await read('v6/tests/chart-viewport-prepend-manual-stability-smoke.js');
const surfacePrepend = await read('v6/tests/chart-surface-prepend-visible-range-stability-smoke.js');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Drag/Scroll Display Stability Reaudit/Gate',
  'fast drag should not snap the chart back to an initial wall',
  'hover after mouse release must not keep dragging the chart',
  'prepending older bars must compensate visible logical range',
  'Native Lightweight Charts interaction owns immediate drag/scroll chart movement',
  'Chart surface owns visible-range observation and prepend visible-range compensation',
  'Leftward-history input bridge owns delayed/coalesced history-extension scheduling',
  'Chart viewport owns manual/default viewport intent',
  'Replay owns cursor/reveal state',
  'current K-line visual stability ahead of immediate leftward loading',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 248 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 249 - Drag\/Scroll Display Stability Reaudit\/Gate/);
assert.match(productDirection, /drag and scroll charts without sticky or jumpy behavior/);
assert.match(postStep186, /stop drag range input after release/);
assert.match(postStep186, /stabilize drag during history loads/);
assert.match(replaySafeLatency, /Replay `Next` remains responsive while a delayed or pending older-history/);
assert.match(replaySafeLatency, /Native manual drag records viewport intent but does not immediately project/);
assert.match(chartPack, /chart-drag-release-lifecycle-browser-smoke/);
assert.match(chartPack, /fast-right-drag-stability-browser-smoke/);
assert.match(fastDrag, /afterHover/);
assert.match(fastDrag, /rangesNear/);
assert.match(dragRelease, /mouseReleased/);
assert.match(dragRelease, /afterHover/);
assert.match(dragHistory, /requestCap/);
assert.match(dragHistory, /older-window/);
assert.match(viewportPrepend, /prepend|manual/i);
assert.match(surfacePrepend, /visibleRange|prepend/i);

console.log('v6 chart foundation next slice selection step 248 smoke passed');
