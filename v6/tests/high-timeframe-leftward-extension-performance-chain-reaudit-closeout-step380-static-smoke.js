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
  readFile('v6/docs/V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_CHAIN_REAUDIT_STEP380.md', 'utf8'),
  readFile('v6/tests/high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke.js', 'utf8'),
  readFile('v6/src/app.js', 'utf8'),
]);

assert.match(index, /V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_CHAIN_REAUDIT_STEP380\.md/);
assert.match(index, /closed HTF target-history leftward-extension latency for\s+now/);
assert.match(index, /selected chart-foundation regression refresh as the next slice/);

assert.match(todo, /Latest completed HTF leftward performance chain re-audit step:\s+Step 380/);
assert.match(todo, /closed HTF\s+target-history leftward-extension latency for now/);
assert.match(todo, /Step 371 attribution harness/);
assert.match(todo, /### Step 381 - Chart Foundation Regression Refresh/);
assert.match(todo, /include display timeframe switching and `1m` round-trip coverage/);
assert.match(todo, /include interval menu parity/);
assert.match(todo, /include daily\/weekly\/monthly projection and replay gap coverage/);
assert.match(todo, /HTF reduced-delay budget guard/);
assert.match(todo, /### Step 380 - HTF Leftward Extension Performance Chain Re-audit/);

assert.match(handoff, /Worktree at handoff: clean after Step 380 closeout/);
assert.match(handoff, /Latest completed step: Step 380 - HTF Leftward Extension Performance Chain\s+Re-audit/);
assert.match(handoff, /start with Step 381:\s+chart foundation regression refresh/);
assert.match(handoff, /Recommended next action is Step 381 - Chart Foundation Regression Refresh/);
assert.match(handoff, /high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke/);

assert.match(doc, /HTF target-history leftward-extension latency is closed for now/);
assert.match(doc, /high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=reduced-delay-budget/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget/);
assert.match(doc, /Step 381 Recommendation/);
assert.match(doc, /chart-foundation regression refresh/);

assert.match(stepSmoke, /V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_CHAIN_REAUDIT_STEP380\.md/);
assert.match(stepSmoke, /No runtime behavior changed in this step/);
assert.doesNotMatch(app, /Step 380|CHAIN_REAUDIT_STEP380|leftward-extension performance chain re-audit/);

console.log('v6 high-timeframe leftward extension performance chain reaudit closeout step380 static smoke passed');
