import assert from 'node:assert/strict';

import { createPrimitiveCache } from '../src/chart/primitive-cache.js';

const attached = [];
const detached = [];
const updates = [];
let nextId = 1;

function makePrimitive(label) {
  return {
    id: nextId++,
    label,
    requestUpdateCount: 0,
    requestUpdate() {
      this.requestUpdateCount += 1;
    },
  };
}

const cache = createPrimitiveCache({
  attach: (primitive) => attached.push(primitive),
  detach: (primitive) => detached.push(primitive),
});

cache.sync([
  {
    key: 'a',
    type: 'segment',
    create: () => makePrimitive('a1'),
    update: (primitive) => updates.push(['a-initial', primitive.id]),
  },
  {
    key: 'b',
    type: 'segment',
    create: () => makePrimitive('b1'),
  },
]);

assert.equal(cache.size(), 2);
assert.deepEqual(cache.keys(), ['a', 'b']);
assert.equal(attached.length, 2);
assert.equal(detached.length, 0);
assert.equal(cache.get('a').label, 'a1');
assert.equal(cache.get('a').requestUpdateCount, 1);

const originalA = cache.get('a');
cache.sync([
  {
    key: 'a',
    type: 'segment',
    create: () => makePrimitive('a-should-not-create'),
    update: (primitive) => {
      primitive.label = 'a2';
      primitive.requestUpdate();
      updates.push(['a-update', primitive.id]);
    },
  },
  {
    key: 'c',
    type: 'pda',
    create: () => makePrimitive('c1'),
  },
]);

assert.equal(cache.size(), 2);
assert.equal(cache.get('a'), originalA);
assert.equal(cache.get('a').label, 'a2');
assert.equal(cache.get('a').requestUpdateCount, 2);
assert.equal(cache.get('b'), null);
assert.equal(cache.get('c').label, 'c1');
assert.equal(attached.length, 3);
assert.equal(detached.length, 1);
assert.equal(detached[0].label, 'b1');
assert.deepEqual(updates, [['a-update', originalA.id]]);

cache.sync([
  {
    key: 'a',
    type: 'range',
    create: () => makePrimitive('a-range'),
  },
]);

assert.equal(cache.size(), 1);
assert.equal(cache.get('a').label, 'a-range');
assert.notEqual(cache.get('a'), originalA);
assert.equal(detached.length, 3);
assert.equal(detached[1].label, 'a2');
assert.equal(detached[2].label, 'c1');

cache.clear();
assert.equal(cache.size(), 0);
assert.equal(detached.length, 4);
assert.equal(detached[3].label, 'a-range');

assert.throws(
  () => createPrimitiveCache({ attach: () => {} }),
  /requires detach/
);
assert.throws(
  () => cache.sync([{ key: '', create: () => makePrimitive('bad') }]),
  /requires key/
);
assert.throws(
  () => cache.sync([{ key: 'bad' }]),
  /requires create/
);

console.log('primitive cache smoke ok');
