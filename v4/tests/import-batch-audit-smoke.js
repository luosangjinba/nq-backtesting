import assert from 'node:assert/strict';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

globalThis.localStorage = createMemoryStorage();
globalThis.window = {
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  localStorage: globalThis.localStorage,
};
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async json() {
    return { ok: true, found: true };
  },
});

const audit = await import('../src/import/import-batch-audit.js');

const batch = audit.recordImportBatch({
  id: 'import_batch_1',
  sourceType: 'review-json',
  sourceFileName: 'review.json',
  instrument: 'nq',
  counts: {
    pdaAnnotations: 2,
    liveRecords: 1,
  },
  skipped: {
    total: 3,
  },
  metadata: {
    archiveVersion: 1,
  },
});

assert.equal(batch.id, 'import_batch_1');
assert.equal(batch.instrument, 'NQ');
assert.equal(audit.getImportBatches().length, 1);

const putCalls = [];
await audit.saveImportBatchesToServer(null, {
  fetchImpl: async (url, options = {}) => {
    putCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, found: true };
      },
    };
  },
});
assert.equal(putCalls.length, 1);
let body = JSON.parse(putCalls[0].options.body);
assert.equal(body.domain, audit.getImportBatchAuditWorkspaceDomain());
assert.equal(body.instrument, null);
assert.equal(body.payload.batches[0].sourceFileName, 'review.json');
assert.equal(body.payload.batches[0].counts.liveRecords, 1);

audit.loadImportBatches([]);
await audit.syncImportBatchesFromServer({
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace\?domain=import-batches$/);
    assert.equal(options.method, 'GET');
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          found: true,
          domain: 'import-batches',
          instrument: null,
          payload: {
            version: 1,
            batches: [{
              id: 'import_batch_2',
              sourceType: 'tradovate-performance-csv',
              sourceFileName: 'tradovate.zip',
              instrument: 'ES',
              counts: { liveRecords: 4 },
              skipped: {},
            }],
          },
        };
      },
    };
  },
});
assert.equal(audit.getImportBatches().length, 1);
assert.equal(audit.getImportBatches()[0].id, 'import_batch_2');
assert.equal(audit.getImportBatches()[0].instrument, 'ES');

console.log('import batch audit smoke passed');
