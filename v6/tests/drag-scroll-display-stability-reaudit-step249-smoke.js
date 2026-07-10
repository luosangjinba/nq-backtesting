import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

function assertIncludes(content, needle, label = needle) {
  assert.equal(
    content.includes(needle),
    true,
    `${label} should be documented`,
  );
}

const doc = read('v6/docs/V6_DRAG_SCROLL_DISPLAY_STABILITY_REAUDIT_STEP249.md');
const todo = read('v6/TODO.md');
const productDirection = read('v6/docs/V6_PRODUCT_DIRECTION.md');
const postStep186 = read('v6/sessions/session_20260708_post_step186_drag_history_stability.md');
const step187Doc = read('v6/docs/V6_REPLAY_SAFE_LEFTWARD_HISTORY_LATENCY_STEP187.md');
const dragRelease = read('v6/tests/chart-drag-release-lifecycle-browser-smoke.js');
const fastDrag = read('v6/tests/fast-right-drag-stability-browser-smoke.js');
const dragHistory = read('v6/tests/drag-triggered-history-extension-browser-step149-smoke.js');
const replaySafe = read('v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js');
const viewportPrepend = read('v6/tests/chart-viewport-prepend-manual-stability-smoke.js');
const surfacePrepend = read('v6/tests/chart-surface-prepend-visible-range-stability-smoke.js');
const chartPack = read('v6/tests/chart-browser-regression-pack.js');

assertIncludes(doc, 'Drag/Scroll Display Stability Reaudit/Gate');
assertIncludes(doc, 'Existing browser-visible coverage is sufficient');
assertIncludes(doc, 'Native Lightweight Charts interaction owns immediate drag/scroll chart');
assertIncludes(doc, 'Chart surface owns visible-range observation and prepend visible-range');
assertIncludes(doc, 'Manual-wall input bridge may record viewport intent after native drag');
assertIncludes(doc, 'Leftward-history input bridge owns delayed/coalesced history-extension');
assertIncludes(doc, 'Chart-history owns older-window orchestration');
assertIncludes(doc, 'Bar-data owns bounded request planning');
assertIncludes(doc, 'Chart-data owns pane-local prepend/append/replace records');
assertIncludes(doc, 'Chart viewport owns manual/default viewport intent');
assertIncludes(doc, 'Replay owns cursor/reveal state');

for (const filename of [
  'chart-drag-release-lifecycle-browser-smoke.js',
  'fast-right-drag-stability-browser-smoke.js',
  'drag-triggered-history-extension-browser-step149-smoke.js',
  'replay-safe-leftward-history-latency-browser-step187-smoke.js',
  'chart-surface-prepend-visible-range-stability-smoke.js',
  'chart-viewport-prepend-manual-stability-smoke.js',
  'chart-browser-regression-pack.js',
  'replay-transport-chain-regression-pack-step245-smoke.js',
]) {
  assertIncludes(doc, filename);
}

assertIncludes(todo, 'Step 249 - Drag/Scroll Display Stability Reaudit/Gate');
assertIncludes(todo, 'Step 250 - Chart Foundation Next Slice Selection');
assertIncludes(todo, 'drag-scroll-display-stability-reaudit-step249-smoke.js');
assertIncludes(productDirection, 'drag and scroll charts without sticky or jumpy behavior');

assertIncludes(postStep186, 'stop drag range input after release');
assertIncludes(postStep186, 'stabilize drag during history loads');
assertIncludes(step187Doc, 'Replay `Next` remains responsive');

assertIncludes(dragRelease, 'mouseReleased');
assertIncludes(dragRelease, 'afterHover');
assertIncludes(dragRelease, 'rangesNear');

assertIncludes(fastDrag, 'for (let attempt = 0; attempt < 5; attempt += 1)');
assertIncludes(fastDrag, 'afterHover');
assertIncludes(fastDrag, 'afterDrag.projection, null');
assertIncludes(fastDrag, 'afterHover.appliedViewport.origin, \'default\'');

assertIncludes(dragHistory, 'requestCap');
assertIncludes(dragHistory, 'older-window');
assertIncludes(dragHistory, 'assert.deepEqual(loaded.replay, initial.replay)');

assertIncludes(replaySafe, 'nextMeasurement.latencyMs < 160');
assertIncludes(replaySafe, 'afterHistory.history.extension.plannedWindow.requestCap');
assertIncludes(replaySafe, 'assert.deepEqual(afterHistory.replay, afterNext.replay)');

assertIncludes(viewportPrepend, 'prepend');
assertIncludes(viewportPrepend, 'manual');
assertIncludes(surfacePrepend, 'visibleLogicalRange');
assertIncludes(surfacePrepend, 'prepend');

assertIncludes(chartPack, 'chart-drag-release-lifecycle-browser-smoke.js');
assertIncludes(chartPack, 'fast-right-drag-stability-browser-smoke.js');

console.log('v6 drag/scroll display stability reaudit step 249 smoke passed');
