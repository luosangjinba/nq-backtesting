import {
  createProviderFailure,
  providerRetryDelay,
} from '../provider-policy-contract/public.js';
import { ProviderExecutionError } from './execution-error.js';

function abortedError() {
  return new ProviderExecutionError('PROVIDER_EXECUTION_ABORTED', 'Provider execution was aborted.');
}

function normalizeFailure(error) {
  if (error instanceof ProviderExecutionError) throw error;
  try {
    return createProviderFailure(error);
  } catch {
    return createProviderFailure({
      kind: 'invalid-response',
      message: error instanceof Error ? error.message : 'Unknown provider failure.',
      retryAfterMs: null,
    });
  }
}

function runAttempt(operation, { deadlineMs, parentSignal, schedule, cancel }) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cancel(timer);
      parentSignal?.removeEventListener('abort', onAbort);
      callback(value);
    };
    const onAbort = () => {
      controller.abort();
      finish(reject, abortedError());
    };
    const timer = schedule(() => {
      controller.abort();
      finish(reject, {
        kind: 'timeout', message: `Provider attempt exceeded ${deadlineMs} ms.`, retryAfterMs: null,
      });
    }, deadlineMs);
    if (parentSignal?.aborted) onAbort();
    else {
      parentSignal?.addEventListener('abort', onAbort, { once: true });
      Promise.resolve()
        .then(() => operation({ signal: controller.signal }))
        .then((value) => finish(resolve, value), (error) => finish(reject, error));
    }
  });
}

function waitForRetry(delayMs, { parentSignal, schedule, cancel }) {
  if (delayMs === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cancel(timer);
      reject(abortedError());
    };
    const timer = schedule(() => {
      parentSignal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    if (parentSignal?.aborted) onAbort();
    else parentSignal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Execute one provider operation under per-attempt deadline and bounded retry. */
export async function executeWithProviderPolicy(operation, context) {
  const { policy } = context;
  for (let attempt = 1; attempt <= policy.retry.maxAttempts; attempt += 1) {
    try {
      return await runAttempt(operation, { ...context, deadlineMs: policy.deadlineMs });
    } catch (error) {
      const failure = normalizeFailure(error);
      const delayMs = providerRetryDelay(policy, failure, attempt);
      if (delayMs === null) {
        throw new ProviderExecutionError('PROVIDER_REQUEST_FAILED', failure.message, {
          kind: failure.kind, retryAfterMs: failure.retryAfterMs, cause: error,
        });
      }
      await waitForRetry(delayMs, context);
    }
  }
  throw new ProviderExecutionError('PROVIDER_REQUEST_FAILED', 'Provider retry policy exhausted.');
}
