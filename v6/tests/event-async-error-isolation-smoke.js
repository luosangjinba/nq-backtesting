import assert from 'node:assert/strict';
import {
  clearEventsForTest,
  emitEvent,
  listEventErrors,
  subscribeEvent,
} from '../src/runtime/events.js';

clearEventsForTest();
let healthyListenerCalls = 0;

subscribeEvent('test:isolated', () => {
  throw new Error('sync-listener-failed');
});
subscribeEvent('test:isolated', async () => {
  throw new Error('async-listener-failed');
});
subscribeEvent('test:isolated', () => {
  healthyListenerCalls += 1;
});

emitEvent('test:isolated', { ok: true });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(healthyListenerCalls, 1);
assert.deepEqual(
  listEventErrors().map((record) => record.message).sort(),
  ['async-listener-failed', 'sync-listener-failed'],
);

clearEventsForTest();
assert.deepEqual(listEventErrors(), []);

console.log('v6 event async error isolation smoke passed');
