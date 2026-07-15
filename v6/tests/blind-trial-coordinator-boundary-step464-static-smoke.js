import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'v6/src/blind-trial/blind-trial-coordinator-runtime.js',
  'utf8',
);

assert.equal(source.includes("from '../replay/replay-runtime.js'"), false);
assert.equal(source.includes("from '../replay/replay-domain.js'"), false);
assert.equal(source.includes("from '../chart-"), false);
assert.equal(source.includes("from '../bar-data/"), false);
assert.equal(source.includes('REPLAY_COMMANDS.GET_STATE'), true);
assert.equal(source.includes('repository.startTrial'), true);
assert.equal(source.includes('REPLAY_COMMANDS.SET_CURSOR_TIME'), false);
assert.equal(source.includes('REPLAY_COMMANDS.LOAD_SESSION'), false);
assert.equal(source.includes('REPLAY_COMMANDS.PLAY'), false);
assert.equal(source.includes('REPLAY_COMMANDS.PAUSE'), false);

console.log('v6 blind trial coordinator boundary step464 static smoke passed');
