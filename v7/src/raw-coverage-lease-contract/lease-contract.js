import {
  createRawBarBatch,
  createRawBarRequest,
  rawBarRequestKey,
} from '../bar-data-contract/public.js';
import {
  requireWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { failRawCoverageLeaseContract } from './contract-error.js';
import { requireRawCoverageLeaseScope } from './scope-contract.js';

const CREATE_FIELDS = Object.freeze(['scope', 'readWindow']);
const READ_FIELDS = Object.freeze(['identity', 'request', 'visit']);
const CANCEL_FIELDS = Object.freeze(['code']);
const CANCELLATION_CODE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function requireExactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failRawCoverageLeaseContract(code, `${label} must be an object.`);
  }
  if (fields.some((field) => !Object.hasOwn(value, field))
    || Object.keys(value).some((field) => !fields.includes(field))) {
    failRawCoverageLeaseContract(code, `${label} fields do not match the contract.`);
  }
}

function isThenable(value) {
  return value !== null
    && (typeof value === 'object' || typeof value === 'function')
    && typeof value.then === 'function';
}

function isAsyncFunction(value) {
  return value?.constructor?.name === 'AsyncFunction';
}

function cancellationReason(code, kind) {
  return Object.freeze({ code, kind });
}

/**
 * Owner: Bar Data Runtime contract boundary.
 * Inputs: branded bounded scope and a synchronous owner-provided cache reader.
 * Outputs: one revocable RawCoverageLease with callback-scoped read views.
 * Side effects: invokes the injected cache reader and visitor synchronously;
 * performs no I/O and retains no raw batch.
 * Lifecycle: active -> cancelled -> disposed, or active -> disposed. Cancel and
 * dispose are idempotent; either transition invalidates all future reads.
 * Errors: stable contract errors plus errors from the injected reader/visitor.
 * Concurrency/cancellation: async readers and visitors are forbidden; the
 * exposed AbortSignal is synchronously aborted on cancel or active disposal.
 * Protected invariant: every read repeats full transaction identity and exact
 * leased-window checks, so stale or out-of-scope consumers have zero raw access.
 */
export function createRawCoverageLease(value) {
  requireExactRecord(value, CREATE_FIELDS, 'RAW_COVERAGE_LEASE_INVALID', 'Lease');
  const scope = requireRawCoverageLeaseScope(value.scope);
  if (typeof value.readWindow !== 'function') {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_READ_PORT_INVALID',
      'Raw Coverage Lease requires a synchronous readWindow function.',
    );
  }
  if (isAsyncFunction(value.readWindow)) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_ASYNC_READ_FORBIDDEN',
      'Raw Coverage read views are cache-only and synchronous.',
    );
  }

  const controller = new AbortController();
  const requestKeys = new Set(scope.requestKeys);
  let cancellationCode = null;
  let readWindow = value.readWindow;
  let status = 'active';

  function snapshot() {
    return Object.freeze({
      cancellationCode,
      identity: scope.identity,
      requestKeys: scope.requestKeys,
      schemaVersion: 1,
      status,
    });
  }

  function requireActive() {
    if (status !== 'active') {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_LEASE_INACTIVE',
        `Raw Coverage Lease is ${status}.`,
      );
    }
  }

  function withReadView(input) {
    requireExactRecord(input, READ_FIELDS, 'RAW_COVERAGE_READ_INVALID', 'Read');
    requireActive();
    const identity = requireWorkspaceTransactionIdentity(input.identity);
    if (!workspaceTransactionIdentitiesEqual(identity, scope.identity)) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_LEASE_IDENTITY_MISMATCH',
        'Raw Coverage Lease read identity differs from its transaction scope.',
      );
    }
    if (typeof input.visit !== 'function') {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_VISITOR_INVALID',
        'Raw Coverage read view requires a synchronous visitor.',
      );
    }
    if (isAsyncFunction(input.visit)) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_ASYNC_VISITOR_FORBIDDEN',
        'Raw Coverage visitors cannot extend a raw read beyond the callback.',
      );
    }
    const request = createRawBarRequest(input.request);
    const requestKey = rawBarRequestKey(request);
    if (!requestKeys.has(requestKey)) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_WINDOW_NOT_LEASED',
        'Raw Coverage read request is outside the leased windows.',
      );
    }
    const candidate = readWindow(request, Object.freeze({ signal: controller.signal }));
    if (isThenable(candidate)) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_ASYNC_READ_FORBIDDEN',
        'Raw Coverage read views are cache-only and synchronous.',
      );
    }
    const batch = createRawBarBatch(candidate);
    if (batch.requestKey !== requestKey) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_BATCH_MISMATCH',
        'Raw Coverage owner returned a different request window.',
      );
    }
    requireActive();
    const result = input.visit(batch);
    if (isThenable(result)) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_ASYNC_VISITOR_FORBIDDEN',
        'Raw Coverage visitors cannot extend a raw read beyond the callback.',
      );
    }
    if (result === batch || result === batch.bars) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_RETENTION_FORBIDDEN',
        'Raw batches and raw bar arrays cannot escape the read-view callback.',
      );
    }
    requireActive();
    return result;
  }

  function cancel(input) {
    requireExactRecord(input, CANCEL_FIELDS, 'RAW_COVERAGE_CANCEL_INVALID', 'Cancellation');
    if (typeof input.code !== 'string' || !CANCELLATION_CODE_PATTERN.test(input.code)) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_CANCEL_INVALID',
        'Cancellation code must be stable lower-kebab-case.',
      );
    }
    if (status !== 'active') return snapshot();
    cancellationCode = input.code;
    status = 'cancelled';
    readWindow = null;
    controller.abort(cancellationReason(input.code, 'raw-coverage-lease-cancelled'));
    return snapshot();
  }

  function dispose() {
    if (status === 'disposed') return snapshot();
    const wasActive = status === 'active';
    status = 'disposed';
    readWindow = null;
    if (wasActive) {
      controller.abort(cancellationReason('lease-disposed', 'raw-coverage-lease-disposed'));
    }
    return snapshot();
  }

  return Object.freeze({ cancel, dispose, signal: controller.signal, snapshot, withReadView });
}
