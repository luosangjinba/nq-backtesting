import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SessionIdentityError,
  createSessionId,
  deserializeSessionId,
  requireSessionId,
  serializeSessionId,
  sessionIdsEqual,
} from '../src/session-identity/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/session-identity/negative/cases.json'),
  'utf8',
));

const sessionA = createSessionId('session-A');
const equivalentA = createSessionId('session-A');
const sessionB = createSessionId('session-B');

assert.equal(Object.isFrozen(sessionA), true, 'SessionId must be immutable');
assert.equal(requireSessionId(sessionA), sessionA, 'validation must preserve the branded value');
assert.equal(sessionIdsEqual(sessionA, equivalentA), true, 'equal opaque tokens identify the same Session');
assert.equal(sessionIdsEqual(sessionA, sessionB), false, 'different Session tokens must never compare equal');
assert.deepEqual(JSON.parse(JSON.stringify(sessionA)), {}, 'opaque SessionId must not serialize implicitly');

const serializedA = serializeSessionId(sessionA);
assert.equal(Object.isFrozen(serializedA), true, 'wire representation must be immutable');
assert.deepEqual(serializedA, { schema: 'v7.session-id', version: 1, value: 'session-A' });
assert.equal(
  sessionIdsEqual(deserializeSessionId(JSON.parse(JSON.stringify(serializedA))), sessionA),
  true,
  'explicit versioned serialization must round-trip',
);

const operations = {
  create: createSessionId,
  deserialize: deserializeSessionId,
  require: requireSessionId,
};
for (const fixture of negativeCases) {
  assert.throws(
    () => operations[fixture.operation](fixture.value),
    (error) => error instanceof SessionIdentityError && error.code === fixture.expectedCode,
    `${fixture.name} must fail with ${fixture.expectedCode}`,
  );
}

assert.throws(
  () => requireSessionId(Object.create(Object.getPrototypeOf(sessionA))),
  (error) => error instanceof SessionIdentityError && error.code === 'SESSION_ID_REQUIRED',
  'a prototype-forged value must not acquire the private Session identity brand',
);

console.log(`v7 Session identity harness passed (${negativeCases.length + 1} negative controls)`);
