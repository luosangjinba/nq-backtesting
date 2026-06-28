import assert from 'node:assert/strict';

import { getMaintenanceApiUrl, resolveApiBase } from '../src/maintenance/maintenance-api-client.js';

function resolveFromLocation(location) {
  return resolveApiBase(location);
}

assert.equal(resolveFromLocation({ protocol: 'http:', hostname: '127.0.0.1' }), 'http://127.0.0.1:8766');
assert.equal(resolveFromLocation({ protocol: 'http:', hostname: 'localhost' }), 'http://localhost:8766');
assert.equal(resolveFromLocation({ protocol: 'https:', hostname: 'recap.buddhiststudy.xyz' }), '');
assert.equal(
  getMaintenanceApiUrl({ protocol: 'https:', hostname: 'recap.buddhiststudy.xyz' }),
  '/v4/data_maintenance/run'
);

console.log('data maintenance api base smoke passed');
