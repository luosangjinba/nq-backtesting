import assert from 'node:assert/strict';
import {
  formatLocalDateTimeValue,
  parseLocalDateTimeValue,
} from '../src/session-browser-ui/date-time-control.js';

assert.equal(Number.isNaN(parseLocalDateTimeValue('')), true, 'an empty control must stay empty');
assert.equal(Number.isNaN(parseLocalDateTimeValue('not-a-date')), true, 'invalid text must not become a Session epoch');

const minuteValue = '2026-07-20T09:31';
const minuteEpoch = parseLocalDateTimeValue(minuteValue);
assert.equal(Number.isFinite(minuteEpoch), true);
assert.equal(formatLocalDateTimeValue(minuteEpoch), minuteValue, 'minute precision must round-trip local wall time');

const secondValue = '2026-07-20T09:31:42';
const secondEpoch = parseLocalDateTimeValue(secondValue);
assert.equal(formatLocalDateTimeValue(secondEpoch, 'second'), secondValue,
  'the boundary must support future second-level controls without Session creation changes');

assert.throws(() => formatLocalDateTimeValue(Number.NaN), /finite/);
assert.throws(() => formatLocalDateTimeValue(minuteEpoch, 'tick'), /unsupported/);

console.log('v7 Session Browser date-time control harness passed (empty, invalid, minute, second)');
