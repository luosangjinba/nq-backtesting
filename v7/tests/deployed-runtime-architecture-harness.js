import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeployedRuntimeArchitecture } from './support/deployed-runtime-architecture-validator.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, relativePath), 'utf8',
));
const manifest = readJson('v7/docs/v7-deployed-runtime-manifest.json');
const negativeFixture = readJson(
  'v7/tests/fixtures/deployed-runtime-architecture/negative/cases.json',
);
const validate = (candidate) => validateDeployedRuntimeArchitecture(candidate, repositoryRoot);
assert.deepEqual(validate(manifest), []);
assert.equal(negativeFixture.schemaVersion, 1);
assert.ok(Array.isArray(negativeFixture.cases) && negativeFixture.cases.length > 0);

function selectPath(root, tokens) {
  return tokens.reduce((current, token) => {
    if (typeof token === 'string') {
      assert.ok(current !== null && typeof current === 'object' && token in current,
        `fixture path segment ${token} must exist`);
      return current[token];
    }
    assert.ok(Array.isArray(current), 'object selectors may only address arrays');
    const matches = current.filter((entry) => Object.entries(token).every(
      ([key, value]) => entry?.[key] === value,
    ));
    assert.equal(matches.length, 1, `fixture selector ${JSON.stringify(token)} must match once`);
    return matches[0];
  }, root);
}

const mutationOperations = Object.freeze({
  append(candidate, mutation) {
    const target = selectPath(candidate, mutation.path);
    assert.ok(Array.isArray(target), 'append target must be an array');
    target.push(structuredClone(mutation.value));
  },
  remove(candidate, mutation) {
    const target = selectPath(candidate, mutation.path);
    assert.ok(Array.isArray(target), 'remove target must be an array');
    const index = target.findIndex((value) => value === mutation.value);
    assert.notEqual(index, -1, `remove value ${JSON.stringify(mutation.value)} must exist`);
    target.splice(index, 1);
  },
  removeObject(candidate, mutation) {
    const target = selectPath(candidate, mutation.path);
    assert.ok(Array.isArray(target), 'removeObject target must be an array');
    const matches = target.map((entry, index) => ({ entry, index })).filter(({ entry }) => (
      Object.entries(mutation.match).every(([key, value]) => entry?.[key] === value)
    ));
    assert.equal(matches.length, 1, `removeObject ${JSON.stringify(mutation.match)} must match once`);
    target.splice(matches[0].index, 1);
  },
  set(candidate, mutation) {
    assert.ok(Array.isArray(mutation.path) && mutation.path.length > 0, 'set path is required');
    const key = mutation.path.at(-1);
    assert.equal(typeof key, 'string', 'set path must end with a property name');
    const parent = selectPath(candidate, mutation.path.slice(0, -1));
    assert.ok(parent !== null && typeof parent === 'object' && key in parent,
      `set property ${key} must exist`);
    parent[key] = structuredClone(mutation.value);
  },
});

const caseIds = new Set();
for (const testCase of negativeFixture.cases) {
  assert.equal(typeof testCase.id, 'string');
  assert.equal(caseIds.has(testCase.id), false, `duplicate negative fixture id ${testCase.id}`);
  caseIds.add(testCase.id);
  assert.equal(typeof testCase.expectedFailureCode, 'string');
  const operation = mutationOperations[testCase.mutation?.operation];
  assert.equal(typeof operation, 'function', `${testCase.id} mutation operation must be supported`);
  const candidate = structuredClone(manifest);
  operation(candidate, testCase.mutation);
  const codes = validate(candidate).map((finding) => finding.code);
  assert.ok(
    codes.includes(testCase.expectedFailureCode),
    `${testCase.id} must fail with ${testCase.expectedFailureCode}; got ${codes.join(', ')}`,
  );
}

const declaredSmokes = [...new Map(manifest.crossRuntimeSmokes.map((smoke) => [
  `${smoke.runtime}:${smoke.path}:${smoke.successText}`,
  smoke,
])).values()];
assert.ok(declaredSmokes.length > 0, 'the cross-runtime gate must execute a native boundary smoke');
const pythonExecutable = process.env.V7_PYTHON_BIN ?? process.env.PYTHON ?? 'python3';
const runtimeCommands = Object.freeze({ node: process.execPath, python: pythonExecutable });
const smokeFailures = [];
for (const smoke of declaredSmokes) {
  const executable = runtimeCommands[smoke.runtime];
  assert.equal(typeof executable, 'string', `unsupported smoke runtime ${smoke.runtime}`);
  const result = spawnSync(executable, [smoke.path], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0 || !result.stdout.includes(smoke.successText)) {
    smokeFailures.push([
      `${smoke.path} failed or did not report ${JSON.stringify(smoke.successText)}`,
      result.stdout ?? '',
      result.stderr ?? '',
    ].join('\n'));
  }
}
assert.deepEqual(smokeFailures, [], smokeFailures.join('\n\n'));

console.log('v7 deployed runtime architecture harness passed', {
  components: manifest.components.length,
  crossRuntimeSmokes: declaredSmokes.length,
  negativeControls: negativeFixture.cases.length,
  proxyRoutes: manifest.proxyRoutes.length,
  serviceUnits: manifest.serviceUnits.length,
  writerSurfaces: Object.keys(manifest.writerInventories).length,
});
