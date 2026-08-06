import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateProductionRegressionMatrix } from './support/production-regression-matrix-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, relativePath), 'utf8'),
);
const model = readJson('docs/v7-production-regression-matrix.json');
const validate = (candidate) => validateProductionRegressionMatrix(candidate, {
  pathExists: (relativePath) => fs.existsSync(path.join(V7_ROOT, relativePath)),
});

assert.deepEqual(validate(model), [],
  'the production regression matrix must be executable with an exact result inventory');

const negative = readJson('tests/fixtures/production-regression-matrix/negative/cases.json');
for (const testCase of negative.cases) {
  const invalid = structuredClone(model);
  const scenario = invalid.scenarios.find(({ id }) => id === testCase.scenarioId);
  if (testCase.operation === 'remove-axis-coverage') {
    for (const entry of invalid.scenarios) {
      if (Array.isArray(entry.covers?.[testCase.axis])) {
        entry.covers[testCase.axis] = entry.covers[testCase.axis]
          .filter((value) => value !== testCase.value);
      }
    }
  } else if (testCase.operation === 'replace-execution-kind') {
    scenario.executionKind = testCase.value;
  } else if (testCase.operation === 'remove-scenario') {
    invalid.scenarios = invalid.scenarios.filter(({ id }) => id !== testCase.scenarioId);
  } else if (testCase.operation === 'disable-dynamic-failure') {
    scenario.failureInjection.dynamic = false;
  } else if (testCase.operation === 'replace-harness') {
    scenario.harness = testCase.value;
  } else if (testCase.operation === 'remove-human-acceptance') {
    invalid.status = 'accepted';
    invalid.humanAcceptanceEvidence = null;
  } else if (testCase.operation === 'mark-accepted') {
    invalid.status = 'accepted';
  } else if (testCase.operation === 'remove-runtime-dependency') {
    delete invalid.runtimeDependencies.v4ReadApi;
  } else {
    assert.fail(`unknown production matrix negative operation ${testCase.operation}`);
  }
  const codes = validate(invalid).map(({ code }) => code);
  assert.ok(codes.includes(testCase.expectedFailureCode),
    `${testCase.name} must fail with ${testCase.expectedFailureCode}; got ${codes.join(', ')}`);
}

const repositoryRoot = path.resolve(V7_ROOT, '..');
const runtimeDependency = model.runtimeDependencies.v4ReadApi;
let lastV4HealthDiagnostic = 'not checked';

async function v4Health() {
  try {
    const response = await fetch(`${runtimeDependency.baseUrl}${runtimeDependency.healthPath}`, {
      signal: AbortSignal.timeout(2_000),
    });
    const payload = response.ok ? await response.json() : null;
    const healthy = payload?.databaseReady === true
      && typeof payload?.[runtimeDependency.requiredRevisionField] === 'string'
      && payload[runtimeDependency.requiredRevisionField].length > 0;
    lastV4HealthDiagnostic = JSON.stringify({ healthy, status: response.status, payload });
    return healthy;
  } catch (error) {
    const cause = error?.cause;
    lastV4HealthDiagnostic = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`
      + (cause ? `; cause=${cause?.code ?? cause?.name ?? 'Error'}:${cause?.message ?? String(cause)}` : '');
    return false;
  }
}

async function waitForV4(child) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await v4Health()) return;
    if (child.exitCode !== null) throw new Error(`V4 read API exited with ${child.exitCode}.`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for the V4 read API datasetRevision health contract.');
}

async function ensureV4ReadApi() {
  const existingDeadline = Date.now() + 5_000;
  while (Date.now() < existingDeadline) {
    if (await v4Health()) return null;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const databasePath = process.env[runtimeDependency.databaseEnvironmentVariable]
    ?? path.join(repositoryRoot, 'v4/data/trading_data.duckdb');
  assert.ok(fs.existsSync(databasePath),
    `Set ${runtimeDependency.databaseEnvironmentVariable} to a readable acceptance DuckDB. `
      + `Existing V4 health: ${lastV4HealthDiagnostic}`);
  const child = spawn(process.env.PYTHON ?? 'python3', [
    path.join(repositoryRoot, runtimeDependency.startEntry),
  ], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      V4_API_HOST: '127.0.0.1',
      V4_API_PORT: '8766',
      V4_TRADING_DB: path.resolve(databasePath),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let startupOutput = '';
  child.stdout.on('data', (chunk) => { startupOutput += String(chunk); });
  child.stderr.on('data', (chunk) => { startupOutput += String(chunk); });
  try {
    await waitForV4(child);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\n${startupOutput}`);
  }
  console.log(`matrix dependency ready: ${runtimeDependency.baseUrl} (${path.resolve(databasePath)})`);
  return child;
}

function runScenario(scenario, timeoutMs = 240_000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(V7_ROOT, scenario.harness)], {
      cwd: repositoryRoot,
      detached: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let timedOut = false;
    const append = (chunk) => { output += String(chunk); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGTERM'); } catch {}
      setTimeout(() => {
        if (child.exitCode === null) {
          try { process.kill(-child.pid, 'SIGKILL'); } catch {}
        }
      }, 5_000).unref();
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolve(Object.freeze({ code, output, signal, timedOut }));
    });
  });
}

const knownFailures = new Map((model.knownFailures ?? []).map((known) => [known.scenarioId, known]));
const ownedV4 = await ensureV4ReadApi();
try {
  for (const scenario of model.scenarios) {
    console.log(`running scenario: ${scenario.id}`);
    const result = await runScenario(scenario);
    assert.equal(result.timedOut, false,
      `${scenario.id} exceeded its 240000ms hard timeout:\n${result.output}`);
    const known = knownFailures.get(scenario.id);
    if (known) {
      assert.notEqual(result.code, 0,
        `${scenario.id} unexpectedly passed; remove its known-failure record`);
      assert.match(result.output, new RegExp(known.outputPattern),
        `${scenario.id} failed differently from ${known.bugId}`);
      console.log(`known failure reproduced: ${scenario.id} (${known.bugId})`);
    } else {
      assert.equal(result.code, 0,
        `${scenario.id} failed outside the declared known-failure inventory:\n${result.output}`);
      console.log(`scenario passed: ${scenario.id}`);
    }
  }
} finally {
  if (ownedV4 !== null) {
    ownedV4.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => ownedV4.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
}

console.log('v7 production regression matrix harness passed', {
  axes: Object.keys(model.axes).length,
  negativeControls: negative.cases.length,
  productionScenarios: model.scenarios.length,
});
