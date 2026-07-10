import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const domain = await readFile('v6/src/time-domain/target-timeframe-domain.js', 'utf8');
const discovery = await readFile('v6/docs/V6_TARGET_TIMEFRAME_SCHEMA_DISCOVERY_STEP280.md', 'utf8');

assert.match(todo, /Step 280 - Target-Timeframe Data Contract And Schema Discovery/);
assert.match(todo, /Step 281 - Target-Timeframe Server Aggregation Boundary/);
assert.match(todo, /canonical target timeframe ids/);
assert.match(todo, /lowercase `m` minutes from uppercase `M`\s+month/);
assert.match(todo, /`tf == 1440` futures daily path/);
assert.match(todo, /\(instrument, timeframe, ts\)/);
assert.match(index, /V6_TARGET_TIMEFRAME_SCHEMA_DISCOVERY_STEP280\.md/);

assert.match(domain, /TARGET_TIMEFRAME_BUCKET_TYPES/);
assert.match(domain, /FIXED_TARGET_TIMEFRAME_MINUTES/);
assert.match(domain, /SESSION_AWARE_TARGET_TIMEFRAME_IDS/);
assert.match(domain, /targetTimeframeToApiCacheKey/);
assert.match(discovery, /target_bars\(/);
assert.match(discovery, /source `1m` remains the replay cursor/);

console.log('v6 target timeframe contract closeout step280 static smoke passed');
