import { createRawBarBatch, createRawBarRequest, rawBarRequestKey } from '../bar-data-contract/public.js';
import { createCoverageReport } from '../coverage-planning-contract/public.js';
import { defineProviderPolicy, requireProviderAdapter } from '../provider-policy-contract/public.js';
import { executeWithProviderPolicy } from './attempt-runner.js';
import { failProviderExecution, ProviderExecutionError } from './execution-error.js';
import { createRevisionCache } from './revision-cache.js';

const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;

function normalizeScope(value, providerId) {
  const fields = ['providerId', 'instrumentId', 'sourceResolutionId'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || fields.some((field) => !Object.hasOwn(value, field))
    || Object.keys(value).some((field) => !fields.includes(field))
    || fields.some((field) => typeof value[field] !== 'string' || !ID_PATTERN.test(value[field]))
    || value.providerId !== providerId) {
    failProviderExecution('INVALID_REVISION_SCOPE', 'Revision scope must exactly match the policy provider.');
  }
  return Object.freeze({ ...value });
}

function revisionKey(scope) {
  return JSON.stringify([scope.providerId, scope.instrumentId, scope.sourceResolutionId]);
}

function requireRevision(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failProviderExecution('INVALID_PROVIDER_REVISION', 'Provider returned an invalid dataset revision.');
  }
  return value;
}

function requireProviderResult(value, request, maxBars) {
  const fields = ['batch', 'coverage'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || fields.some((field) => !Object.hasOwn(value, field))
    || Object.keys(value).some((field) => !fields.includes(field))) {
    failProviderExecution('INVALID_PROVIDER_RESULT', 'Provider result must contain batch and coverage only.');
  }
  const batch = createRawBarBatch(value.batch);
  const coverage = createCoverageReport(value.coverage);
  const key = rawBarRequestKey(request);
  if (batch.requestKey !== key || coverage.requestKey !== key) {
    failProviderExecution('PROVIDER_RESULT_IDENTITY_MISMATCH', 'Provider result identity differs from its request.');
  }
  if (batch.bars.length > maxBars) {
    failProviderExecution('PROVIDER_BAR_LIMIT_EXCEEDED', 'Provider returned more bars than its declared limit.');
  }
  return Object.freeze({ batch, coverage });
}

function createLinkedSignal(rootSignal, callerSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of [rootSignal, callerSignal]) {
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  }
  return Object.freeze({
    signal: controller.signal,
    cleanup() {
      rootSignal.removeEventListener('abort', abort);
      callerSignal?.removeEventListener('abort', abort);
    },
  });
}

function createQueue(concurrency, runContext, rootSignal) {
  const queue = [];
  let active = 0;
  let disposed = false;
  function pump() {
    while (!disposed && active < concurrency && queue.length > 0) {
      const task = queue.shift();
      if (task.settled) continue;
      active += 1;
      const linked = createLinkedSignal(rootSignal, task.callerSignal);
      executeWithProviderPolicy(task.operation, { ...runContext, parentSignal: linked.signal })
        .then(task.resolveOnce, task.rejectOnce)
        .finally(() => { linked.cleanup(); active -= 1; pump(); });
    }
  }
  return Object.freeze({
    enqueue(operation, callerSignal) {
      if (disposed) return Promise.reject(new ProviderExecutionError('PROVIDER_EXECUTOR_DISPOSED', 'Provider executor is disposed.'));
      if (callerSignal?.aborted) return Promise.reject(new ProviderExecutionError('PROVIDER_EXECUTION_ABORTED', 'Provider execution was aborted.'));
      const task = { operation, callerSignal, settled: false };
      task.promise = new Promise((resolve, reject) => {
        task.resolveOnce = (value) => { if (!task.settled) { task.settled = true; resolve(value); } };
        task.rejectOnce = (error) => { if (!task.settled) { task.settled = true; reject(error); } };
      });
      queue.push(task);
      pump();
      return task.promise;
    },
    dispose() {
      disposed = true;
      const error = new ProviderExecutionError('PROVIDER_EXECUTOR_DISPOSED', 'Provider executor is disposed.');
      for (const task of queue.splice(0)) task.rejectOnce(error);
    },
  });
}

/**
 * Wrap one adapter with its policy. The returned port can be injected into Bar
 * Data Runtime and adds no Session, Replay, chart, or global singleton state.
 */
export function createPolicyBoundProvider({
  policy: policyValue,
  adapter: adapterValue,
  now = Date.now,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  const policy = defineProviderPolicy(policyValue);
  const adapter = requireProviderAdapter(adapterValue, policy);
  if (typeof now !== 'function' || typeof schedule !== 'function' || typeof cancel !== 'function') {
    failProviderExecution('INVALID_PROVIDER_EXECUTOR_CONFIG', 'Clock and scheduler ports must be functions.');
  }
  const rootController = new AbortController();
  const runContext = { policy, schedule, cancel };
  const queue = createQueue(policy.requestLimits.maxConcurrentRequests, runContext, rootController.signal);
  const revisions = createRevisionCache(now);
  const revisionInflight = new Map();
  const coverage = new Map();
  let disposed = false;

  function resolveDatasetRevision(scopeValue, { signal } = {}) {
    if (disposed) return Promise.reject(new ProviderExecutionError('PROVIDER_EXECUTOR_DISPOSED', 'Provider executor is disposed.'));
    const scope = normalizeScope(scopeValue, policy.providerId);
    const key = revisionKey(scope);
    const cached = revisions.get(key, policy.revision);
    if (cached) return Promise.resolve(cached);
    if (revisionInflight.has(key)) return revisionInflight.get(key);
    const promise = queue.enqueue(({ signal: providerSignal }) => (
      adapter.resolveDatasetRevision(scope, { signal: providerSignal })
    ), signal)
      .then(requireRevision)
      .then((revision) => {
        if (disposed) throw new ProviderExecutionError('PROVIDER_EXECUTOR_DISPOSED', 'Provider executor is disposed.');
        revisions.set(key, revision);
        return revision;
      })
      .finally(() => revisionInflight.delete(key));
    revisionInflight.set(key, promise);
    return promise;
  }

  function requestRawBars(requestValue, { signal } = {}) {
    if (disposed) return Promise.reject(new ProviderExecutionError('PROVIDER_EXECUTOR_DISPOSED', 'Provider executor is disposed.'));
    const request = createRawBarRequest(requestValue);
    if (request.providerId !== policy.providerId
      || request.windowEndEpochMs - request.windowStartEpochMs > policy.requestLimits.maxWindowDurationMs) {
      return Promise.reject(new ProviderExecutionError('PROVIDER_REQUEST_OUTSIDE_POLICY', 'Raw request exceeds provider policy.'));
    }
    return queue.enqueue(({ signal: providerSignal }) => (
      adapter.requestRawBars(request, { signal: providerSignal })
    ), signal)
      .then((value) => requireProviderResult(value, request, policy.requestLimits.maxBarsPerRequest))
      .then((result) => {
        if (disposed) throw new ProviderExecutionError('PROVIDER_EXECUTOR_DISPOSED', 'Provider executor is disposed.');
        coverage.set(result.coverage.requestKey, result.coverage);
        return result.batch;
      });
  }

  function coverageFor(requestValue) {
    const key = rawBarRequestKey(createRawBarRequest(requestValue));
    return coverage.get(key) ?? null;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    rootController.abort();
    queue.dispose();
    revisions.clear();
    revisionInflight.clear();
    coverage.clear();
  }

  return Object.freeze({
    providerId: policy.providerId,
    resolveDatasetRevision,
    requestRawBars,
    coverageFor,
    dispose,
  });
}
