import assert from 'node:assert/strict';
import { readSessionSetupForm } from '../src/features/session-setup/session-setup-model.js';

class TestFormData {
  constructor(form) {
    this.form = form;
  }

  get(name) {
    return this.form[name] ?? null;
  }
}

globalThis.FormData = TestFormData;

const payload = readSessionSetupForm({
  instrument: 'nq',
  timeframe: '1',
  sessionStart: '2026-06-01T09:30',
  sessionEnd: '2026-06-05T16:00',
});

assert.equal(payload.instrument, 'NQ');
assert.equal(payload.timeframe, 1);
assert.equal(payload.sessionStart, '2026-06-01 09:30');
assert.equal(payload.sessionEnd, '2026-06-05 16:00');

assert.throws(() => readSessionSetupForm({
  instrument: 'NQ',
  timeframe: '1',
  sessionStart: '2026-06-05T16:00',
  sessionEnd: '2026-06-01T09:30',
}), /before/);

assert.throws(() => readSessionSetupForm({
  instrument: 'NQ',
  timeframe: 'bad',
  sessionStart: '2026-06-01T09:30',
  sessionEnd: '2026-06-05T16:00',
}), /timeframe/);

assert.throws(() => readSessionSetupForm({
  instrument: 'NQ',
  timeframe: '1',
  sessionStart: '2026-02-31T09:30',
  sessionEnd: '2026-06-05T16:00',
}), /valid date/);

console.log('v5 session setup model smoke passed');
