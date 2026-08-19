/**
 * Owner: validation-campaign-runtime.
 * Purpose: expose the sole-writer Validation Campaign command, observation,
 * analysis, audit, and raw-context runtime.
 * Inputs: persistence, evidence, Outcome, audit, clock, identity, and crypto ports.
 * Outputs: immutable Campaign snapshots, command receipts, previews, and intents.
 * Side effects: commits only Campaign-owned documents through persistence and
 * notifies observers after accepted state changes.
 * Lifecycle: create, asynchronously hydrate, serve serialized commands, dispose.
 * Errors: rejects stale/expired sources, invalid transitions, missing providers,
 * poisoned persistence, concurrency, ceilings, and disposed use.
 * Concurrency/cancellation: one command at a time; preparations are expiring and
 * source-fenced, and disposal invalidates retained previews/subscriptions.
 */
export { createValidationCampaignRuntime } from './validation-campaign-runtime.js';
