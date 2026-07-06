import assert from 'node:assert/strict';
import { readSessionSetupForm } from '../src/shell/session-setup-model.js';

function makeForm(fields) {
  return {
    [Symbol.iterator]: function* iterator() {
      yield* Object.entries(fields);
    },
  };
}

const originalFormData = globalThis.FormData;
globalThis.FormData = class FormDataForTest {
  constructor(form) {
    this.fields = new Map([...form]);
  }

  get(name) {
    return this.fields.get(name) ?? null;
  }
};

try {
  const payload = readSessionSetupForm(makeForm({
    endTime: '2026-06-05T16:00',
    startTime: '2026-06-01T09:30',
  }));
  assert.equal(payload.startTime, new Date('2026-06-01T09:30').toISOString());
  assert.equal(payload.endTime, new Date('2026-06-05T16:00').toISOString());

  assert.throws(
    () => readSessionSetupForm(makeForm({
      endTime: '2026-06-01T09:30',
      startTime: '2026-06-05T16:00',
    })),
    /Start must be before End/
  );
  assert.throws(
    () => readSessionSetupForm(makeForm({
      endTime: '2026-06-05T16:00',
      startTime: '',
    })),
    /Start is required/
  );
  assert.throws(
    () => readSessionSetupForm(makeForm({
      endTime: '2026-06-05T16:00',
      startTime: '2026-02-31T09:30',
    })),
    /Start must be a valid date\/time/
  );
} finally {
  globalThis.FormData = originalFormData;
}

console.log('v6 session setup model smoke passed');
