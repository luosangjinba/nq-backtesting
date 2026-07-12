import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_PACK_READOUT_PRODUCER_FLOW_MEMBER_STEP353.md', 'utf8');
const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js', 'utf8');
const step309Smoke = await readFile('v6/tests/target-history-pack-cost-control-step309-smoke.js', 'utf8');
const step339Smoke = await readFile('v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_HISTORY_PACK_READOUT_PRODUCER_FLOW_MEMBER_STEP353\.md/);
assert.match(index, /`readout-producer-flow`/);

assert.match(todo, /Latest completed target-history pack readout producer-flow member step:\s+Step 353/);
assert.match(todo, /### Step 353 - Target Materialization Replay Diagnostics Readout Producer Flow Pack Member/);
assert.match(todo, /Added optional target-history pack member `readout-producer-flow`/);

assert.match(handoff, /Step 353 added optional target-history diagnostics regression pack member\s+`readout-producer-flow`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /`readout-producer-flow`/);
assert.match(doc, /target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke/);
assert.match(doc, /default target-history pack remains unchanged at eight members/);
assert.match(doc, /`replay-coordination` member remains available and is not replaced/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=readout-producer-flow/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow/);
assert.match(doc, /Step 354 should verify the optional pack-member combination path/);

assert.match(helper, /id: 'readout-producer-flow'/);
assert.match(helper, /target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke/);
assert.match(helper, /id: 'replay-coordination'/);

assert.match(smoke, /selectedCount, 8/);
assert.match(smoke, /selectedIds\.includes\('readout-producer-flow'\), false/);
assert.match(smoke, /members: 'readout-producer-flow'/);
assert.match(smoke, /members: 'replay-coordination,readout-producer-flow'/);
assert.match(smoke, /doesNotMatch\(step352Smoke, \/UPDATE_SNAPSHOT\//);

assert.match(step309Smoke, /readout-producer-flow/);
assert.match(step339Smoke, /readout-producer-flow/);

console.log('v6 target history pack readout producer flow member closeout step353 static smoke passed');
