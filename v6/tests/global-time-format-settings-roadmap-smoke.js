import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const roadmap = readFileSync('v6/docs/V6_EXECUTION_ROADMAP.md', 'utf8');
const todo = readFileSync('v6/TODO.md', 'utf8');
const goToStep = readFileSync('v6/docs/V6_REPLAY_NAVIGATION_UI_STEP406.md', 'utf8');
const session = readFileSync(
  'v6/sessions/session_20260713_future_global_time_format_settings_constraint.md',
  'utf8',
);

assert.match(roadmap, /Settings parity[\s\S]*12\/24-hour/);
assert.match(roadmap, /V6_GLOBAL_TIME_FORMAT_SETTINGS_CONTRACT\.md/);

assert.match(todo, /does not replace the Step 407 gate/);
assert.match(todo, /timeFormat: '24h' \| '12h'/);
assert.match(todo, /Canonical timestamps/);

assert.match(goToStep, /`HH:mm` remains the canonical command\/persistence value/);
assert.match(goToStep, /Go-to must not own or persist a separate 12\/24-hour choice/);

assert.match(session, /No production Settings schema/);
assert.match(session, /Complete Step 407 acceptance first/);

console.log('v6 global time format Settings roadmap smoke passed');
