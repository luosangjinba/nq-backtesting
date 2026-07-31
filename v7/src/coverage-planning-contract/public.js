/**
 * Owner: coverage-planning-contract.
 * Purpose: expose the complete supported public contract for coverage planning.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
export { CoveragePlanningError } from './coverage-error.js';
export { createCoverageReport, createUnknownCoverageReport } from './coverage-report.js';
export { planCoverageRequests } from './request-planner.js';
