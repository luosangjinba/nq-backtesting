import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const manifest = await readFile('v6/src/runtime/core-runtime-manifest.js', 'utf8');
const runtime = await readFile('v6/src/replay-navigation/replay-navigation-runtime.js', 'utf8');
const schedule = await readFile('v6/src/replay-navigation/replay-navigation-schedule.js', 'utf8');
const targetResolver = await readFile('v6/src/replay-navigation/replay-navigation-target-resolver.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const doc = await readFile('v6/docs/V6_REPLAY_NAVIGATION_COORDINATOR_STEP405.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');

assert.match(contracts, /REPLAY_NAVIGATION_COMMANDS/);
assert.match(contracts, /REPLAY_NAVIGATION_EVENTS/);
assert.match(manifest, /createReplayNavigationRuntime/);

assert.match(schedule, /resolveReplayWallClockTimestamp/);
assert.match(schedule, /getReplayWallClockParts/);
assert.match(targetResolver, /resolveReplaySourceBarNearAnchor/);
assert.match(runtime, /resolveReplayNavigationTarget/);
assert.match(runtime, /appendReplayCursorAcrossPanes/);
assert.match(runtime, /REPLAY_COMMANDS\.PAUSE/);
assert.match(runtime, /REPLAY_COMMANDS\.SET_CURSOR_TIME/);
assert.match(runtime, /reason: 'in-flight'/);
assert.doesNotMatch(runtime, /CHART_DATA_COMMANDS/);
assert.doesNotMatch(runtime, /CHART_VIEWPORT_COMMANDS/);
assert.doesNotMatch(runtime, /lightweight-charts/);
assert.doesNotMatch(runtime, /document\.|querySelector/);

assert.match(shell, /Next Day Open/);
assert.match(doc, /Status: completed/);
assert.match(doc, /ET wall-clock/);
assert.match(index, /V6_REPLAY_NAVIGATION_COORDINATOR_STEP405/);

console.log('V6 replay navigation Step 405 ownership smoke passed.');
