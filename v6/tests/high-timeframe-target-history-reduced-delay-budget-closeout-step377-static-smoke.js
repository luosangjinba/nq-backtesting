import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_REDUCED_DELAY_BROWSER_BUDGET_GUARD_STEP377.md',
  'utf8',
);
const browserSmoke = await readFile(
  'v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_TARGET_HISTORY_REDUCED_DELAY_BROWSER_BUDGET_GUARD_STEP377\.md/);
assert.match(index, /sub-`300ms` target-fetch starts/);

assert.match(todo, /Latest completed HTF target-history budget guard step:\s+Step 377/);
assert.match(todo, /### Step 378 - Target-History Pack Reduced-Delay Budget Member/);
assert.match(todo, /### Step 377 - HTF Target-History Reduced-Delay Browser Budget Guard/);
assert.match(todo, /`4h` `119\.4ms`/);
assert.match(todo, /`8h` `140\.1ms`/);
assert.match(todo, /`1D` `127\.7ms`/);
assert.match(todo, /`1W`\s+`139\.7ms`/);

assert.match(handoff, /Worktree at handoff: clean after Step 377 closeout/);
assert.match(handoff, /Latest completed step: Step 377 - HTF Target-History Reduced-Delay Browser\s+Budget Guard/);
assert.match(handoff, /start with Step 378/);
assert.match(handoff, /Recommended next action is Step 378/);
assert.match(handoff, /`4h` `119\.4ms`/);
assert.match(handoff, /`1W`\s+`139\.7ms`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /TARGET_FETCH_BUDGET_MS = 300|under `300ms`/);
assert.match(doc, /\| `4h` \| `119\.4ms` \|/);
assert.match(doc, /\| `8h` \| `140\.1ms` \|/);
assert.match(doc, /\| `1D` \| `127\.7ms` \|/);
assert.match(doc, /\| `1W` \| `139\.7ms` \|/);
assert.match(doc, /Step 378 Recommendation/);
assert.match(doc, /reduced-delay-budget/);

assert.match(browserSmoke, /TARGET_FETCH_BUDGET_MS = 300/);
assert.match(browserSmoke, /inputToTargetFetchStartMs < TARGET_FETCH_BUDGET_MS/);
assert.match(browserSmoke, /trace\.delayMs === 100/);
assert.match(browserSmoke, /phase === 'schedule-suppressed'/);
assert.match(browserSmoke, /sourceFetchCount, 0/);

console.log('v6 high-timeframe target-history reduced delay budget closeout step377 static smoke passed');
