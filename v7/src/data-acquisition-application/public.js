/**
 * Owner: application-composition.
 * Purpose: expose the complete supported public contract for data acquisition application.
 * Inputs: validated configuration plus explicitly injected owner, persistence, and presentation ports.
 * Outputs: a bounded application or workspace command surface.
 * Side effects: constructs, wires, invokes, and disposes only the owners named by this composition boundary.
 * Lifecycle: the composed graph lives from factory creation until its exposed dispose operation.
 * Errors: construction and command failures propagate from the responsible owner with stable error codes.
 * Concurrency/cancellation: asynchronous commands preserve cancellation and current-identity checks across owner boundaries.
 */
/** Public application-composition facade for the real Data Acquisition route. */
export { createProductionModuleDefinition } from './application-definition.js';
