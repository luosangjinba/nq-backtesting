import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_ACTIVE_PANE_FALLBACK_NARROWING_STEP204.md');
const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const session = await read('v6/sessions/session_20260708_step204_active_pane_fallback_narrowing.md');

assert.match(doc, /Removed Compatibility Fallback/);
assert.match(doc, /Keep Current-Pane Semantics/);
assert.match(todo, /Latest completed roadmap step: Step 204 - Active-Pane Fallback Narrowing/);
assert.match(todo, /Step 205 - Next Chart Slice Selection/);
assert.match(handoff, /Current V6 step state: Step 204 completed/);
assert.match(handoff, /Next planned step: Step 205 - Next Chart Slice Selection/);
assert.match(session, /manual-next pane lookup, initial projection-preparation display timeframe\s+resolution, and leftward-history pane lookup/);

console.log('v6 active pane fallback doc step 204 smoke passed');
