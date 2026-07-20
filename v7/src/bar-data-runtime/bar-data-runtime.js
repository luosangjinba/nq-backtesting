import {
  createRawBarBatch,
  createRawBarRequest,
  rawBarRequestKey,
} from '../bar-data-contract/public.js';
import { createExactWindowCache } from './exact-window-cache.js';
import { BarDataRuntimeError, failBarDataRuntime } from './runtime-error.js';

function requirePositiveSafeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    failBarDataRuntime('INVALID_BAR_DATA_RUNTIME_CONFIG', `${field} must be a positive safe integer.`);
  }
  return value;
}

function requireProviderResolver(value) {
  if (typeof value !== 'function') {
    failBarDataRuntime('INVALID_PROVIDER_RESOLVER', 'resolveProvider must be a function.');
  }
  return value;
}

function disposedError() {
  return new BarDataRuntimeError('BAR_DATA_RUNTIME_DISPOSED', 'Bar Data Runtime is disposed.');
}

function requireProviderPort(value, providerId) {
  if (!value || typeof value.requestRawBars !== 'function') {
    failBarDataRuntime('INVALID_PROVIDER_PORT', `${providerId} must expose requestRawBars().`);
  }
  return value;
}

/**
 * Owner: Bar Data Runtime.
 * Purpose: provide the only R3.2a raw acquisition/cache path over an injected
 * provider resolver.
 * Inputs: resolver, exact-window cache bound, and global request concurrency.
 * Outputs: frozen acquire/dispose API scoped to one independent runtime.
 * Side effects: invokes provider ports and mutates only private queue/cache state.
 * Errors: configuration/lifecycle errors plus provider/Bar Data contract errors.
 *
 * Protected invariants:
 * - identical in-flight identities share one provider call and Promise;
 * - only validated batches enter the bounded cache;
 * - provider failures never become cache entries;
 * - dispose rejects queued/active consumers, aborts active provider signals,
 *   clears cache, and prevents late completions from writing state.
 */
export function createBarDataRuntime({
  resolveProvider,
  maxCacheEntries = 64,
  maxConcurrentRequests = 4,
}) {
  const resolver = requireProviderResolver(resolveProvider);
  const cache = createExactWindowCache(requirePositiveSafeInteger(maxCacheEntries, 'maxCacheEntries'));
  const concurrency = requirePositiveSafeInteger(maxConcurrentRequests, 'maxConcurrentRequests');
  const queue = [];
  const inFlight = new Map();
  const activeTasks = new Set();
  let activeCount = 0;
  let disposed = false;

  function pump() {
    if (disposed) return;
    while (activeCount < concurrency && queue.length > 0) {
      const task = queue.shift();
      activeCount += 1;
      activeTasks.add(task);
      task.controller = new AbortController();
      task.controller.signal.addEventListener('abort', () => task.rejectOnce(disposedError()), { once: true });

      Promise.resolve()
        .then(() => requireProviderPort(resolver(task.request.providerId), task.request.providerId))
        .then((provider) => provider.requestRawBars(task.request, { signal: task.controller.signal }))
        .then((candidate) => {
          const batch = createRawBarBatch(candidate);
          if (batch.requestKey !== task.key) {
            failBarDataRuntime('PROVIDER_RESPONSE_IDENTITY_MISMATCH', 'Provider response identity differs from its request.');
          }
          if (disposed || task.controller.signal.aborted) throw disposedError();
          cache.set(task.key, batch);
          if (inFlight.get(task.key) === task.promise) inFlight.delete(task.key);
          task.resolveOnce(batch);
        })
        .catch((error) => {
          if (inFlight.get(task.key) === task.promise) inFlight.delete(task.key);
          task.rejectOnce(error);
        })
        .finally(() => {
          activeTasks.delete(task);
          activeCount -= 1;
          pump();
        });
    }
  }

  function acquire(value) {
    if (disposed) return Promise.reject(disposedError());
    const request = createRawBarRequest(value);
    const key = rawBarRequestKey(request);
    const cached = cache.get(key);
    if (cached) return Promise.resolve(cached);
    if (inFlight.has(key)) return inFlight.get(key);

    let resolvePromise;
    let rejectPromise;
    const task = { request, key, controller: null, settled: false };
    task.promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    task.resolveOnce = (result) => {
      if (task.settled) return;
      task.settled = true;
      resolvePromise(result);
    };
    task.rejectOnce = (error) => {
      if (task.settled) return;
      task.settled = true;
      rejectPromise(error);
    };
    inFlight.set(key, task.promise);
    queue.push(task);
    pump();
    return task.promise;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    const error = disposedError();
    for (const task of queue.splice(0)) task.rejectOnce(error);
    for (const task of activeTasks) {
      task.rejectOnce(error);
      task.controller.abort();
    }
    inFlight.clear();
    cache.clear();
  }

  return Object.freeze({ acquire, dispose });
}
