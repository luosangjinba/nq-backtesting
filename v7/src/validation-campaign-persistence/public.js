/**
 * Owner: validation-campaign-persistence.
 * Purpose: expose reversible local-first Validation Campaign byte persistence
 * and exact Campaign document storage-key derivation.
 * Inputs: a bounded storage port, expected prior bytes, and portable payloads.
 * Outputs: a CAS persistence adapter, preparations, receipts, and storage keys.
 * Side effects: reads/writes only the injected Campaign storage namespace.
 * Lifecycle: preparations move through prepare/apply/finalize or rollback.
 * Errors: rejects stale CAS, invalid keys, corrupt/orphan bytes, ceilings, and
 * any write or rollback whose exact result cannot be proven.
 * Concurrency/cancellation: synchronous CAS fencing; operations are not
 * cancellable after apply begins and rollback restores exact prior bytes.
 */
export {
  createValidationCampaignPersistenceAdapter,
  validationCampaignDocumentStorageKey,
} from './persistence-adapter.js';
