import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schedule = await readFile('v6/src/replay-navigation/replay-navigation-schedule.js', 'utf8');
const preferencesRuntime = await readFile('v6/src/replay-navigation/replay-navigation-preferences-runtime.js', 'utf8');
const shell = await readFile('v6/src/shell/workstation-shell-template.js', 'utf8');

assert.doesNotMatch(schedule, /contracts\/app-contracts|runtime\/commands|document\.|window\.|localStorage/);
assert.doesNotMatch(preferencesRuntime, /REPLAY_COMMANDS|BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS/);
assert.match(preferencesRuntime, /REPLAY_NAVIGATION_PREFERENCES_COMMANDS/);
assert.match(shell, /data-v6-rail-goto[^>]*aria-label="Go to key time"/);
assert.match(shell, /Next Day Open/);
assert.match(shell, /Next Session/);
assert.match(shell, /Asian Session/);
assert.match(shell, /London Session/);
assert.match(shell, /New York Session/);
assert.match(shell, /button type="button" disabled[^>]*role="menuitem"/);

console.log('v6 replay navigation step403 ownership smoke passed');
