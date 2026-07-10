import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_SCHEMA_DISCOVERY_STEP280.md', 'utf8');
const adapter = await readFile('v6/src/bar-data/v4-bars-adapter.js', 'utf8');
const handler = await readFile('v4/server/bars_handler.py', 'utf8');
const service = await readFile('v4/server/bars_service.py', 'utf8');
const priceLookup = await readFile('v4/server/price_lookup.py', 'utf8');
const config = await readFile('v4/v4_config.yaml', 'utf8');

assert.match(doc, /GET \/v4\/bars/);
assert.match(doc, /query params: `instrument`, `start`, `end`, `tf`/);
assert.match(doc, /current `tf` type: integer minutes/);
assert.match(doc, /table: `futures_1m`/);
assert.match(doc, /US\/Eastern wall-clock timestamps\s+stored as naive DuckDB timestamps/);
assert.match(doc, /`tf == 1440`/);
assert.match(doc, /removes the `17:00` maintenance hour/);
assert.match(doc, /anchors futures daily bars at `18:00`/);
assert.match(doc, /does not yet\s+accept canonical target ids/);
assert.match(doc, /target_bars\(/);
assert.match(doc, /primary key \(instrument, timeframe, ts\)/);
assert.match(doc, /source `1m` remains the replay cursor/);
assert.match(doc, /Step 280 must not/);
assert.match(doc, /add `\/v4\/target_bars` or change `\/v4\/bars`/);

assert.match(adapter, /tf: String\(window\.timeframe\)/);
assert.match(handler, /tf = int\(params\.get\("tf"/);
assert.match(service, /if tf != 1440/);
assert.match(service, /not \(extract\(hour from ts\) = 17\)/);
assert.match(service, /DAILY_ANCHOR_OFFSET = 18 \* 3600/);
assert.match(priceLookup, /from \{table\}/);
assert.match(priceLookup, /where instrument = \?/);
assert.match(priceLookup, /date_trunc\('minute', ts\)/);
assert.match(config, /table: "futures_1m"/);

console.log('v6 target timeframe schema discovery step280 static smoke passed');
