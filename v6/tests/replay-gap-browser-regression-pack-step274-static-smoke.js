import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_REPLAY_GAP_BROWSER_REGRESSION_RUNNER_STEP274.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');

const requiredMembers = [
  'manual-next-session-gap-browser-step258-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-manual-next-replay-gap-browser-step273-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Replay Gap Browser Regression Runner',
  'Steps 258, 263, and 273',
  'test orchestration only',
  'prints start/pass/fail',
  'stops at the first failure',
  'No production replay',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(doc, /node v6\/tests\/replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.match(index, /V6_REPLAY_GAP_BROWSER_REGRESSION_RUNNER_STEP274/);
assert.match(todo, /Step 274 - Replay Gap Browser Regression Runner/);

console.log('v6 replay gap browser regression pack step274 static smoke passed');
