import assert from 'node:assert/strict';
import { parseLoadedWindowDateTimeLocal } from '../src/date-locator/loaded-window-date-locator-input.js';

assert.equal(parseLoadedWindowDateTimeLocal('2026-05-06T09:30'), '2026-05-06T09:30:00.000Z');
assert.equal(parseLoadedWindowDateTimeLocal('2026-05-06T09:30:45'), '2026-05-06T09:30:45.000Z');
assert.throws(() => parseLoadedWindowDateTimeLocal('2026-02-30T09:30'), /valid UTC date/);
assert.throws(() => parseLoadedWindowDateTimeLocal(''), /valid UTC date/);

console.log('v6 loaded-window date locator input step402 smoke passed');
