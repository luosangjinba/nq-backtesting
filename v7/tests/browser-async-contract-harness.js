import assert from 'node:assert/strict';
import { abortableDelay, abortReason } from '../src/browser-async-contract/public.js';

function trackedSignal() {
  const controller = new AbortController();
  let listeners = 0;
  const signal = new Proxy(controller.signal, {
    get(target, property) {
      if (property === 'addEventListener') {
        return (...args) => {
          listeners += 1;
          return target.addEventListener(...args);
        };
      }
      if (property === 'removeEventListener') {
        return (...args) => {
          listeners -= 1;
          return target.removeEventListener(...args);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return Object.freeze({ controller, listeners: () => listeners, signal });
}

const resolved = trackedSignal();
let completion;
const resolvedWait = abortableDelay(
  1,
  resolved.signal,
  (callback) => { completion = callback; return 1; },
  () => assert.fail('resolved delay must not clear its completed timer'),
);
assert.equal(resolved.listeners(), 1);
completion();
await resolvedWait;
assert.equal(resolved.listeners(), 0, 'resolve must release the AbortSignal listener');

const cancelled = trackedSignal();
let cleared = null;
const reason = new Error('cancelled by owner');
const cancelledWait = abortableDelay(
  5_000,
  cancelled.signal,
  () => 42,
  (timer) => { cleared = timer; },
);
cancelled.controller.abort(reason);
await assert.rejects(cancelledWait, (error) => error === reason);
assert.equal(cleared, 42);
assert.equal(cancelled.listeners(), 0, 'cancellation must release the AbortSignal listener');
assert.equal(abortReason(cancelled.signal), reason);

const setupFailure = trackedSignal();
await assert.rejects(
  abortableDelay(1, setupFailure.signal, () => { throw new Error('timer setup failed'); }, () => {}),
  /timer setup failed/,
);
assert.equal(setupFailure.listeners(), 0, 'timer setup failure must release the AbortSignal listener');

console.log('v7 browser async contract harness passed (resolve, cancel, setup failure cleanup)');
