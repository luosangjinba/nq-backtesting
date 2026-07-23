import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLayoutSync,
  deserializeLayoutSync,
  LayoutSyncDomainError,
  readLayoutSync,
  serializeLayoutSync,
  setLayoutSync,
} from '../src/layout-sync-domain/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

const defaults = createLayoutSync();
assert.deepEqual(readLayoutSync(defaults), {
  symbol: true,
  interval: false,
  crosshair: false,
  time: false,
  dateRange: false,
});

const crosshair = setLayoutSync(defaults, 'crosshair', true);
assert.notEqual(crosshair, defaults);
assert.equal(readLayoutSync(crosshair).crosshair, true);
assert.equal(readLayoutSync(crosshair).symbol, true);
assert.equal(setLayoutSync(crosshair, 'crosshair', true), crosshair,
  'an unchanged policy retains value identity');
assert.deepEqual(readLayoutSync(deserializeLayoutSync(serializeLayoutSync(crosshair))),
  readLayoutSync(crosshair));

const cases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/layout-sync-domain/negative/cases.json'),
  'utf8',
));
const operations = {
  readForged: () => readLayoutSync({}),
  createExtra: () => createLayoutSync({ ...readLayoutSync(defaults), extra: false }),
  createNonBoolean: () => createLayoutSync({ ...readLayoutSync(defaults), time: 'yes' }),
  setUnknown: () => setLayoutSync(defaults, 'orders', true),
  setNonBoolean: () => setLayoutSync(defaults, 'time', 1),
  deserializeVersion: () => deserializeLayoutSync({ ...serializeLayoutSync(defaults), version: 2 }),
  deserializeExtra: () => deserializeLayoutSync({ ...serializeLayoutSync(defaults), extra: false }),
};
for (const fixture of cases) {
  assert.throws(operations[fixture.operation], (error) => {
    assert.ok(error instanceof LayoutSyncDomainError, fixture.name);
    assert.equal(error.code, fixture.expectedCode, fixture.name);
    return true;
  });
}

console.log(`v7 Layout Sync Domain harness passed (${cases.length} negative controls)`);
