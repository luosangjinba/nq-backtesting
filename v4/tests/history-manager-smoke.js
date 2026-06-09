import assert from 'node:assert/strict';

const { canUndo, recordHistory } = await import('../src/history/history-manager.js');

assert.equal(canUndo(), false);
recordHistory('No-op', () => undefined);
assert.equal(canUndo(), false);

console.log('history manager smoke passed');
