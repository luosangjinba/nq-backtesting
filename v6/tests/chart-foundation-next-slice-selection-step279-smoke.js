import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP279.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const phasePlan = await readFile('v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md', 'utf8');

assert.match(doc, /Step 280 should implement \*\*Target-Timeframe Data Contract And Schema\s+Discovery\*\*/);
assert.match(doc, /Phase A from/);
assert.match(doc, /supported display ids/);
assert.match(doc, /1\/2\/3\/4\/5\/10\/15\/30m/);
assert.match(doc, /1\/2\/4\/8\/12h/);
assert.match(doc, /`1D`, `1W`, `1M`/);
assert.match(doc, /daily\/weekly\/monthly futures bucket semantics/);
assert.match(doc, /audit the current V4\/DuckDB source bars schema/);
assert.match(doc, /one table keyed by\s+instrument\/timeframe\/timestamp/);
assert.match(doc, /Chart-history\/display-timeframe should not request target bars in Step 280/);
assert.match(doc, /Replay remains source-`1m` driven/);
assert.match(doc, /Do not implement server aggregation/);
assert.match(doc, /Do not route display-timeframe switching or leftward history through target\s+bars yet/);
assert.match(doc, /Runtime, API, database, projection, replay, viewport, chart-engine, and\s+chart-data behavior remain unchanged/);

assert.match(todo, /Step 279 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 280 - Target-Timeframe Data Contract And Schema Discovery/);
assert.match(todo, /source `1m` replay bars remain the canonical replay cursor source/);
assert.match(index, /V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP279\.md/);
assert.match(index, /Target-Timeframe Data Contract And Schema Discovery/);
assert.match(phasePlan, /Phase A - Data Contract And Schema Discovery/);

console.log('v6 chart foundation next slice selection step279 smoke passed');
