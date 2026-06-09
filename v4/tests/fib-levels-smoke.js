import assert from 'node:assert/strict';
import {
  getVisibleFibLevels,
  getDefaultFibLevels,
  normalizeFibLevels,
  updateFibLevel,
} from '../src/pda/fib-levels.js';

const defaults = getDefaultFibLevels();
assert.equal(defaults.length >= 20, true);
assert.equal(defaults[0].value, 1);
assert.equal(defaults[0].visible, true);
assert.deepEqual(
  defaults.filter((level) => level.visible).map((level) => level.value),
  [1, 0.79, 0.705, 0.62, 0.5, 0.236, 0]
);
assert.deepEqual(defaults.slice(-8).map((level) => level.value), [1.5, 2, 2.5, 3.5, 4, 4.5, 5, 6]);
assert.equal(defaults.slice(-8).every((level) => level.visible === false), true);

const normalized = normalizeFibLevels([
  { value: 0.705, visible: false, color: '#ABCDEF' },
  { value: 9.99, visible: true, color: '#123456' },
]);

assert.equal(normalized.length, defaults.length);
assert.equal(normalized[0].value, 0.705);
assert.equal(normalized[0].visible, false);
assert.equal(normalized[0].color, '#abcdef');
assert.equal(normalized[1].value, 9.99);
assert.equal(normalized[2].value, defaults[2].value);

const updated = updateFibLevel(normalized, 0, { value: 1.1, visible: false, color: '#654321' });
assert.equal(updated[0].value, 1.1);
assert.equal(updated[0].visible, false);
assert.equal(updated[0].color, '#654321');
assert.equal(normalizeFibLevels(updated)[0].value, 1.1);
assert.equal(normalizeFibLevels(updated).some((level, index) => index !== 0 && level.value === 1), false);

assert.equal(getVisibleFibLevels(updated).some((level) => level.value === 1.1), false);
assert.equal(getVisibleFibLevels(updated).every((level) => level.visible !== false), true);

assert.equal(normalizeFibLevels([{ value: 12, visible: true }]).some((level) => level.value === 12), true);
assert.equal(normalizeFibLevels([{ value: -12, visible: true }]).some((level) => level.value === -12), true);
assert.equal(normalizeFibLevels([{ value: 12.001, visible: true }]).some((level) => level.value === 12.001), false);
assert.equal(normalizeFibLevels([{ value: -12.001, visible: true }]).some((level) => level.value === -12.001), false);

console.log('fib levels smoke passed');
