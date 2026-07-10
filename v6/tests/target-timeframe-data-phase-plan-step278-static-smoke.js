import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const roadmap = await readFile('v6/docs/V6_EXECUTION_ROADMAP.md', 'utf8');

assert.match(doc, /Target Timeframe Data Phase Plan/);
assert.match(doc, /frontend `1m` source aggregation/);
assert.match(doc, /display\/history path: request target timeframe bars/);
assert.match(doc, /replay precision path: keep `1m` source bars/);
assert.match(doc, /fallback path: keep frontend projection/);
assert.match(doc, /Phase A - Data Contract And Schema Discovery/);
assert.match(doc, /Phase B - Server\/Data-Layer Aggregation/);
assert.match(doc, /Phase C - Bar-Data Runtime Target-TF Support/);
assert.match(doc, /Phase D - Display-Timeframe Historical Path/);
assert.match(doc, /Phase E - Replay Coordination/);
assert.match(doc, /Phase F - Materialization And Maintenance/);
assert.match(doc, /Step 279 should select/);
assert.match(doc, /Do not remove frontend projection/);

assert.match(todo, /Step 278 - Target Timeframe Data Phase Plan/);
assert.match(todo, /Step 279 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Steps 264-278/);
assert.match(index, /V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278\.md/);

assert.match(roadmap, /Phase 6 - Target Timeframe Data Infrastructure/);
assert.match(roadmap, /Phase 7 - Settings And Polish/);
assert.match(roadmap, /high-timeframe leftward history uses target bars/);
assert.match(roadmap, /replay cursor movement and no-bar gap skipping remain source-driven/);

console.log('v6 target timeframe data phase plan step278 static smoke passed');
