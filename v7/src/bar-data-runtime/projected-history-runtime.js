import {
  createProjectedHistoryBatch,
  createProjectedHistoryRequest,
  projectedHistoryRequestKey,
} from '../projected-history-contract/public.js';

/** Bar Data-owned bounded cache/queue for server-projected historical context. */
export function createProjectedHistoryRuntime({
  maxCacheEntries = 32,
  maxConcurrentRequests = 2,
  resolveProvider,
}) {
  if (!Number.isSafeInteger(maxCacheEntries) || maxCacheEntries < 1
    || !Number.isSafeInteger(maxConcurrentRequests) || maxConcurrentRequests < 1
    || typeof resolveProvider !== 'function') {
    throw new TypeError('Projected History Runtime configuration is invalid.');
  }
  const cache = new Map();
  const queue = [];
  const inFlight = new Map();
  const active = new Set();
  let activeCount = 0;
  let disposed = false;

  function cacheBatch(key, batch) {
    cache.delete(key);
    cache.set(key, batch);
    while (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
  }

  function pump() {
    while (!disposed && activeCount < maxConcurrentRequests && queue.length > 0) {
      const task = queue.shift();
      activeCount += 1;
      active.add(task);
      task.controller = new AbortController();
      Promise.resolve().then(() => {
        const provider = resolveProvider(task.request.providerId);
        if (!provider || typeof provider.requestProjectedHistory !== 'function') {
          throw new TypeError('Projected History provider port is invalid.');
        }
        return provider.requestProjectedHistory(task.request, { signal: task.controller.signal });
      }).then(createProjectedHistoryBatch).then((batch) => {
        if (batch.requestKey !== task.key) throw new TypeError('Projected History response identity changed.');
        if (disposed || task.controller.signal.aborted) throw new Error('Projected History Runtime is disposed.');
        cacheBatch(task.key, batch);
        task.resolve(batch);
      }, task.reject).finally(() => {
        active.delete(task);
        inFlight.delete(task.key);
        activeCount -= 1;
        pump();
      });
    }
  }

  function acquire(value) {
    if (disposed) return Promise.reject(new Error('Projected History Runtime is disposed.'));
    const request = createProjectedHistoryRequest(value);
    const key = projectedHistoryRequestKey(request);
    if (cache.has(key)) {
      const batch = cache.get(key);
      cache.delete(key);
      cache.set(key, batch);
      return Promise.resolve(batch);
    }
    if (inFlight.has(key)) return inFlight.get(key);
    const task = { controller: null, key, request };
    const promise = new Promise((resolve, reject) => Object.assign(task, { reject, resolve }));
    inFlight.set(key, promise);
    queue.push(task);
    pump();
    return promise;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    const error = new Error('Projected History Runtime is disposed.');
    for (const task of queue.splice(0)) task.reject(error);
    for (const task of active) {
      task.reject(error);
      task.controller.abort();
    }
    inFlight.clear();
    cache.clear();
  }

  return Object.freeze({ acquire, dispose });
}
