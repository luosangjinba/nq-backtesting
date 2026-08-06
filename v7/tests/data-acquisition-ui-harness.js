import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createAcquisitionWorkflow,
  createDatabaseImportClient,
  rollCalendarTemplate,
  databaseImportTemplate,
  createMaintenanceClient,
  parseOutputMetric,
  resolveMaintenanceApiBase,
} from '../src/data-acquisition-ui/public.js';

const databaseTemplate = databaseImportTemplate();
assert.match(databaseTemplate, /Database setup/);
assert.match(databaseTemplate, /instrument,ts,open,high,low,close,volume/);
assert.match(databaseTemplate, /no automatic renaming/);
assert.match(databaseTemplate, /ACTIVATE DATABASE/);

const rollTemplate = rollCalendarTemplate();
assert.match(rollTemplate, /Contract Roll/);
assert.match(rollTemplate, /roll_scan_v2|rollScan/);
assert.match(rollTemplate, /Preview calendar change/);
assert.match(rollTemplate, /Commit contract roll/);

const selection = Object.freeze({
  instrument: 'ES',
  start: '2026-07-20T10:00',
  end: '2026-07-20T11:00',
  chunkDays: 3,
});
const workflow = createAcquisitionWorkflow(selection);
assert.equal(workflow.snapshot().canWrite, false);
assert.equal(workflow.snapshot().coverageAccepted, false);
assert.equal(parseOutputMetric('preflight_status: write-eligible', 'preflight_status'), 'write-eligible');

workflow.recordCoverage([
  { instrument: 'ES', integrity: 'ok', duplicateTimestamps: 0 },
  { instrument: 'NQ', integrity: 'ok', duplicateTimestamps: 0 },
]);
assert.equal(workflow.snapshot().coverageAccepted, true);

workflow.recordPreflight({ ok: true, returncode: 0, output: 'preflight_status: write-eligible' });
assert.equal(workflow.snapshot().preflightAccepted, true);
assert.equal(workflow.snapshot().canWrite, false);

workflow.recordDryRun({
  ok: true,
  returncode: 0,
  output: [
    'dry_run_range_et: 2026-07-20 10:00:00 -> 2026-07-20 11:00:00 (exclusive)',
    'write_status: dry-run; no database changes were made',
    'duplicate_candidate_keys: 0',
    'would_insert_rows: 42',
  ].join('\n'),
});
assert.equal(workflow.snapshot().dryRunAccepted, true);
assert.equal(workflow.snapshot().canWrite, false, 'a verified backup is still required');
assert.equal(workflow.snapshot().dryRunSummary.wouldInsert, 42);
assert.equal(workflow.snapshot().dryRunSummary.effectiveEnd, '2026-07-20T11:00');
workflow.recordBackup({
  ok: true,
  returncode: 0,
  output: 'backup_status: ok\nrestore_smoke_status: ok',
});
assert.equal(workflow.snapshot().backupAccepted, true);
assert.equal(workflow.snapshot().canWrite, true);
assert.deepEqual(workflow.assertWriteAllowed('WRITE ES'), selection);

workflow.updateSelection({ ...selection, end: '2026-07-20T11:01' });
assert.equal(workflow.snapshot().preflightAccepted, false, 'range edits invalidate Preflight evidence');
assert.equal(workflow.snapshot().dryRunAccepted, false, 'range edits invalidate Dry Run evidence');
assert.equal(workflow.snapshot().backupAccepted, false, 'range edits invalidate Backup evidence');

const negative = JSON.parse(fs.readFileSync(
  new URL('./fixtures/data-acquisition/negative/write-without-dry-run.json', import.meta.url),
  'utf8',
));
const negativeWorkflow = createAcquisitionWorkflow(negative.selection);
assert.throws(
  () => negativeWorkflow.assertWriteAllowed(negative.confirmation),
  new RegExp(negative.expectedError),
);

const dirtyWorkflow = createAcquisitionWorkflow(selection);
dirtyWorkflow.recordCoverage([{ instrument: 'ES', integrity: 'failed', duplicateTimestamps: 1 }]);
dirtyWorkflow.recordPreflight({ ok: true, returncode: 0, output: 'preflight_status: write-eligible' });
dirtyWorkflow.recordDryRun({
  ok: true,
  returncode: 0,
  output: 'dry_run_range_et: 2026-07-20 10:00:00 -> 2026-07-20 11:00:00 (exclusive)\nwrite_status: dry-run\nduplicate_candidate_keys: 1\nwould_insert_rows: 10',
});
assert.equal(dirtyWorkflow.snapshot().canWrite, false, 'duplicate candidates keep Write locked');
assert.equal(dirtyWorkflow.snapshot().preflightAccepted, false, 'dirty authoritative coverage blocks Preflight evidence');

workflow.recordCoverage([{ instrument: 'ES', integrity: 'failed', duplicateTimestamps: 1 }]);
assert.equal(workflow.snapshot().canWrite, false, 'a later dirty coverage result revokes prior write evidence');

assert.equal(
  resolveMaintenanceApiBase({ protocol: 'http:', hostname: '127.0.0.1' }),
  'http://127.0.0.1:8766',
);
assert.equal(resolveMaintenanceApiBase({ protocol: 'https:', hostname: 'example.test' }), '');
assert.equal(
  resolveMaintenanceApiBase({ protocol: 'http:', hostname: '192.168.1.20' }),
  'http://192.168.1.20:8766',
);

