import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const serviceScript = path.join(repositoryRoot, 'v7/server/database_import_api.py');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-database-import-'));

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startService(name, enabled = true) {
  const root = path.join(temporaryRoot, name);
  const target = path.join(root, 'market', 'trading_data.duckdb');
  const staging = path.join(root, 'staging');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const port = await reservePort();
  const argumentsList = [
    serviceScript,
    '--db', target,
    '--staging-root', staging,
    '--port', String(port),
    '--max-upload-bytes', '10000000',
  ];
  if (enabled) argumentsList.push('--enabled');
  const child = spawn('python3', argumentsList, {
    cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`database import service exited: ${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v7/database/health`);
      if (response.ok) return { child, port, root, staging, target };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  child.kill('SIGKILL');
  throw new Error(`database import service did not start: ${output}`);
}

async function stopService(service) {
  if (service.child.exitCode !== null) return;
  const exited = new Promise((resolve) => service.child.once('exit', resolve));
  service.child.kill('SIGTERM');
  await exited;
}

function endpoint(service, route) {
  return `http://127.0.0.1:${service.port}${route}`;
}

function upload(service, filename, body, userId = 'reviewer', contentType = 'text/csv') {
  const headers = {
    'Content-Type': contentType,
    'X-Replay-Lab-File-Name': filename,
  };
  if (userId !== null) headers['X-Replay-Lab-User'] = userId;
  return fetch(endpoint(service, '/v7/database/import/upload'), {
    body,
    headers,
    method: 'PUT',
  });
}

function post(service, route, payload, userId = 'reviewer') {
  const headers = { 'Content-Type': 'application/json' };
  if (userId !== null) headers['X-Replay-Lab-User'] = userId;
  return fetch(endpoint(service, route), {
    body: JSON.stringify(payload),
    headers,
    method: 'POST',
  });
}

async function waitForTerminal(service, uploadId) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const response = await fetch(endpoint(
      service,
      `/v7/database/import/status?uploadId=${encodeURIComponent(uploadId)}`,
    ), { headers: { 'X-Replay-Lab-User': 'reviewer' } });
    assert.equal(response.status, 200);
    const job = await response.json();
    if (['ready', 'failed'].includes(job.state)) return job;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail('database preparation did not reach a terminal state');
}

