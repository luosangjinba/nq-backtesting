import assert from 'node:assert/strict';
import { resolveApiBase } from '../src/config.js';

assert.equal(resolveApiBase({ protocol: 'http:', hostname: '127.0.0.1' }), 'http://127.0.0.1:8766');
assert.equal(resolveApiBase({ protocol: 'http:', hostname: 'localhost' }), 'http://localhost:8766');
assert.equal(resolveApiBase({ protocol: 'http:', hostname: 'v4-server.local' }), '');
assert.equal(resolveApiBase({ protocol: 'https:', hostname: 'v4.example.com' }), '');
assert.equal(resolveApiBase(null), 'http://127.0.0.1:8766');

console.log('api base smoke passed');
