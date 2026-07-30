import { createRawBarRequest } from '../bar-data-contract/public.js';
import {
  createRawCoverageLease,
  createRawCoverageLeasePolicy,
  createRawCoverageLeaseScope,
} from '../raw-coverage-lease-contract/public.js';
import { requireWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { BarDataRuntimeError, failBarDataRuntime } from './runtime-error.js';

function cancellationError() {
  return new BarDataRuntimeError(
    'RAW_COVERAGE_LEASE_CANCELLED',
    'Raw coverage acquisition was cancelled.',
  );
}

function requireSignal(signal) {
  if (!signal || typeof signal.aborted !== 'boolean') {
    failBarDataRuntime('RAW_COVERAGE_SIGNAL_REQUIRED', 'Raw coverage acquisition requires an AbortSignal.');
  }
  if (signal.aborted) throw cancellationError();
  return signal;
}

function awaitWhileActive(promise, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      reject(cancellationError());
    };
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener('abort', abort);
        if (settled) return;
        settled = true;
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', abort);
        if (settled) return;
        settled = true;
        reject(error);
      },
    );
  });
}

/** Bind the public lease contract to Bar Data Runtime-owned raw coverage. */
export function createCoverageLeaseRuntime({ acquire, assertActive, coverage, limits }) {
  const policy = createRawCoverageLeasePolicy({
    maxTotalWindowSpanMs: limits.maxTotalWindowSpanMs,
    maxWindowCount: limits.maxWindowCount,
    maxWindowSpanMs: limits.maxWindowSpanMs,
    schemaVersion: 1,
  });
  const states = new WeakMap();
  const activeLeases = new Set();

  function register({ identity, lease, stage }) {
    const activation = Object.freeze({
      identity,
      requests: stage.requests,
      signal: lease.signal,
      snapshot: lease.snapshot,
      withReadView: lease.withReadView,
    });
    states.set(activation, Object.freeze({ lease, stage }));
    activeLeases.add(activation);
    return activation;
  }

  function stateOf(activation) {
    const state = states.get(activation);
    if (!state || !activeLeases.has(activation)) {
      failBarDataRuntime('RAW_COVERAGE_LEASE_INACTIVE', 'Raw coverage activation is inactive.');
    }
    return state;
  }

  async function acquireCoverageLease({ consumerId, identity, operation, request, signal }) {
    assertActive();
    const transactionIdentity = requireWorkspaceTransactionIdentity(identity);
    const activeSignal = requireSignal(signal);
    const normalizedRequest = createRawBarRequest(request);
    const batch = await awaitWhileActive(acquire(normalizedRequest), activeSignal);
    assertActive();
    requireSignal(activeSignal);
    const stage = coverage.stage({ acquired: batch, consumerId, operation });
    try {
      const scope = createRawCoverageLeaseScope({
        identity: transactionIdentity,
        policy,
        requests: stage.requests,
        schemaVersion: 1,
      });
      const lease = createRawCoverageLease({
        readWindow: (window) => coverage.readStage(stage.token, window),
        scope,
      });
      return register({ identity: transactionIdentity, lease, stage });
    } catch (error) {
      coverage.reject(stage.token);
      throw error;
    }
  }

  function commitCoverageLeases({ activeConsumerIds, leases }) {
    assertActive();
    if (!Array.isArray(leases)) {
      failBarDataRuntime('RAW_COVERAGE_LEASE_SET_INVALID', 'Raw coverage commit requires a lease array.');
    }
    const entries = leases.map((activation) => ({ activation, state: stateOf(activation) }));
    for (const { state } of entries) coverage.commit(state.stage.token);
    for (const { activation, state } of entries) {
      state.lease.dispose();
      activeLeases.delete(activation);
    }
    coverage.releaseConsumers(activeConsumerIds);
  }

  function rejectCoverageLeases(leases, code = 'transaction-rejected') {
    if (!Array.isArray(leases)) {
      failBarDataRuntime('RAW_COVERAGE_LEASE_SET_INVALID', 'Raw coverage rejection requires a lease array.');
    }
    for (const activation of leases) {
      if (!activeLeases.has(activation)) continue;
      const state = states.get(activation);
      coverage.reject(state.stage.token);
      state.lease.cancel({ code });
      state.lease.dispose();
      activeLeases.delete(activation);
    }
  }

  async function withAcquiredCoverage({ identity, request, signal, visit }) {
    assertActive();
    if (typeof visit !== 'function') {
      failBarDataRuntime('RAW_COVERAGE_VISITOR_INVALID', 'Raw coverage traversal requires a visitor.');
    }
    const transactionIdentity = requireWorkspaceTransactionIdentity(identity);
    const activeSignal = requireSignal(signal);
    const normalizedRequest = createRawBarRequest(request);
    const batch = await awaitWhileActive(acquire(normalizedRequest), activeSignal);
    assertActive();
    requireSignal(activeSignal);
    const token = coverage.createTransient(batch);
    let lease = null;
    try {
      const scope = createRawCoverageLeaseScope({
        identity: transactionIdentity,
        policy,
        requests: [normalizedRequest],
        schemaVersion: 1,
      });
      lease = createRawCoverageLease({
        readWindow: (window) => coverage.readTransient(token, window),
        scope,
      });
      return lease.withReadView({ identity: transactionIdentity, request: normalizedRequest, visit });
    } finally {
      lease?.dispose();
      coverage.releaseTransient(token);
    }
  }

  function dispose() {
    for (const activation of activeLeases) {
      const state = states.get(activation);
      coverage.reject(state.stage.token);
      state.lease.dispose();
    }
    activeLeases.clear();
  }

  return Object.freeze({
    acquireCoverageLease,
    commitCoverageLeases,
    dispose,
    rejectCoverageLeases,
    withAcquiredCoverage,
  });
}
