import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile('v6/src/app.js', 'utf8');
const control = await readFile('v6/src/shell/replay-navigation-control.js', 'utf8');
const settings = await readFile('v6/src/shell/replay-navigation-settings.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');

assert.match(app, /mountReplayNavigationControl/);
assert.match(app, /visiblePaneIds/);
assert.match(control, /REPLAY_NAVIGATION_COMMANDS\.NAVIGATE/);
assert.match(control, /REPLAY_NAVIGATION_EVENTS\.COMPLETED/);
assert.match(control, /REPLAY_NAVIGATION_EVENTS\.REJECTED/);
assert.match(control, /getVisiblePaneIds/);
assert.match(shell, /data-v6-replay-navigation-action="next-day-open"/);
assert.match(shell, /data-v6-replay-navigation-action="new-york-session"/);
assert.match(shell, /data-v6-replay-navigation-settings-dialog/);
assert.match(shell, /All session anchors use New York wall-clock time/);
assert.match(settings, /REPLAY_NAVIGATION_PREFERENCES_COMMANDS\.GET_SNAPSHOT/);
assert.match(settings, /REPLAY_NAVIGATION_PREFERENCES_COMMANDS\.UPDATE/);
assert.match(settings, /DEFAULT_REPLAY_NAVIGATION_ANCHORS/);
assert.doesNotMatch(control, /REPLAY_COMMANDS/);
assert.doesNotMatch(control, /BAR_DATA_COMMANDS/);
assert.doesNotMatch(control, /CHART_DATA_COMMANDS/);
assert.doesNotMatch(control, /CHART_VIEWPORT_COMMANDS/);
assert.doesNotMatch(control, /lightweight-charts/);
assert.doesNotMatch(settings, /REPLAY_COMMANDS/);
assert.doesNotMatch(settings, /BAR_DATA_COMMANDS/);
assert.doesNotMatch(settings, /CHART_DATA_COMMANDS/);
assert.doesNotMatch(settings, /lightweight-charts/);

console.log('V6 replay navigation control Step 406 ownership smoke passed.');
