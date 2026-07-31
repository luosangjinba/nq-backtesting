/**
 * Owner: layout-sync-domain.
 * Purpose: expose the complete supported public contract for layout sync domain.
 * Inputs: validated domain values and capability policies defined by the exported signatures.
 * Outputs: frozen domain values or deterministic projections.
 * Side effects: none.
 * Lifecycle: stateless values and pure calculations have no disposal phase.
 * Errors: invalid domain input throws the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for immutable multi-Pane Layout Sync policy. */
export {
  createLayoutSync,
  deserializeLayoutSync,
  LAYOUT_SYNC_KEYS,
  LayoutSyncDomainError,
  readLayoutSync,
  serializeLayoutSync,
  setLayoutSync,
} from './layout-sync.js';
