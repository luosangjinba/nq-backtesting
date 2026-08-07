import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const serverDirectory = path.join(repositoryRoot, 'v7/server');
const script = path.join(serverDirectory, 'market_data_api.py');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-market-data-'));
const database = path.join(temporaryDirectory, 'market.duckdb');
const calendar = path.join(temporaryDirectory, 'economic-events.csv');

function runPython(source, ...scriptArguments) {
  const result = spawnSync('python3', ['-c', source, ...scriptArguments], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

runPython(`
import duckdb, sys
connection = duckdb.connect(sys.argv[1])
connection.execute("""
  create table futures_1m (
    instrument varchar,
    ts timestamp,
    open double,
    high double,
    low double,
    close double,
    volume bigint
  )
""")
connection.executemany(
  "insert into futures_1m values (?, ?, ?, ?, ?, ?, ?)",
  [
    ('NQ', '2026-08-03 09:30:00', 100, 102, 99, 101, 10),
    ('NQ', '2026-08-03 09:31:00', 101, 103, 100, 102, 11),
    ('NQ', '2026-08-03 09:32:00', 102, 104, 101, 103, 12),
    ('ES', '2026-08-03 09:30:00', 50, 51, 49, 50.5, 5),
  ],
)
connection.close()
`, database);
fs.writeFileSync(calendar, [
  'event_date,event_time_et,event_time_utc,currency,title,impact,event_type,all_day,default_visible',
  '2026-08-03,2026-08-03T10:00:00-04:00,2026-08-03T14:00:00Z,USD,Fixture event,High,economic,false,true',
  '',
].join('\n'));

for (const file of [
  'market_data_api.py',
  'market_data_economic_calendar.py',
  'market_data_queries.py',
  'market_data_read_handler.py',
  'market_data_revision.py',
]) {
  const source = fs.readFileSync(path.join(serverDirectory, file), 'utf8');
  assert.doesNotMatch(source, /(?:from|import)\s+v4\b|V4_|\/v4\//,
    `${file} must not import, configure, or route through a legacy service`);
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startService(port) {
  const child = spawn('python3', [
    script,
    '--db', database,
    '--economic-calendar', calendar,
    '--port', String(port),
  ], {
    cwd: repositoryRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`market-data service exited early: ${output}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v7/market-data/health`);
      if (response.ok) return child;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  child.kill('SIGKILL');
  throw new Error(`market-data service did not become ready: ${output}`);
}

async function stopService(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await exited;
}

function endpoint(port, route, search = {}) {
  const url = new URL(`http://127.0.0.1:${port}/v7/market-data/${route}`);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
  return url;
}

const port = await reservePort();
const service = await startService(port);
try {
  const healthResponse = await fetch(endpoint(port, 'health'));
  assert.equal(healthResponse.status, 200);
  const health = await healthResponse.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.version, '7.0');
  assert.equal(health.databaseReady, true);
  assert.match(health.datasetRevision, /^v7-duckdb-stat-v1-[a-f0-9]{24}$/);
  assert.equal(health.capabilities.bars, true);
  assert.equal(health.capabilities.projectedHistory, true);
  const firstRevision = health.datasetRevision;

  const barsResponse = await fetch(endpoint(port, 'bars', {
    datasetRevision: firstRevision,
    end: '2026-08-03 09:33',
    instrument: 'NQ',
    start: '2026-08-03 09:30',
    tf: '1',
  }));
  assert.equal(barsResponse.status, 200);
  const bars = await barsResponse.json();
  assert.equal(bars.datasetRevision, firstRevision);
  assert.equal(bars.bars.length, 3);
  assert.deepEqual(bars.bars[0], {
    time: '2026-08-03 09:30',
    timestamp: Date.UTC(2026, 7, 3, 9, 30) / 1_000,
    open: 100,
    high: 102,
    low: 99,
    close: 101,
    volume: 10,
  });
  assert.deepEqual(bars.requestedRange, {
    startTs: Date.UTC(2026, 7, 3, 9, 30) / 1_000,
    endTs: Date.UTC(2026, 7, 3, 9, 33) / 1_000,
  });

  const availableDates = await (await fetch(endpoint(port, 'available-dates', {
    instrument: 'NQ,ES',
  }))).json();
  assert.equal(availableDates.schemaVersion, 1);
  assert.equal(availableDates.timeZone, 'America/New_York');
  assert.deepEqual(availableDates.instruments.map((record) => record.instrument), ['NQ', 'ES']);
  assert.deepEqual(availableDates.instruments[0].dates, ['2026-08-03']);

  const targetBars = await (await fetch(endpoint(port, 'target-bars', {
    end: '2026-08-03 09:33',
    instrument: 'NQ',
    start: '2026-08-03 09:30',
    tf: '5m',
  }))).json();
  assert.equal(targetBars.targetTimeframe, '5m');
  assert.equal(targetBars.bars.length, 1);
  assert.equal(targetBars.bars[0].sourceBarCount, 3);

  const projected = await (await fetch(endpoint(port, 'projected-history', {
    datasetRevision: firstRevision,
    end: '2026-08-03 09:33',
    instrument: 'NQ',
    session: 'rth',
    start: '2026-08-03 09:30',
    tf: '60',
  }))).json();
  assert.equal(projected.datasetRevision, firstRevision);
  assert.equal(projected.sessionHoursMode, 'rth');
  assert.equal(projected.targetTimeframe, '60');
  assert.equal(projected.bars.length, 1);

  const price = await (await fetch(endpoint(port, 'price', {
    instrument: 'NQ',
    timestamp: String(Date.UTC(2026, 7, 3, 9, 31) / 1_000),
  }))).json();
  assert.equal(price.instrument, 'NQ');
  assert.deepEqual(price.ohlc, { open: 101, high: 103, low: 100, close: 102 });

  const events = await (await fetch(endpoint(port, 'economic-events', {
    date_from: '2026-08-03',
    date_to: '2026-08-03',
  }))).json();
  assert.equal(events.count, 1);
  assert.equal(events.events[0].title, 'Fixture event');

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await fetch(endpoint(port, 'bars'), { method });
    assert.equal(response.status, 405, `${method} must be rejected in the application`);
    assert.equal(response.headers.get('allow'), 'GET, OPTIONS');
  }
  const options = await fetch(endpoint(port, 'bars'), { method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('allow'), 'GET, OPTIONS');
  assert.equal((await fetch(`http://127.0.0.1:${port}/v4/health`)).status, 404);

  runPython(`
import os, sys
stat = os.stat(sys.argv[1])
os.utime(sys.argv[1], ns=(stat.st_atime_ns, stat.st_mtime_ns + 1000000))
`, database);
  const secondHealth = await (await fetch(endpoint(port, 'health'))).json();
  assert.notEqual(secondHealth.datasetRevision, firstRevision,
    'dataset revision must change when the active DuckDB identity changes');
  const stale = await fetch(endpoint(port, 'bars', {
    datasetRevision: firstRevision,
    end: '2026-08-03 09:33',
    instrument: 'NQ',
    start: '2026-08-03 09:30',
    tf: '1',
  }));
  assert.equal(stale.status, 409);
  assert.match((await stale.json()).error, /dataset revision mismatch/);

  assert.equal(runPython(`
import duckdb, sys
connection = duckdb.connect(sys.argv[1], read_only=True)
print(connection.execute('select count(*) from futures_1m').fetchone()[0])
connection.close()
`, database), '4', 'HTTP mutation attempts must not change the DuckDB fixture');
} finally {
  await stopService(service);
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}

console.log('v7 market-data service harness passed (V7 routes, JSON, read-only, revision)');
