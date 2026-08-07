import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const shellPolicy = path.join(repositoryRoot, 'v7/deploy/linux/lib/resource-profile.sh');
const serverRoot = path.join(repositoryRoot, 'v7/server');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  repositoryRoot,
  'v7/tests/fixtures/resource-profile/negative/cases.json',
), 'utf8'));
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-resource-profile-'));
const duckdbTemporaryDirectory = path.join(temporaryDirectory, 'duckdb-tmp');
fs.mkdirSync(duckdbTemporaryDirectory);

function selectProfile(memoryMib, cpuCount = 4) {
  return spawnSync('bash', ['-c', [
    'set -Eeuo pipefail',
    'source "$1"',
    'replay_lab_select_resource_profile "$2" "$3"',
  ].join('\n'), 'bash', shellPolicy, String(memoryMib), String(cpuCount)], { encoding: 'utf8' });
}

function pythonConfig(environment = {}, includeDuckdbProbe = false) {
  const script = includeDuckdbProbe ? [
    'import json, duckdb',
    'from duckdb_runtime import duckdb_connection_config',
    'config = duckdb_connection_config()',
    'connection = duckdb.connect(":memory:", config=config)',
    'settings = connection.execute("select current_setting(\'threads\'), current_setting(\'temp_directory\')").fetchone()',
    'connection.close()',
    'print(json.dumps({"config": config, "threads": settings[0], "temp": settings[1]}))',
  ].join('\n') : [
    'import json',
    'from duckdb_runtime import duckdb_connection_config',
    'print(json.dumps(duckdb_connection_config()))',
  ].join('\n');
  return spawnSync('python3', ['-c', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONPATH: serverRoot,
      V7_DUCKDB_MEMORY_LIMIT: '',
      V7_DUCKDB_THREADS: '',
      V7_DUCKDB_TEMP_DIRECTORY: '',
      ...environment,
    },
  });
}

try {
  const compact = selectProfile(450, 1);
  assert.equal(compact.status, 0, compact.stderr);
  assert.equal(compact.stdout.trim(), 'compact-512m\t128MB\t1\t2048');

  const small = selectProfile(1024, 8);
  assert.equal(small.status, 0, small.stderr);
  assert.equal(small.stdout.trim(), 'small-1g\t256MB\t1\t1024');

  const balancedCpuBound = selectProfile(2048, 1);
  assert.equal(balancedCpuBound.status, 0, balancedCpuBound.stderr);
  assert.equal(balancedCpuBound.stdout.trim(), 'balanced-2g\t512MB\t1\t512');

  const standard = selectProfile(4096, 8);
  assert.equal(standard.status, 0, standard.stderr);
  assert.equal(standard.stdout.trim(), 'standard-4g-plus\t1024MB\t4\t0');

  const configured = pythonConfig({
    V7_DUCKDB_MEMORY_LIMIT: '128MB',
    V7_DUCKDB_THREADS: '1',
    V7_DUCKDB_TEMP_DIRECTORY: duckdbTemporaryDirectory,
  }, true);
  assert.equal(configured.status, 0, configured.stderr);
  const configuredPayload = JSON.parse(configured.stdout);
  assert.equal(configuredPayload.config.memory_limit, '128MB');
  assert.equal(configuredPayload.config.threads, '1');
  assert.equal(configuredPayload.config.temp_directory, duckdbTemporaryDirectory);
  assert.equal(Number(configuredPayload.threads), 1);
  assert.equal(configuredPayload.temp, duckdbTemporaryDirectory);

  for (const fixture of negativeCases) {
    const result = fixture.kind === 'shell-profile'
      ? selectProfile(fixture.memoryMib, 1)
      : pythonConfig(fixture.environment);
    assert.notEqual(result.status, 0, `${fixture.id} must fail closed`);
    assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(fixture.expected));
  }

  console.log('resource profile harness passed');
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
