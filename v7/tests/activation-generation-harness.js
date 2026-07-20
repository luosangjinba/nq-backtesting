import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActivationGenerationError,
  activationGenerationsEqual,
  createActivationGeneration,
  deserializeActivationGeneration,
  nextActivationGeneration,
  requireActivationGeneration,
  serializeActivationGeneration,
} from '../src/activation-generation/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/activation-generation/negative/cases.json'),
  'utf8',
));

const first = createActivationGeneration(1);
const equivalentFirst = createActivationGeneration(1);
const second = nextActivationGeneration(first);

assert.equal(Object.isFrozen(first), true, 'activation generation must be immutable');
assert.equal(requireActivationGeneration(first), first, 'validation must preserve the branded value');
assert.equal(activationGenerationsEqual(first, equivalentFirst), true, 'equal ordinals must compare equal');
assert.equal(activationGenerationsEqual(first, second), false, 'a new activation must have a new generation');
assert.deepEqual(JSON.parse(JSON.stringify(first)), {}, 'generation must not serialize implicitly');
assert.deepEqual(serializeActivationGeneration(second), {
  schema: 'v7.activation-generation',
  version: 1,
  value: 2,
});
assert.equal(
  activationGenerationsEqual(
    deserializeActivationGeneration(JSON.parse(JSON.stringify(serializeActivationGeneration(second)))),
    second,
  ),
  true,
  'explicit versioned serialization must round-trip',
);

const operations = {
  create: createActivationGeneration,
  deserialize: deserializeActivationGeneration,
  require: requireActivationGeneration,
};
for (const fixture of negativeCases) {
  assert.throws(
    () => operations[fixture.operation](fixture.value),
    (error) => error instanceof ActivationGenerationError && error.code === fixture.expectedCode,
    `${fixture.name} must fail with ${fixture.expectedCode}`,
  );
}

assert.throws(
  () => requireActivationGeneration(Object.create(Object.getPrototypeOf(first))),
  (error) => error instanceof ActivationGenerationError
    && error.code === 'ACTIVATION_GENERATION_REQUIRED',
  'a prototype-forged value must not acquire the private activation-generation brand',
);
assert.throws(
  () => nextActivationGeneration(createActivationGeneration(Number.MAX_SAFE_INTEGER)),
  (error) => error instanceof ActivationGenerationError
    && error.code === 'ACTIVATION_GENERATION_EXHAUSTED',
  'generation overflow must fail instead of wrapping or losing integer precision',
);

console.log(`v7 activation generation harness passed (${negativeCases.length + 2} negative controls)`);
