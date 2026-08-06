/**
 * Owner: database-bootstrap-admin.
 * Purpose: expose the optional first-database browser capability independently of market maintenance.
 * Inputs: a DOM host plus an explicitly injected database-import service client.
 * Outputs: template, client, and disposable database-bootstrap panel factories.
 * Side effects: owns only its DOM subtree and authenticated database-import HTTP requests.
 * Lifecycle: panel listeners and requests end at dispose; absence changes no maintenance owner.
 * Errors: service/validation failures remain inside the panel or reject through the client contract.
 * Concurrency/cancellation: upload, polling, and activation share one panel-owned AbortSignal.
 */
export { createDatabaseImportClient } from './database-import-client.js';
export {
  createDatabaseImportPanel,
  databaseImportTemplate,
} from './database-import-panel.js';
