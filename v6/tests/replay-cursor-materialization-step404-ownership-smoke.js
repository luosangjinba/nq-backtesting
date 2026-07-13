import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manualNext = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const resolver = await readFile('v6/src/replay/replay-forward-source-cursor-resolver.js', 'utf8');
const materializer = await readFile('v6/src/replay/replay-cursor-pane-materializer.js', 'utf8');
const workstationShell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const doc = await readFile('v6/docs/V6_SHARED_CURSOR_MATERIALIZATION_STEP404.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const plan = await readFile('v6/docs/V6_GOTO_REPLAY_NAVIGATION_PLAN_STEP402.md', 'utf8');

assert.match(manualNext, /advanceReplayToNextSourceBar/);
assert.match(manualNext, /appendReplayCursorAcrossPanes/);
assert.doesNotMatch(manualNext, /BAR_DATA_COMMANDS/);
assert.doesNotMatch(manualNext, /CHART_DATA_COMMANDS/);
assert.doesNotMatch(manualNext, /CHART_DATA_PROJECTION_COMMANDS/);

assert.match(resolver, /BAR_DATA_COMMANDS\.LOAD_WINDOW/);
assert.match(resolver, /REPLAY_COMMANDS\.SET_CURSOR_TIME/);
assert.doesNotMatch(resolver, /CHART_DATA_COMMANDS/);
assert.doesNotMatch(resolver, /CHART_VIEWPORT/);

assert.match(materializer, /BAR_DATA_COMMANDS\.LOAD_WINDOW/);
assert.match(materializer, /CHART_DATA_PROJECTION_COMMANDS\.PROJECT/);
assert.match(materializer, /CHART_DATA_COMMANDS\.APPEND_BARS/);
assert.doesNotMatch(materializer, /SET_CURSOR_TIME/);
assert.doesNotMatch(materializer, /CHART_VIEWPORT/);
assert.doesNotMatch(materializer, /lightweight-charts/);

assert.match(workstationShell, /Next Day Open/);
assert.match(doc, /Status: completed/);
assert.match(doc, /appendReplayCursorAcrossPanes/);
assert.match(index, /V6_SHARED_CURSOR_MATERIALIZATION_STEP404/);
assert.match(plan, /Step 404[\s\S]*Status: completed/);

console.log('V6 replay cursor materialization Step 404 ownership smoke passed.');
