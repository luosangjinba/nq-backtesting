/**
 * Owner: plugin-profile.
 * Purpose: expose the sole device-local Core Plugin active/pending profile owner.
 * Inputs: validated P0a plan/profile values plus explicit storage, identity, module, and host-snapshot ports.
 * Outputs: immutable catalog snapshots, pure preparations, exact staged receipts, and restart validation.
 * Side effects: writes only the injected device-local Core profile storage key and notifies local subscribers.
 * Lifecycle: each isolated runtime initializes against one boot generation and is disposed by application composition.
 * Errors: CorePluginProfileError rejects stale, unconfirmed, unavailable, or unsettled transactions.
 * Concurrency/cancellation: synchronous CAS rejects stale revisions; no hidden queue, network, or background work exists.
 */
export { CorePluginProfileError } from './profile-error.js';
export {
  CORE_PLUGIN_PROFILE_STORAGE_KEY,
  createCorePluginProfileRuntime,
} from './profile-runtime.js';
