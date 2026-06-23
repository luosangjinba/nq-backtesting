import assert from 'node:assert/strict';
import { resolveApiBase } from '../src/config.js';

assert.equal(resolveApiBase({ protocol: 'http:', hostname: '127.0.0.1' }), 'http://127.0.0.1:8766');
assert.equal(resolveApiBase({ protocol: 'http:', hostname: 'v4-server.local' }), 'http://v4-server.local:8766');
assert.equal(resolveApiBase({ protocol: 'https:', hostname: 'v4.example.com' }), 'https://v4.example.com:8766');
assert.equal(resolveApiBase(null), 'http://127.0.0.1:8766');

console.log('api base smoke passed');