let csvService = await startService('csv');
let duckdbService;
let disabledService;
try {
  const initialHealth = await (await fetch(endpoint(csvService, '/v7/database/health'))).json();
  assert.equal(initialHealth.databaseReady, false);
  assert.equal(initialHealth.bootstrapEnabled, true);
  assert.deepEqual(initialHealth.requiredColumns,
    ['instrument', 'ts', 'open', 'high', 'low', 'close', 'volume']);
  assert.equal((await upload(csvService, 'market.csv', 'x', null)).status, 401);
  assert.equal((await upload(csvService, 'market.txt', 'x')).status, 415);
  fs.mkdirSync(csvService.target);
  const blockedHealth = await (await fetch(endpoint(csvService, '/v7/database/health'))).json();
  assert.equal(blockedHealth.databaseReady, false);
  assert.equal(blockedHealth.importAllowed, false, 'any pre-existing target path must block import');
  fs.rmdirSync(csvService.target);

  const duplicateCsv = [
    'instrument,ts,open,high,low,close,volume',
    'NQ,2026-01-02 09:30:00,100,102,99,101,10',
    'NQ,2026-01-02 09:30:00,100,102,99,101,11',
  ].join('\n');
  const duplicateUpload = await upload(csvService, 'duplicate.csv', duplicateCsv);
  assert.equal(duplicateUpload.status, 201);
  const duplicateJob = await duplicateUpload.json();
  assert.equal((await post(csvService, '/v7/database/import/prepare', {
    uploadId: duplicateJob.uploadId,
  })).status, 202);
  const duplicateResult = await waitForTerminal(csvService, duplicateJob.uploadId);
  assert.equal(duplicateResult.state, 'failed');
  assert.equal(duplicateResult.error.code, 'DATABASE_DUPLICATE_KEYS');
  assert.equal(
    fs.existsSync(path.join(csvService.staging, duplicateJob.uploadId, 'source.csv')),
    false,
    'rejected source must be removed after the validation report is persisted',
  );
  assert.equal(fs.existsSync(csvService.target), false, 'failed validation cannot create the target');

  const validCsv = [
    'instrument,ts,open,high,low,close,volume',
    'ES,2026-01-02 09:30:00,6000,6001,5999.5,6000.5,20',
    'NQ,2026-01-02 09:30:00,21000,21002,20999,21001,30',
    'NQ,2026-01-02 09:31:00,21001,21003,21000,21002,31',
  ].join('\n');
  const validUploadResponse = await upload(csvService, 'market.csv', validCsv);
  assert.equal(validUploadResponse.status, 201);
  const validUpload = await validUploadResponse.json();
  assert.equal(validUpload.kind, 'csv');
  assert.match(validUpload.sourceSha256, /^[a-f0-9]{64}$/);
  await stopService(csvService);
  csvService = await startService('csv');
  const restoredUpload = await (await fetch(endpoint(
    csvService,
    '/v7/database/import/current',
  ), { headers: { 'X-Replay-Lab-User': 'reviewer' } })).json();
  assert.equal(restoredUpload.uploadId, validUpload.uploadId,
    'the authenticated browser can recover its retained upload after service restart');
  assert.equal((await post(csvService, '/v7/database/import/prepare', {
    uploadId: validUpload.uploadId,
  })).status, 202);
  const prepared = await waitForTerminal(csvService, validUpload.uploadId);
  assert.equal(prepared.state, 'ready');
  assert.equal(prepared.summary.rows, 3);
  assert.deepEqual(prepared.summary.coverage.map(({ instrument }) => instrument), ['ES', 'NQ']);
  assert.equal((await post(csvService, '/v7/database/import/activate', {
    uploadId: validUpload.uploadId,
    confirmation: 'activate database',
  })).status, 400);
  const activatedResponse = await post(csvService, '/v7/database/import/activate', {
    uploadId: validUpload.uploadId,
    confirmation: 'ACTIVATE DATABASE',
  });
  assert.equal(activatedResponse.status, 200);
  assert.equal((await activatedResponse.json()).databaseReady, true);
  assert.equal(fs.existsSync(csvService.target), true);
  assert.equal((await upload(csvService, 'again.csv', validCsv)).status, 409,
    'an active target must permanently lock first-run upload');

  const readSmoke = spawnSync('python3', ['-c', [
    'import duckdb,sys',
    'c=duckdb.connect(sys.argv[1], read_only=True)',
    'print(c.execute("select count(*) from futures_1m").fetchone()[0])',
    'c.close()',
  ].join(';'), csvService.target], { encoding: 'utf8' });
  assert.equal(readSmoke.status, 0, readSmoke.stderr);
  assert.equal(readSmoke.stdout.trim(), '3');
  fs.unlinkSync(csvService.target);
  assert.equal((await upload(csvService, 'after-delete.csv', validCsv)).status, 409,
    'activation lock must survive removal of the active database path');
  const deletedTargetHealth = await (await fetch(endpoint(csvService, '/v7/database/health'))).json();
  assert.equal(deletedTargetHealth.databaseReady, false);
  assert.equal(deletedTargetHealth.activationLocked, true);
  assert.equal(deletedTargetHealth.importAllowed, false);
  await stopService(csvService);
  csvService = await startService('csv');
  assert.equal((await upload(csvService, 'after-restart.csv', validCsv)).status, 409,
    'activation lock must survive target removal and service restart');

  duckdbService = await startService('duckdb');
  const fixture = path.join(temporaryRoot, 'uploaded.duckdb');
  const createFixture = spawnSync('python3', ['-c', [
    'import duckdb,sys',
    'c=duckdb.connect(sys.argv[1])',
    'c.execute("create table futures_1m(instrument varchar, ts timestamp, open double, high double, low double, close double, volume bigint)")',
    'c.execute("insert into futures_1m values (?,?,?,?,?,?,?)", ["NQ", "2026-01-02 09:30:00", 1.0, 2.0, 0.5, 1.5, 4])',
    'c.close()',
  ].join(';'), fixture], { encoding: 'utf8' });
  assert.equal(createFixture.status, 0, createFixture.stderr);
  const duckdbUploadResponse = await upload(
    duckdbService,
    'uploaded.duckdb',
    fs.readFileSync(fixture),
    'reviewer',
    'application/octet-stream',
  );
  assert.equal(duckdbUploadResponse.status, 201);
  const duckdbUpload = await duckdbUploadResponse.json();
  assert.equal(duckdbUpload.kind, 'duckdb');
  assert.equal((await post(duckdbService, '/v7/database/import/prepare', {
    uploadId: duckdbUpload.uploadId,
  })).status, 202);
  const duckdbPrepared = await waitForTerminal(duckdbService, duckdbUpload.uploadId);
  assert.equal(duckdbPrepared.state, 'ready');
  assert.equal(duckdbPrepared.summary.rows, 1);
  assert.equal((await post(duckdbService, '/v7/database/import/activate', {
    uploadId: duckdbUpload.uploadId,
    confirmation: 'ACTIVATE DATABASE',
  })).status, 200);
  assert.equal((await (await fetch(endpoint(duckdbService, '/v7/database/health'))).json()).databaseReady, true);

  disabledService = await startService('disabled', false);
  const disabledHealth = await (await fetch(endpoint(disabledService, '/v7/database/health'))).json();
  assert.equal(disabledHealth.bootstrapEnabled, false);
  assert.equal(disabledHealth.importAllowed, false);
  assert.equal((await upload(disabledService, 'disabled.csv', validCsv)).status, 409,
    'non-bootstrap service must reject import even when the target is missing');
} finally {
  await stopService(csvService);
  if (duckdbService) await stopService(duckdbService);
  if (disabledService) await stopService(disabledService);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log('v7 database import service harness passed (CSV, DuckDB, validation, activation lock)');
