const EMPTY_OMISSIONS = Object.freeze([]);

const PRODUCT_MODULE_OMISSIONS = Object.freeze({
  'adapter.session-application': Object.freeze([
    'adapter.validation-campaign-ui',
  ]),
});

/**
 * Owner: application-composition.
 * Purpose: expose the explicit build-time product hold without teaching feature modules about product policy.
 * Inputs: one production application root module id.
 * Outputs: an immutable list of root omissions for that product application.
 * Side effects: none; source modules and persisted user records are never changed.
 * Lifecycle: evaluated once for each production application boot.
 * Errors: a non-string root id is rejected before module selection.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
export function readProductionProductModuleOmissions(rootModuleId) {
  if (typeof rootModuleId !== 'string' || rootModuleId.length === 0) {
    throw new TypeError('Production product root module id must be a non-empty string.');
  }
  return PRODUCT_MODULE_OMISSIONS[rootModuleId] ?? EMPTY_OMISSIONS;
}
