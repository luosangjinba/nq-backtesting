import {
  createProjectedHistoryBatch,
  createProjectedHistoryRequest,
  projectedHistoryRequestKey,
} from '../projected-history-contract/public.js';

function cancellationError(reason = undefined) {
  const error = new Error('Projected History acquisition was cancelled.', { cause: reason });
  error.name = 'AbortError';
  error.code = 'PROJECTED_HISTORY_CANCELLED';
  return error;
}

function requireOptionalSignal(signal) {
  if (signal !== undefined && signal !== null
    && (typeof signal !== 'object' || typeof signal.aborted !== 'boolean'
      || typeof signal.addEventListener !== 'function'
      || typeof signal.removeEventListener !== 'function')) {
    throw new TypeError('Projected History acquisition signal is invalid.');
  }
  return signal ?? null;
}

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

  function settleTask(task, outcome, value) {
    if (task.settled) return;
    task.settled = true;
    if (outcome === 'resolve') task.resolve(value);
    else task.reject(value);
  }

  function forgetTask(task) {
    if (inFlight.get(task.key) === task) inFlight.delete(task.key);
  }

  function cancelUnusedTask(task, reason) {
    if (task.settled || task.consumers.size > 0) return;
    task.cancelled = true;
    forgetTask(task);
    const error = cancellationError(reason);
    if (task.state === 'queued') {
      const index = queue.indexOf(task);
      if (index >= 0) queue.splice(index, 1);
      settleTask(task, 'reject', error);
      pump();
      return;
    }
    task.controller?.abort(error);
    settleTask(task, 'reject', error);
  }

  function consumeTask(task, signal) {
    const consumer = Object.freeze({});
    task.consumers.add(consumer);
    return new Promise((resolve, reject) => {
      let settled = false;
      const release = () => {
        signal?.removeEventListener('abort', abort);
        task.consumers.delete(consumer);
      };
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        release();
        callback(value);
      };
      const abort = () => {
        finish(reject, cancellationError(signal?.reason));
        cancelUnusedTask(task, signal?.reason);
      };
      signal?.addEventListener('abort', abort, { once: true });
      task.promise.then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error),
      );
      if (signal?.aborted) abort();
    });
  }

  function cacheBatch(key, batch) {
    cache.delete(key);
    cache.set(key, batch);
    while (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
  }

  function pump() {
    while (!disposed && activeCount < maxConcurrentRequests && queue.length > 0) {
      const task = queue.shift();
      if (task.cancelled) continue;
      activeCount += 1;
      active.add(task);
      task.state = 'active';
      task.controller = new AbortController();
      Promise.resolve().then(() => {
        if (task.cancelled || task.controller.signal.aborted) {
          throw cancellationError(task.controller.signal.reason);
        }
        const provider = resolveProvider(task.request.providerId);
        if (!provider || typeof provider.requestProjectedHistory !== 'function') {
          throw new TypeError('Projected History provider port is invalid.');
        }
        return provider.requestProjectedHistory(task.request, { signal: task.controller.signal });
      }).then(createProjectedHistoryBatch).then((batch) => {
        if (batch.requestKey !== task.key) throw new TypeError('Projected History response identity changed.');
        if (disposed || task.cancelled || task.controller.signal.aborted) {
          throw cancellationError(task.controller.signal.reason);
        }
        cacheBatch(task.key, batch);
        settleTask(task, 'resolve', batch);
      }, (error) => settleTask(task, 'reject', error)).finally(() => {
        active.delete(task);
        forgetTask(task);
        activeCount -= 1;
        pump();
      });
    }
  }

  function acquire(value, options = {}) {
    if (disposed) return Promise.reject(new Error('Projected History Runtime is disposed.'));
    const signal = requireOptionalSignal(options?.signal);
    if (signal?.aborted) return Promise.reject(cancellationError(signal.reason));
    const request = createProjectedHistoryRequest(value);
    const key = projectedHistoryRequestKey(request);
    if (cache.has(key)) {
      const batch = cache.get(key);
      cache.delete(key);
      cache.set(key, batch);
      const task = {
        cancelled: false,
        consumers: new Set(),
        key,
        promise: Promise.resolve(batch),
        settled: true,
      };
      return consumeTask(task, signal);
    }
    if (inFlight.has(key)) return consumeTask(inFlight.get(key), signal);
    const task = {
      cancelled: false,
      consumers: new Set(),
      controller: null,
      key,
      request,
      settled: false,
      state: 'queued',
    };
    const promise = new Promise((resolve, reject) => Object.assign(task, { reject, resolve }));
    task.promise = promise;
    inFlight.set(key, task);
    queue.push(task);
    const consumed = consumeTask(task, signal);
    pump();
    return consumed;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    const error = new Error('Projected History Runtime is disposed.');
    for (const task of queue.splice(0)) settleTask(task, 'reject', error);
    for (const task of active) {
      settleTask(task, 'reject', error);
      task.controller.abort();
    }
    inFlight.clear();
    cache.clear();
  }

  return Object.freeze({ acquire, dispose });
}
