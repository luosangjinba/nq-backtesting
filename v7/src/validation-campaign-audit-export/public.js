/**
 * Owner: validation-campaign-audit-export.
 * Purpose: expose deterministic portable Validation Campaign audit export
 * without raw Bars, packages, credentials, native state, paths, or URLs.
 * Inputs: one validated Campaign document and injected crypto digest capability.
 * Outputs: a canonical bounded audit object and payload digest.
 * Side effects: none except the explicitly injected digest call.
 * Lifecycle: stateless factory and per-document preparation calls.
 * Errors: rejects invalid Campaign data, forbidden export content, and ceilings.
 * Concurrency/cancellation: reentrant deterministic calls with no retained work
 * and no cancellation requirement for the bounded payload.
 */
export { createValidationCampaignAuditExporter } from './audit-exporter.js';
