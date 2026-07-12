import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  todo,
  handoff,
  index,
  doc,
  stepSmoke,
  app,
] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_CHART_FOUNDATION_REGRESSION_REFRESH_STEP381.md', 'utf8'),
  readFile('v6/tests/chart-foundation-regression-refresh-step381-static-smoke.js', 'utf8'),
  readFile('v6/src/app.js', 'utf8'),
]);

assert.match(index, /V6_CHART_FOUNDATION_REGRESSION_REFRESH_STEP381\.md/);
assert.match(index, /recorded the passing\s+Step 276 foundation pack and Step 377 reduced-delay guard/);
assert.match(index, /selected\s+Replay Gap Regression Pack Cost Audit as the next slice/);

assert.match(todo, /Latest completed chart-foundation regression refresh step:\s+Step 381/);
assert.match(todo, /Step 276 foundation pack and the\s+Step 377 reduced-delay guard/);
assert.match(todo, /Step 274\s+consumed `90350ms` inside the `105292ms` foundation pack run/);
assert.match(todo, /### Step 382 - Replay Gap Regression Pack Cost Audit/);
assert.match(todo, /htf-manual-next-replay-gap-browser-step273-smoke\.js`\s+\(`50161ms`\)/);
assert.match(todo, /manual-next-session-gap-browser-step258-smoke\.js`\s+\(`27270ms`\)/);
assert.match(todo, /runner split without weakening\s+manual-next, auto-play, or HTF gap assertions/);
assert.match(todo, /### Step 381 - Chart Foundation Regression Refresh/);

assert.match(handoff, /Worktree at handoff: clean after Step 381 closeout/);
assert.match(handoff, /Latest completed step: Step 381 - Chart Foundation Regression Refresh/);
assert.match(handoff, /start with Step 382:\s+replay gap regression pack cost audit/);
assert.match(handoff, /Recommended next action is Step 382 - Replay Gap Regression Pack Cost Audit/);
assert.match(handoff, /timeframe-replay-foundation-regression-pack-step276-smoke/);
assert.match(handoff, /high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke/);
assert.match(handoff, /chart-foundation-regression-refresh-step381-static-smoke/);

assert.match(doc, /The Step 276 foundation pack passed `8\/8` in `105292ms`/);
assert.match(doc, /`replay-gap-browser-regression-pack-step274-smoke\.js` \| pass \| `90350ms`/);
assert.match(doc, /`htf-manual-next-replay-gap-browser-step273-smoke\.js` \| pass \| `50161ms`/);
assert.match(doc, /Replay Gap Regression Pack Cost Audit/);
assert.match(doc, /No runtime behavior changed in this step/);
assert.match(stepSmoke, /Replay Gap Regression Pack Cost Audit/);
assert.doesNotMatch(app, /Step 381|REGRESSION_REFRESH_STEP381|Replay Gap Regression Pack Cost Audit/);

console.log('v6 chart foundation regression refresh closeout step381 static smoke passed');
