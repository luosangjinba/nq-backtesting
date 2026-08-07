import assert from 'node:assert/strict';

import {
  createDatabaseImportClient,
  databaseImportTemplate,
} from '../src/database-bootstrap-ui/public.js';

const template = databaseImportTemplate();
assert.match(template, /Database setup/);
assert.match(template, /instrument,ts,open,high,low,close,volume/);
assert.match(template, /no automatic renaming/);
assert.match(template, /ACTIVATE DATABASE/);
assert.match(template, /Upload another file/);
assert.match(template, /role="group" aria-labelledby="databaseDiscardMessage"/);

const requests = [];
const response = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(payload),
});
const client = createDatabaseImportClient({
  fetchImpl: async (url, options = {}) => {
    requests.push({ options, url });
    if (url.endsWith('/v7/database/health')) {
      return response({ bootstrapEnabled: true, databaseReady: false, importAllowed: true });
    }
    if (url.endsWith('/v7/database/import/current')) {
      return response({ uploadId: 'upload-1', state: 'ready' });
    }
    if (url.endsWith('/v7/database/import/activate')) {
      return response({ activated: true });
    }
    if (url.endsWith('/v7/database/import/discard')) {
      return response({ uploadId: 'upload-1', state: 'discarded' });
    }
    return response({ error: { code: 'UNEXPECTED_ROUTE', message: url } }, 404);
  },
});

assert.equal((await client.health()).importAllowed, true);
assert.equal((await client.current()).uploadId, 'upload-1');
assert.equal((await client.activate('upload-1', 'ACTIVATE DATABASE')).activated, true);
assert.equal((await client.discard('upload-1')).state, 'discarded');
assert.deepEqual(requests.map(({ options, url }) => ({
  method: options.method,
  path: new URL(url, 'https://replay.invalid').pathname,
})), [
  { method: 'GET', path: '/v7/database/health' },
  { method: 'GET', path: '/v7/database/import/current' },
  { method: 'POST', path: '/v7/database/import/activate' },
  { method: 'POST', path: '/v7/database/import/discard' },
]);
assert.deepEqual(JSON.parse(requests.at(-1).options.body), { uploadId: 'upload-1' });

const controller = new AbortController();
controller.abort(new Error('database bootstrap harness cancellation'));
await assert.rejects(
  client.upload({ name: 'bars.csv', size: 10, type: 'text/csv' }, { signal: controller.signal }),
  /database bootstrap harness cancellation/,
);

console.log(JSON.stringify({
  module: 'adapter.database-bootstrap-ui',
  routes: requests.length,
  status: 'ok',
}));
