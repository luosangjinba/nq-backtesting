import assert from 'node:assert/strict';
import {
  getDefaultFibLevels,
  normalizeFibLevels,
  updateFibLevel,
} from '../src/pda/fib-levels.js';

const defaults = getDefaultFibLevels();
assert.equal(defaults.length >= 20, true);
assert.equal(defaults[0].value, 1);
assert.equal(defaults[0].visible, true);

const normalized = normalizeFibLevels([
  { value: 0.705, visible: false, color: '#ABCDEF' },
  { value: 9.99, visible: true, color: '#123456' },
]);

assert.equal(normalized.length, defaults.length + 1);
assert.equal(normalized.find((level) => level.value === 0.705)?.visible, false);
assert.equal(normalized.find((level) => level.value === 0.705)?.color, '#abcdef');
assert.equal(normalized.at(-1).value, 9.99);

const updated = updateFibLevel(normalized, 0, { value: 1.1, visible: false, color: '#654321' });
assert.equal(updated[0].value, 1.1);
assert.equal(updated[0].visible, false);
assert.equal(updated[0].color, '#654321');

console.log('fib levels smoke passed');
