/**
 * Owner: plugin-package-storage.
 * Purpose: expose atomic IndexedDB mechanics for immutable local package records.
 * Inputs: exact package-store phase envelopes and an injected IndexedDB factory.
 * Outputs: complete storage snapshots or successful all-record transaction settlement.
 * Side effects: writes only the dedicated device-local package IndexedDB database.
 * Lifecycle: initialize once, transact/read serially or through IndexedDB CAS, then close.
 * Errors: stable adapter errors distinguish availability, quota, read, write, reset, and CAS failures.
 * Concurrency/cancellation: IndexedDB transactions are atomic; owner revisions reject cross-tab staleness.
 */
export { PluginPackageStorageError } from './storage-error.js';
export {
  createIndexedDbPluginPackageStorage,
  PLUGIN_PACKAGE_DATABASE_NAME,
  PLUGIN_PACKAGE_DATABASE_VERSION,
} from './indexeddb-package-storage.js';
