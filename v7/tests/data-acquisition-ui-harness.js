import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createAcquisitionWorkflow,
  createMaintenanceClient,
  parseOutputMetric,
  resolveMaintenanceApiBase,
} from '../src/data-acquisition-ui/public.js';

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

console.log('v7 data acquisition UI harness passed');
