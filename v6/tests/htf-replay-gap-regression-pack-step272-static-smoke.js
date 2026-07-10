import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_HTF_REPLAY_GAP_REGRESSION_PACK_STEP272.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const projectionDomain = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const pack = await readFile('v6/tests/htf-replay-gap-regression-pack-step272-smoke.js', 'utf8');

assert.match(doc, /HTF Replay Gap Regression Pack/);
assert.match(doc, /`1D`, `1W`, and `1M`/);
assert.match(doc, /source-bar driven/);
assert.match(doc, /`16:59 -> 18:00`/);
assert.match(doc, /projection receives source-bar payloads/);
assert.match(todo, /Step 272 - HTF Replay Gap Regression Pack/);
assert.match(index, /V6_HTF_REPLAY_GAP_REGRESSION_PACK_STEP272/);
assert.match(manualNextRuntime, /SET_CURSOR_TIME/);
assert.match(manualNextRuntime, /LOAD_WINDOW/);
assert.match(autoPlayRuntime, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(projectionDomain, /SESSION_AWARE_BUCKET_RESOLVERS/);
assert.match(pack, /HTF_TARGETS = Object\.freeze\(\['1D', '1W', '1M'\]\)/);
assert.match(pack, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(pack, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.START/);
assert.match(pack, /projectionPayloads/);
assert.match(pack, /2026-06-01T18:00:00\.000Z/);

console.log('v6 HTF replay gap regression pack step272 static smoke passed');
