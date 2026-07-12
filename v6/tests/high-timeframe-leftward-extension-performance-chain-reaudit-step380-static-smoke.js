import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile(
  'v6/docs/V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_CHAIN_REAUDIT_STEP380.md',
  'utf8',
);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Steps 367-371/);
assert.match(doc, /Steps 372-374/);
assert.match(doc, /Step 375/);
assert.match(doc, /Step 376/);
assert.match(doc, /Step 377/);
assert.match(doc, /Steps 378-379/);
assert.match(doc, /HTF target-history leftward-extension latency is closed for now/);
assert.match(doc, /around `460-536ms`/);
assert.match(doc, /`4h` `113\.3ms`/);
assert.match(doc, /`8h` `140\.1ms`/);
assert.match(doc, /`1W` `137\.5ms`/);
assert.match(doc, /high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke/);
assert.match(doc, /high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=reduced-delay-budget/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget/);
assert.match(doc, /Default Step 293 target-history diagnostics pack membership remains eight/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Target bars remain display materialization inputs only/);
assert.match(doc, /Step 381 Recommendation/);
assert.match(doc, /chart-foundation regression refresh/);
assert.match(doc, /No runtime behavior changed in this step/);

console.log('v6 high-timeframe leftward extension performance chain reaudit step380 static smoke passed');
