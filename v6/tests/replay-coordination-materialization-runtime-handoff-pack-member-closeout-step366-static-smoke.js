import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_HANDOFF_PACK_MEMBER_STEP366.md',
  'utf8',
);
const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const staticSmoke = await readFile(
  'v6/tests/target-history-pack-handoff-registration-member-step366-static-smoke.js',
  'utf8',
);

assert.match(
  index,
  /V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_HANDOFF_PACK_MEMBER_STEP366\.md/,
);
assert.match(index, /handoff-registration/);
assert.match(index, /HTF leftward-extension\s+performance measurement as the next slice/);

assert.match(todo, /### Step 366 - Replay Coordination Materialization Runtime Handoff Pack Member/);
assert.match(todo, /handoff-registration/);

assert.match(handoff, /Step 366 added optional target-history diagnostics pack member/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /handoff-registration/);
assert.match(doc, /default target-history diagnostics pack remains unchanged at eight members/);
assert.match(doc, /Step 367 should return to the HTF leftward-extension performance thread/);

assert.match(helper, /id: 'handoff-registration'/);
assert.match(
  helper,
  /script: 'v6\/tests\/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke\.js'/,
);
assert.match(staticSmoke, /TARGET_HISTORY_PACK_TESTS\.length, 8/);
assert.match(staticSmoke, /TARGET_HISTORY_PACK_OPTIONAL_TESTS\.length, 3/);
assert.match(staticSmoke, /members: 'replay-coordination,readout-producer-flow,handoff-registration'/);

console.log('v6 replay coordination materialization runtime handoff pack member closeout step366 static smoke passed');
