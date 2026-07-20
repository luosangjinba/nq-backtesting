import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TransactionIdentityError,
  createTransactionId,
  deserializeTransactionId,
  requireTransactionId,
  serializeTransactionId,
  transactionIdsEqual,
} from '../src/transaction-identity/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/transaction-identity/negative/cases.json'),
  'utf8',
));

const first = createTransactionId('tx-1');
const equivalentFirst = createTransactionId('tx-1');
const second = createTransactionId('tx-2');

assert.equal(Object.isFrozen(first), true, 'TransactionId must be immutable');
assert.equal(requireTransactionId(first), first, 'validation must preserve the branded value');
assert.equal(transactionIdsEqual(first, equivalentFirst), true, 'equal tokens must compare equal');
assert.equal(transactionIdsEqual(first, second), false, 'distinct transactions must not compare equal');
assert.deepEqual(JSON.parse(JSON.stringify(first)), {}, 'TransactionId must not serialize implicitly');
assert.equal(
  transactionIdsEqual(
    deserializeTransactionId(JSON.parse(JSON.stringify(serializeTransactionId(first)))),
    first,
  ),
  true,
  'explicit versioned serialization must round-trip',
);

const operations = { create: createTransactionId, deserialize: deserializeTransactionId, require: requireTransactionId };
for (const fixture of negativeCases) {
  assert.throws(
    () => operations[fixture.operation](fixture.value),
    (error) => error instanceof TransactionIdentityError && error.code === fixture.expectedCode,
    `${fixture.name} must fail with ${fixture.expectedCode}`,
  );
}
assert.throws(
  () => requireTransactionId(Object.create(Object.getPrototypeOf(first))),
  (error) => error instanceof TransactionIdentityError && error.code === 'TRANSACTION_ID_REQUIRED',
  'a prototype-forged value must not acquire the private TransactionId brand',
);

console.log(`v7 transaction identity harness passed (${negativeCases.length + 1} negative controls)`);
