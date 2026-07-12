import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_PACK_REPLAY_COORDINATION_MEMBER_STEP339.md', 'utf8');
const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_HISTORY_PACK_REPLAY_COORDINATION_MEMBER_STEP339\.md/);
assert.match(todo, /Latest completed target-history pack member step: Step 339/);
assert.match(todo, /### Step 340 - Target-Timeframe Materialization Post-Pack Reselection/);
assert.match(handoff, /Latest completed step: Step 339 - Target-History Pack Replay Coordination\s+Member Integration/);
assert.match(handoff, /start with Step 340/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /`replay-coordination`/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=replay-coordination/);
assert.match(doc, /default target-history pack remains the\s+existing eight-member browser pack/);
assert.match(doc, /Runtime behavior is unchanged|This step changes test harness membership only/);
assert.match(doc, /Step 340 should re-select/);

assert.match(helper, /TARGET_HISTORY_PACK_OPTIONAL_TESTS/);
assert.match(helper, /replay-coordination/);
assert.match(smoke, /selectedCount, 8/);
assert.match(smoke, /TARGET_HISTORY_PACK_OPTIONAL_TESTS/);

console.log('v6 target history pack replay coordination member closeout step339 static smoke passed');
