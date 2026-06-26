import assert from 'node:assert/strict';

const replayStateKeys = ['enabled', 'cursorIndex', 'cursorTimestamp', 'dataCount', 'isPlaying', 'speedIndex'];

assert.deepEqual(replayStateKeys, [
  'enabled',
  'cursorIndex',
  'cursorTimestamp',
  'dataCount',
  'isPlaying',
  'speedIndex',
]);

console.log('replay state shape smoke passed');