const calls = [];
const responses = [
  {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      ok: true,
      returncode: 202,
      job: { jobId: 'job-1', action: 'dry_run', state: 'running' },
    }),
  },
  {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      ok: true,
      returncode: 0,
      job: {
        jobId: 'job-1', action: 'dry_run', state: 'succeeded',
        result: { ok: true, returncode: 0, output: 'dry-run complete' },
      },
    }),
  },
];
const client = createMaintenanceClient({
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return responses.shift();
  },
  pollIntervalMs: 0,
});
const statuses = [];
const result = await client.runJob({ action: 'dry_run', instrument: 'ES' }, {
  onStatus: (job) => statuses.push(job.state),
});
assert.equal(result.output, 'dry-run complete');
assert.deepEqual(statuses, ['running', 'succeeded']);
assert.equal(calls.length, 2);
assert.equal(calls[0].url, 'http://127.0.0.1:8766/v4/data_maintenance/run');
assert.equal(calls[0].options.headers['X-V4-Maintenance-Request'], 'data-maintenance');
assert.deepEqual(JSON.parse(calls[0].options.body), {
  action: 'job_start',
  request: { action: 'dry_run', instrument: 'ES' },
});
assert.deepEqual(JSON.parse(calls[1].options.body), { action: 'job_status', jobId: 'job-1' });

const dirtyCoverageClient = createMaintenanceClient({
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async () => ({
    ok: false,
    status: 409,
    text: async () => JSON.stringify({
      ok: false,
      coverage: [{ instrument: 'ES', integrity: 'failed', duplicateTimestamps: 1 }],
    }),
  }),
});
const dirtyCoverageResult = await dirtyCoverageClient.request(
  { action: 'coverage_status' },
  { acceptErrorResult: true },
);
assert.equal(dirtyCoverageResult.coverage[0].duplicateTimestamps, 1,
  'structured dirty coverage must remain visible while keeping writes blocked');

const databaseCalls = [];
const databaseResponses = [
  new Response(JSON.stringify({ databaseReady: false, importAllowed: true }), { status: 200 }),
  new Response(JSON.stringify({
    error: { code: 'DATABASE_UPLOAD_NOT_FOUND', message: 'upload was not found' },
  }), { status: 404 }),
  new Response(JSON.stringify({ uploadId: 'a'.repeat(32), state: 'preparing' }), { status: 202 }),
  new Response(JSON.stringify({
    uploadId: 'a'.repeat(32), state: 'ready', summary: { rows: 2 },
  }), { status: 200 }),
  new Response(JSON.stringify({ databaseReady: true, state: 'activated' }), { status: 200 }),
];
class FakeUploadRequest {
  constructor() {
    this.listeners = new Map();
    this.uploadListeners = new Map();
    this.headers = {};
    this.upload = { addEventListener: (name, listener) => this.uploadListeners.set(name, listener) };
  }

  open(method, url) { this.method = method; this.url = url; }

  setRequestHeader(name, value) { this.headers[name] = value; }

  addEventListener(name, listener) { this.listeners.set(name, listener); }

  send(file) {
    this.file = file;
    this.status = 201;
    this.response = { uploadId: 'b'.repeat(32), filename: file.name, state: 'uploaded' };
    this.uploadListeners.get('progress')?.({ lengthComputable: true, loaded: file.size, total: file.size });
    this.listeners.get('load')?.();
  }

  abort() { this.listeners.get('abort')?.(); }
}
let fakeXhr;
const databaseClient = createDatabaseImportClient({
  fetchImpl: async (url, options = {}) => {
    databaseCalls.push({ options, url });
    return databaseResponses.shift();
  },
  pollIntervalMs: 0,
  xhrFactory() {
    fakeXhr = new FakeUploadRequest();
    return fakeXhr;
  },
});
assert.equal((await databaseClient.health()).importAllowed, true);
await assert.rejects(() => databaseClient.current(), (error) => (
  error.status === 404 && error.code === 'DATABASE_UPLOAD_NOT_FOUND'
));
const progressEvents = [];
const uploaded = await databaseClient.upload({
  name: 'market.csv', size: 12, type: 'text/csv',
}, { onProgress: (...progress) => progressEvents.push(progress) });
assert.equal(uploaded.state, 'uploaded');
assert.equal(fakeXhr.method, 'PUT');
assert.equal(fakeXhr.url, '/v7/database/import/upload');
assert.equal(fakeXhr.headers['X-Replay-Lab-File-Name'], 'market.csv');
assert.deepEqual(progressEvents, [[12, 12]]);
const preparedDatabase = await databaseClient.prepare('a'.repeat(32));
assert.equal(preparedDatabase.state, 'ready');
assert.equal(preparedDatabase.summary.rows, 2);
assert.equal((await databaseClient.activate(
  'a'.repeat(32), 'ACTIVATE DATABASE',
)).databaseReady, true);
assert.equal(databaseCalls[2].url, '/v7/database/import/prepare');
assert.deepEqual(JSON.parse(databaseCalls[2].options.body), { uploadId: 'a'.repeat(32) });
assert.match(databaseCalls[3].url, /\/v7\/database\/import\/status\?uploadId=/);
assert.equal(databaseCalls[4].url, '/v7/database/import/activate');
assert.deepEqual(JSON.parse(databaseCalls[4].options.body), {
  confirmation: 'ACTIVATE DATABASE', uploadId: 'a'.repeat(32),
});

console.log('v7 data acquisition UI harness passed');
