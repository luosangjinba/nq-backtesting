import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('v6/src/app.js', 'utf8');
const control = await readFile('v6/src/shell/replay-navigation-control.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');

assert.match(app, /mountReplayNavigationControl/);
assert.match(app, /visiblePaneIds/);
assert.match(control, /REPLAY_NAVIGATION_COMMANDS\.NAVIGATE/);
assert.match(control, /REPLAY_NAVIGATION_EVENTS\.COMPLETED/);
assert.match(control, /REPLAY_NAVIGATION_EVENTS\.REJECTED/);
assert.match(control, /getVisiblePaneIds/);
assert.match(shell, /data-v6-replay-navigation-action="next-day-open"/);
assert.match(shell, /data-v6-replay-navigation-action="new-york-session"/);
assert.doesNotMatch(control, /REPLAY_COMMANDS/);
assert.doesNotMatch(control, /BAR_DATA_COMMANDS/);
assert.doesNotMatch(control, /CHART_DATA_COMMANDS/);
assert.doesNotMatch(control, /CHART_VIEWPORT_COMMANDS/);
assert.doesNotMatch(control, /lightweight-charts/);

console.log('V6 replay navigation control Step 406 ownership smoke passed.');
