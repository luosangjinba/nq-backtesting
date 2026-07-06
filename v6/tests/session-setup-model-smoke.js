import assert from 'node:assert/strict';
import { readSessionSetupForm } from '../src/shell/session-setup-model.js';

class FakeFormData {
  constructor(form) {
    this.data = form.data;
  }

  get(name) {
    const value = this.data[name];
    return Array.isArray(value) ? value[0] : value;
  }

  getAll(name) {
    const value = this.data[name];
    return Array.isArray(value) ? value : value === undefined ? [] : [value];
  }
}

function createForm(data) {
  return { data };
}

globalThis.FormData = FakeFormData;

const form = createForm({
  accountBalance: '100000',
  endTime: '2026-07-05T16:00',
  name: 'abc',
  startTime: '2026-07-01T09:30',
  symbols: ['nq', 'es'],
});

assert.deepEqual(readSessionSetupForm(form), {
  accountBalance: 100000,
  autoUpdateEndDate: false,
  endTime: '2026-07-05T23:00:00.000Z',
  name: 'abc',
  startTime: '2026-07-01T16:30:00.000Z',
  symbol: 'NQ',
  symbols: ['NQ', 'ES'],
});

const autoEndForm = createForm({
  autoUpdateEndDate: 'on',
  computedEndTime: '2026-07-05T09:30',
  endTime: '',
  name: 'abc',
  startTime: '2026-07-01T09:30',
  symbols: 'nq',
});

assert.equal(readSessionSetupForm(autoEndForm).autoUpdateEndDate, true);
assert.equal(readSessionSetupForm(autoEndForm).endTime, '2026-07-05T16:30:00.000Z');

assert.throws(
  () => readSessionSetupForm(createForm({
    endTime: '2026-07-05T16:00',
    name: '',
    startTime: '2026-07-01T09:30',
    symbols: 'nq',
  })),
  /Name is required/
);

assert.throws(
  () => readSessionSetupForm(createForm({
    endTime: '2026-07-05T16:00',
    name: 'abc',
    startTime: '2026-07-01T09:30',
  })),
  /Assets are required/
);

console.log('v6 session setup model smoke passed');
