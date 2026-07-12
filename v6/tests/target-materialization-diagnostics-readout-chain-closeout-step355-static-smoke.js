import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_DIAGNOSTICS_READOUT_CHAIN_SELECTION_STEP355.md',
  'utf8',
);
const selector = await readFile(
  'v6/src/replay/target-materialization-diagnostics-readout-chain-selection.js',
  'utf8',
);
const selectionSmoke = await readFile(
  'v6/tests/target-materialization-diagnostics-readout-chain-selection-step355-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/target-materialization-diagnostics-readout-chain-boundary-step355-static-smoke.js',
  'utf8',
);
const step354Closeout = await readFile(
  'v6/tests/target-history-pack-readout-producer-flow-combination-closeout-step354-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_MATERIALIZATION_DIAGNOSTICS_READOUT_CHAIN_SELECTION_STEP355\.md/);
assert.match(index, /narrow-replay-materialization-runtime-handoff-readiness-audit/);

assert.match(todo, /Latest completed target materialization diagnostics\/readout chain selection\s+step:\s+Step 355/);
assert.match(todo, /### Step 356 - Narrow Replay Materialization Runtime Handoff Readiness Audit/);
assert.match(todo, /### Step 355 - Target Materialization Diagnostics Readout Chain Closeout And Next Slice Selection/);
assert.match(todo, /Selected `narrow-replay-materialization-runtime-handoff-readiness-audit`/);

assert.match(handoff, /Latest completed step: Step 355 - Target Materialization Diagnostics\s+Readout Chain Closeout And Next Slice Selection/);
assert.match(handoff, /Step 355 closed the diagnostics\/readout observability chain/);
assert.match(handoff, /start with Step 356/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Step 337 covers replay coordination/);
assert.match(doc, /Step 352 covers real Display-Timeframe, Manual Next, and Auto Play/);
assert.match(doc, /Step 354 verifies the optional pack combination/);
assert.match(doc, /select `narrow-replay-materialization-runtime-handoff-readiness-audit`/);
assert.match(doc, /The pure selector lives at/);
assert.match(doc, /no runtime behavior changes/);
assert.match(doc, /Step 356 should perform `narrow-replay-materialization-runtime-handoff-readiness-audit`/);

assert.match(selector, /narrow-replay-materialization-runtime-handoff-readiness-audit/);
assert.match(selector, /diagnostics-readout-chain-packaged-select-runtime-handoff-readiness-audit/);
assert.match(selector, /more-diagnostics-readout-pack-wiring/);
assert.doesNotMatch(selector, /dispatchCommand\(|registerCommand\(|subscribeEvent\(|fetch\(|setData\(/);

assert.match(selectionSmoke, /selectedSlice, 'narrow-replay-materialization-runtime-handoff-readiness-audit'/);
assert.match(selectionSmoke, /runtime-handoff-deferred-until-readiness-audit/);
assert.match(selectionSmoke, /diagnostics-readout-chain-already-packaged-no-more-pack-wiring-selected/);
assert.match(boundarySmoke, /target-history-pack-readout-producer-flow-combination-step354-static-smoke/);
assert.match(boundarySmoke, /doesNotMatch\(step352Smoke, \/UPDATE_SNAPSHOT\//);

assert.doesNotMatch(step354Closeout, /Latest completed step: Step 354/);
assert.doesNotMatch(step354Closeout, /start with Step 355/);

console.log('v6 target materialization diagnostics readout chain closeout step355 static smoke passed');
