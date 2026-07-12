import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_HISTORY_PACK_REDUCED_DELAY_OPTIONAL_COMBINATION_STEP379.md',
  'utf8',
);
const staticSmoke = await readFile(
  'v6/tests/target-history-pack-reduced-delay-optional-combination-step379-static-smoke.js',
  'utf8',
);

const combinedMembers = /replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget/;

assert.match(index, /V6_TARGET_HISTORY_PACK_REDUCED_DELAY_OPTIONAL_COMBINATION_STEP379\.md/);
assert.match(index, combinedMembers);

assert.match(todo, /Latest completed target-history pack optional combination step:\s+Step 379/);
assert.match(todo, /### Step 380 - HTF Leftward Extension Performance Chain Re-audit/);
assert.match(todo, /### Step 379 - Target-History Pack Reduced-Delay Optional Combination/);
assert.match(todo, combinedMembers);
assert.match(todo, /`4h` `116\.0ms`/);
assert.match(todo, /`1W` `137\.5ms`/);

assert.match(handoff, /Worktree at handoff: clean after Step 379 closeout/);
assert.match(handoff, /Latest completed step: Step 379 - Target-History Pack Reduced-Delay\s+Optional Combination/);
assert.match(handoff, /start with Step 380/);
assert.match(handoff, /Recommended next action is Step 380/);
assert.match(handoff, combinedMembers);
assert.match(handoff, /`4h` `116\.0ms`/);
assert.match(handoff, /`1W` `137\.5ms`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, combinedMembers);
assert.match(doc, /plan members 4\/8 replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget/);
assert.match(doc, /\| `4h` \| `116\.0ms` \|/);
assert.match(doc, /\| `1W` \| `137\.5ms` \|/);
assert.match(doc, /Step 380 Recommendation/);

assert.match(staticSmoke, /selectedCount, 4/);
assert.match(staticSmoke, /selectedIds, \[/);
assert.match(staticSmoke, /'replay-coordination'/);
assert.match(staticSmoke, /'readout-producer-flow'/);
assert.match(staticSmoke, /'handoff-registration'/);
assert.match(staticSmoke, /'reduced-delay-budget'/);
assert.match(staticSmoke, /defaultPlan\.selectedCount, 8/);

console.log('v6 target-history pack reduced delay optional combination closeout step379 static smoke passed');
