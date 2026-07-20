import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import {
  createInitialViewportIntent,
  measureManualViewportWall,
  moveViewportIntentCursor,
  projectViewportIntent,
  promoteViewportIntentToManual,
  readViewportIntent,
  resetViewportIntentToDefault,
} from '../src/viewport-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/viewport-runtime/negative/cases.json',
), 'utf8'));
assert.equal(negativeCases.length, 13);
assert.equal(new Set(negativeCases).size, 13);

const sessionA = createSessionId('session-a');
const sessionB = createSessionId('session-b');
const generationOne = createActivationGeneration(1);
const generationTwo = createActivationGeneration(2);

function initial(overrides = {}) {
  return createInitialViewportIntent({
    activationGeneration: generationOne,
    cursorEpochMs: 1_000,
    latestOffsetBars: 8,
    paneId: 'pane-a',
    sessionId: sessionA,
    ...overrides,
  });
}

const defaultIntent = initial();
const defaultValue = readViewportIntent(defaultIntent);
assert.deepEqual({
  cursorEpochMs: defaultValue.cursorEpochMs,
  latestOffsetBars: defaultValue.latestOffsetBars,
  mode: defaultValue.mode,
  origin: defaultValue.origin,
  revision: defaultValue.revision,
  spanBars: defaultValue.spanBars,
}, {
  cursorEpochMs: 1_000,
  latestOffsetBars: 8,
  mode: 'replay-wall',
  origin: 'default',
  revision: 0,
  spanBars: null,
});
assert.equal(Object.isFrozen(defaultIntent), true);
assert.equal(Object.isFrozen(defaultValue), true);
assert.equal(Object.isFrozen(defaultValue.scope), true);

const defaultProjection = projectViewportIntent(defaultIntent, {
  defaultSpanBars: 120,
  latestLogicalIndex: 99,
});
assert.deepEqual({ from: defaultProjection.from, to: defaultProjection.to }, { from: -13, to: 107 });

const measurement = measureManualViewportWall({
  latestLogicalIndex: 99,
  range: Object.freeze({ from: 20, to: 105 }),
});
assert.deepEqual(measurement, { latestOffsetBars: 6, spanBars: 85 });
assert.equal(Object.isFrozen(measurement), true);

const manualIntent = promoteViewportIntentToManual(defaultIntent, measurement);
const manualBefore = readViewportIntent(manualIntent);
assert.equal(manualBefore.origin, 'manual');
assert.equal(manualBefore.revision, 1);
assert.equal(manualBefore.latestOffsetBars, 6);
assert.equal(manualBefore.spanBars, 85);
assert.equal(manualBefore.scope, defaultValue.scope);

const advancedManual = moveViewportIntentCursor(manualIntent, 5_000);
const manualAfter = readViewportIntent(advancedManual);
assert.deepEqual({
  latestOffsetBars: manualAfter.latestOffsetBars,
  origin: manualAfter.origin,
  revision: manualAfter.revision,
  spanBars: manualAfter.spanBars,
}, {
  latestOffsetBars: 6,
  origin: 'manual',
  revision: 1,
  spanBars: 85,
});
assert.equal(manualAfter.cursorEpochMs, 5_000);

const beforeReplay = projectViewportIntent(manualIntent, {
  defaultSpanBars: 999,
  latestLogicalIndex: 99,
});
const afterReplay = projectViewportIntent(advancedManual, {
  defaultSpanBars: 1,
  latestLogicalIndex: 102,
});
assert.equal(afterReplay.to - beforeReplay.to, 3, 'new bars move the logical window right');
assert.equal(afterReplay.from - beforeReplay.from, 3, 'prior bars move left at the stable wall');
assert.equal(afterReplay.to - afterReplay.latestLogicalIndex, 6, 'manual wall remains stable');
assert.equal(afterReplay.spanBars, 85, 'snapshot/default-span changes cannot replace manual span');

const reset = resetViewportIntentToDefault(advancedManual, { latestOffsetBars: 10 });
const resetValue = readViewportIntent(reset);
assert.deepEqual({
  cursorEpochMs: resetValue.cursorEpochMs,
  latestOffsetBars: resetValue.latestOffsetBars,
  origin: resetValue.origin,
  revision: resetValue.revision,
  spanBars: resetValue.spanBars,
}, {
  cursorEpochMs: 5_000,
  latestOffsetBars: 10,
  origin: 'default',
  revision: 2,
  spanBars: null,
});

const paneB = initial({ paneId: 'pane-b' });
const sessionBIntent = initial({ sessionId: sessionB });
const generationTwoIntent = initial({ activationGeneration: generationTwo });
assert.notEqual(readViewportIntent(paneB).scope.paneId, defaultValue.scope.paneId);
assert.notEqual(readViewportIntent(sessionBIntent).scope.sessionId, defaultValue.scope.sessionId);
assert.notEqual(
  readViewportIntent(generationTwoIntent).scope.activationGeneration,
  defaultValue.scope.activationGeneration,
);

for (const options of [
  { sessionId: 'session-a' },
  { activationGeneration: 1 },
  { paneId: '' },
  { cursorEpochMs: -1 },
  { cursorEpochMs: Number.MAX_SAFE_INTEGER + 1 },
  { latestOffsetBars: -1 },
]) {
  assert.throws(() => initial(options));
}

assert.throws(() => readViewportIntent(Object.freeze({ mode: 'replay-wall' })),
  (error) => error?.code === 'VIEWPORT_INTENT_REQUIRED');
assert.throws(() => measureManualViewportWall({ latestLogicalIndex: 10 }));
assert.throws(() => measureManualViewportWall({
  latestLogicalIndex: 10,
  range: { from: 5, to: 5 },
}));
assert.throws(() => measureManualViewportWall({
  latestLogicalIndex: 11,
  range: { from: 5, to: 10 },
}));
assert.throws(() => measureManualViewportWall({
  latestLogicalIndex: Number.NaN,
  range: { from: 5, to: 10 },
}));
assert.throws(() => projectViewportIntent(defaultIntent, {
  defaultSpanBars: 0,
  latestLogicalIndex: 10,
}));
assert.throws(() => promoteViewportIntentToManual(defaultIntent, {
  latestOffsetBars: 2,
  spanBars: 0,
}));

console.log(`v7 Viewport Runtime harness passed (${negativeCases.length} negative controls)`);
