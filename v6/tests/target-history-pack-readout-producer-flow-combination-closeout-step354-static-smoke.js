import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_PACK_READOUT_PRODUCER_FLOW_COMBINATION_STEP354.md', 'utf8');
const smoke = await readFile('v6/tests/target-history-pack-readout-producer-flow-combination-step354-static-smoke.js', 'utf8');
const step353Closeout = await readFile(
  'v6/tests/target-history-pack-readout-producer-flow-member-closeout-step353-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_HISTORY_PACK_READOUT_PRODUCER_FLOW_COMBINATION_STEP354\.md/);
assert.match(index, /`replay-coordination,readout-producer-flow`/);

assert.match(todo, /Latest completed target-history pack readout producer-flow combination step:\s+Step 354/);
assert.match(todo, /### Step 354 - Target Materialization Replay Diagnostics Readout Pack Combination Verification/);
assert.match(todo, /Step 337 then Step 352 browser smokes in order/);

assert.match(handoff, /Step 354 verified optional target-history diagnostics pack combination\s+`replay-coordination,readout-producer-flow`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow/);
assert.match(doc, /Step 337 replay-coordination browser smoke first/);
assert.match(doc, /Step\s+352 materialization diagnostics readout producer-flow browser smoke second/);
assert.match(doc, /default target-history diagnostics pack remains unchanged at eight members/);
assert.match(doc, /diagnostics\/readout chain is now packaged enough/);
assert.match(doc, /Step 355 should perform a compact target-materialization diagnostics\/readout\s+chain closeout and next-slice selection/);

assert.match(smoke, /members: 'replay-coordination,readout-producer-flow'/);
assert.match(smoke, /selectedIds, \['replay-coordination', 'readout-producer-flow'\]/);
assert.match(smoke, /display-timeframe-target-materialization-replay-coordination-browser-step337-smoke/);
assert.match(smoke, /target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke/);
assert.match(smoke, /selectedCount, 8/);
assert.match(smoke, /doesNotMatch\(step352Smoke, \/UPDATE_SNAPSHOT\//);

assert.doesNotMatch(step353Closeout, /Latest completed step: Step 353/);
assert.doesNotMatch(step353Closeout, /start with Step 354/);

console.log('v6 target history pack readout producer flow combination closeout step354 static smoke passed');
