/**
 * Owner: plugin-package-store.
 * Purpose: expose the sole device-local inactive-package inventory and exact transaction commands.
 * Inputs: branded package candidates/manifests, immutable archive bytes, exact revisions, confirmations, and storage ports.
 * Outputs: byte-free immutable snapshots, preparations, receipts, quarantine/tombstone state, and sanitized recovery evidence.
 * Side effects: writes only through adapter.plugin-package-storage; never touches Core profile, ModuleHost, domain evidence, DOM, or network.
 * Lifecycle: initialize/recover before use, serialize commands, subscribe read-only consumers, then dispose.
 * Errors: stable V7DK diagnostics reject stale, replayed, concurrent, corrupt, incompatible, or unconfirmed commands.
 * Concurrency/cancellation: one in-flight command plus storage CAS; pre-commit cancellation rolls staged records back exactly.
 * Protected invariants: every visible state is an old complete or new complete immutable generation and always remains inactive.
 */
export { PluginPackageStoreError } from './store-error.js';
export { createPluginPackageStoreRuntime } from './package-store-runtime.js';
export {
  createEmptyLocalPluginInventory,
  deserializeLocalPluginInventory,
  INVENTORY_SCHEMA,
  readLocalPluginInventory,
  serializeLocalPluginInventory,
} from './inventory-value.js';
export { readPluginPackageStorePreparation } from './store-preparation.js';
