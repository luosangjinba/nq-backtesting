import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const html = readFileSync(resolve('v4/data-maintenance.html'), 'utf8');
const match = html.match(/function resolveApiBase\(\) \{[\s\S]*?\n    \}/);
assert.ok(match, 'resolveApiBase function not found');

function resolveFromLocation(location) {
  const context = { window: { location } };
  vm.runInNewContext(`${match[0]}; result = resolveApiBase();`, context);
  return context.result;
}

assert.equal(resolveFromLocation({ protocol: 'http:', hostname: '127.0.0.1' }), 'http://127.0.0.1:8766');
assert.equal(resolveFromLocation({ protocol: 'http:', hostname: 'localhost' }), 'http://localhost:8766');
assert.equal(resolveFromLocation({ protocol: 'https:', hostname: 'recap.buddhiststudy.xyz' }), '');

console.log('data maintenance api base smoke passed');
