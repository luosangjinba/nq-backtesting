import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const session = await read('v6/sessions/session_20260708_step205_next_chart_slice_selection.md');

assert.match(todo, /Latest completed roadmap step: Step 205 - Next Chart Slice Selection/);
assert.match(todo, /Step 206 - Pane-Local Display-Timeframe UI Readiness/);
assert.match(handoff, /Current V6 step state: Step 205 completed/);
assert.match(handoff, /Next planned step: Step 206 - Pane-Local Display-Timeframe UI Readiness/);
assert.match(session, /Pane-Local Display-Timeframe UI Readiness/);
assert.match(session, /No custom intervals/);
assert.match(session, /No indicators or Pine Script/);

console.log('v6 next chart slice doc step 205 smoke passed');
