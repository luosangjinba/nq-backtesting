import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_SERVER_AGGREGATION_STEP281.md', 'utf8');
const v4Api = await readFile('v4/v4_api.py', 'utf8');
const targetService = await readFile('v4/server/target_bars_service.py', 'utf8');
const adapter = await readFile('v6/src/bar-data/v4-target-bars-adapter.js', 'utf8');

assert.match(todo, /Step 281 - Target-Timeframe Server Aggregation Boundary/);
assert.match(todo, /Step 282 - Bar-Data Runtime Target-Timeframe Support/);
assert.match(todo, /backend-only `\/v4\/target_bars` path/);
assert.match(todo, /existing `\/v4\/bars` and V6 chart runtimes\s+remain unchanged/);
assert.match(index, /V6_TARGET_TIMEFRAME_SERVER_AGGREGATION_STEP281\.md/);

assert.match(doc, /backend-only from V6's perspective/);
assert.match(doc, /GET \/v4\/target_bars/);
assert.match(doc, /not registered with bar-data runtime/);
assert.match(doc, /Existing `GET \/v4\/bars` behavior remains unchanged/);
assert.match(doc, /No database schema or persistent `target_bars` table was created/);

assert.match(v4Api, /"\/v4\/target_bars"/);
assert.match(targetService, /_TARGET_BARS_CACHE/);
assert.match(targetService, /target-bars-service/);
assert.match(adapter, /\/v4\/target_bars/);
assert.doesNotMatch(adapter, /createBarDataRuntime/);

console.log('v6 target timeframe server aggregation closeout step281 static smoke passed');
