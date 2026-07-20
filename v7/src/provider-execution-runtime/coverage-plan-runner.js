import { createRawBarRequest } from '../bar-data-contract/public.js';
import { failProviderExecution } from './execution-error.js';

/** Start a complete immutable plan; Bar Data Runtime retains cache/concurrency ownership. */
export function acquireCoveragePlan(barDataRuntime, requestValues) {
  if (!barDataRuntime || typeof barDataRuntime.acquire !== 'function' || !Array.isArray(requestValues)) {
    failProviderExecution('INVALID_COVERAGE_ACQUISITION_PLAN', 'Runtime and request plan are required.');
  }
  const requests = requestValues.map(createRawBarRequest);
  return Promise.all(requests.map((request) => barDataRuntime.acquire(request)))
    .then((batches) => Object.freeze(batches));
}
