import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_HISTORY_PACK_REDUCED_DELAY_BUDGET_MEMBER_STEP378.md',
  'utf8',
);
const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const step378Static = await readFile(
  'v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_HISTORY_PACK_REDUCED_DELAY_BUDGET_MEMBER_STEP378\.md/);
assert.match(index, /`reduced-delay-budget`/);
assert.match(index, /default eight-member pack/);

assert.match(todo, /Latest completed target-history pack reduced-delay member step:\s+Step 378/);
assert.match(todo, /### Step 379 - Target-History Pack Reduced-Delay Optional Combination/);
assert.match(todo, /### Step 378 - Target-History Pack Reduced-Delay Budget Member/);
assert.match(todo, /plan members 1\/8 reduced-delay-budget/);
assert.match(todo, /`4h` `124\.8ms`/);
assert.match(todo, /`1W`\s+`129\.9ms`/);

assert.match(handoff, /Worktree at handoff: clean after Step 378 closeout/);
assert.match(handoff, /Latest completed step: Step 378 - Target-History Pack Reduced-Delay Budget\s+Member/);
assert.match(handoff, /start with Step 379/);
assert.match(handoff, /Recommended next action is Step 379/);
assert.match(handoff, /plan members 1\/8\s+reduced-delay-budget/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Member id:[\s\S]*`reduced-delay-budget`/);
assert.match(doc, /plan members 1\/8 reduced-delay-budget/);
assert.match(doc, /\| `4h` \| `124\.8ms` \|/);
assert.match(doc, /\| `1W` \| `129\.9ms` \|/);
assert.match(doc, /Step 379 Recommendation/);

assert.match(helper, /id: 'reduced-delay-budget'/);
assert.match(helper, /high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke/);
assert.match(step378Static, /defaultPlan\.selectedCount, 8/);
assert.match(step378Static, /reducedDelayBudget\.selectedIds, \['reduced-delay-budget'\]/);
assert.match(step378Static, /replay-coordination',\s+'readout-producer-flow',\s+'handoff-registration',\s+'reduced-delay-budget'/);

console.log('v6 target-history pack reduced delay budget member closeout step378 static smoke passed');
