import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const script = path.join(repositoryRoot, 'v7/server/state_api.py');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-state-service-'));
const database = path.join(temporaryDirectory, 'state.sqlite3');

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startService(port) {
  const process = spawn('python3', [script, '--db', database, '--port', String(port)], {
    cwd: repositoryRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  process.stdout.on('data', (chunk) => { output += chunk; });
  process.stderr.on('data', (chunk) => { output += chunk; });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`state service exited early: ${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v7/state/health`);
      if (response.ok) return process;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  process.kill('SIGKILL');
  throw new Error(`state service did not become ready: ${output}`);
}

async function stopService(process) {
  if (process.exitCode !== null) return;
  const exited = new Promise((resolve) => process.once('exit', resolve));
  process.kill('SIGTERM');
  await exited;
}

function request(port, userId, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (userId !== null) headers['X-Replay-Lab-User'] = userId;
  return fetch(`http://127.0.0.1:${port}/v7/state/snapshot`, { ...options, headers });
}

const port = await reservePort();
let service = await startService(port);
try {
  assert.equal((await fetch(`http://127.0.0.1:${port}/v7/state/health`)).status, 200);
  assert.equal((await request(port, null)).status, 401);
  const empty = await (await request(port, 'reviewer')).json();
  assert.equal(empty.revision, 0);
  assert.equal(empty.userId, 'reviewer');

  const replacement = {
    entries: [
      { key: 'v7.session-browser:index', value: '{"sessions":["alpha"]}' },
      { key: 'v7.session-browser:record:alpha', value: '{"name":"Alpha"}' },
      {
        key: 'v7.calculated-series:document:alpha',
        value: '{"schema":"v7.calculated-series-document","version":1}',
      },
    ],
    expectedRevision: 0,
    schema: 'v7.user-state-snapshot',
    version: 1,
  };
  const acceptedResponse = await request(port, 'reviewer', {
    body: JSON.stringify(replacement),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(acceptedResponse.status, 200);
  assert.equal((await acceptedResponse.json()).revision, 1);

  const otherUser = await (await request(port, 'other-user')).json();
  assert.equal(otherUser.revision, 0);
  assert.deepEqual(otherUser.entries, [], 'user ids must have independent state rows');

  const staleResponse = await request(port, 'reviewer', {
    body: JSON.stringify({ ...replacement, entries: [], expectedRevision: 0 }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(staleResponse.status, 409);
  assert.equal((await staleResponse.json()).current.revision, 1);
  assert.equal((await (await request(port, 'reviewer')).json()).entries.length, 3,
    'stale replacement must have zero state effect');

  const invalidKeyResponse = await request(port, 'reviewer', {
    body: JSON.stringify({
      ...replacement,
      entries: [{ key: 'v4.market-data', value: 'forbidden' }],
      expectedRevision: 1,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(invalidKeyResponse.status, 400);
  const emptyRecordKeyResponse = await request(port, 'reviewer', {
    body: JSON.stringify({
      ...replacement,
      entries: [{ key: 'v7.session-browser:record:', value: 'forbidden' }],
      expectedRevision: 1,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(emptyRecordKeyResponse.status, 400);
  const emptyCalculatedSeriesKeyResponse = await request(port, 'reviewer', {
    body: JSON.stringify({
      ...replacement,
      entries: [{ key: 'v7.calculated-series:document:', value: 'forbidden' }],
      expectedRevision: 1,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(emptyCalculatedSeriesKeyResponse.status, 400);
  const forgedCalculatedSeriesKeyResponse = await request(port, 'reviewer', {
    body: JSON.stringify({
      ...replacement,
      entries: [{ key: 'v7.calculated-series:documents:alpha', value: 'forbidden' }],
      expectedRevision: 1,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(forgedCalculatedSeriesKeyResponse.status, 400);
  const invalidJsonResponse = await request(port, 'reviewer', {
    body: '{',
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(invalidJsonResponse.status, 400);
  const oversizedValueResponse = await request(port, 'reviewer', {
    body: JSON.stringify({
      ...replacement,
      entries: [{ key: 'v7.session-browser:index', value: 'x'.repeat(2_000_001) }],
      expectedRevision: 1,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  assert.equal(oversizedValueResponse.status, 400);
  assert.equal((await request(port, 'reviewer', { method: 'POST' })).status, 405);
  assert.equal((await request(port, 'reviewer', { method: 'DELETE' })).status, 405);
  assert.equal((await request(port, 'bad user')).status, 401);

  await stopService(service);
  service = await startService(port);
  const restored = await (await request(port, 'reviewer')).json();
  assert.equal(restored.revision, 1);
  assert.equal(restored.entries.length, 3, 'Session and calculated-series state must survive service restart');
  assert.equal(restored.entries.some(
    ({ key }) => key === 'v7.calculated-series:document:alpha'
  ), true, 'calculated-series sidecars must remain readable after restart');
} finally {
  await stopService(service);
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}

console.log('v7 state service harness passed (identity isolation, CAS, bounds, methods, restart)');
