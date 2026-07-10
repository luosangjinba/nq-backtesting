import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_HTF_BROWSER_REPLAY_GAP_PACK_STEP273.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const runtimePack = await readFile('v6/tests/htf-replay-gap-regression-pack-step272-smoke.js', 'utf8');
const manualBrowser = await readFile('v6/tests/manual-next-session-gap-browser-step258-smoke.js', 'utf8');
const autoBrowser = await readFile('v6/tests/auto-play-session-gap-browser-step263-smoke.js', 'utf8');

assert.match(doc, /HTF Browser Replay Gap Pack/);
assert.match(doc, /`1D`, `1W`, and `1M`/);
assert.match(doc, /`16:59 -> 18:00`/);
assert.match(doc, /continues to `18:01`/);
assert.match(todo, /Step 273 - HTF Browser Replay Gap Pack/);
assert.match(index, /V6_HTF_BROWSER_REPLAY_GAP_PACK_STEP273/);
assert.match(runtimePack, /HTF_TARGETS = Object\.freeze\(\['1D', '1W', '1M'\]\)/);
assert.match(manualBrowser, /manual next session gap browser/);
assert.match(autoBrowser, /auto-play session gap browser/);

console.log('v6 HTF browser replay gap pack step273 static smoke passed');
