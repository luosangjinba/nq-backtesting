import assert from 'node:assert/strict';
import {
  COMMANDS,
  executeCommand,
  loadAdjacentPrimaryWindowCommand,
  loadPrimaryRangeCommand,
  setPrimaryTimeframeCommand,
} from '../src/runtime/commands.js';

await assert.rejects(
  () => loadPrimaryRangeCommand({ start: '', end: '2026-01-01', timeframe: 1 }),
  /requires start and end/
);

assert.throws(
  () => executeCommand('missing.command', {}),
  /Unknown runtime command/
);

const noWindow = await loadAdjacentPrimaryWindowCommand({ direction: 'prev' });
assert.equal(noWindow.ok, false);
assert.equal(typeof noWindow.message, 'string');

assert.equal(executeCommand(COMMANDS.SET_PRIMARY_TIMEFRAME, { timeframe: 5 }), 5);
assert.ok(setPrimaryTimeframeCommand({ timeframe: 'bad' }) > 0);

console.log('runtime commands smoke passed');
