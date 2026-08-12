import {
  createEmptyLocalPluginInventory,
  serializeLocalPluginInventory,
} from './inventory-value.js';
import { failPluginPackageStore } from './store-error.js';

export const PACKAGE_STORE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

export function requirePackageStoragePort(value) {
  for (const method of ['close', 'initialize', 'read', 'reset', 'transact']) {
    if (typeof value?.[method] !== 'function') {
      failPluginPackageStore('V7DK_STORAGE_UNAVAILABLE', `Package storage requires ${method}().`);
    }
  }
  return value;
}

export function packageTransactionIdFactory(value) {
  if (typeof value === 'function') return value;
  return () => globalThis.crypto?.randomUUID?.() ?? '';
}

export function initialPackageStorageChange() {
  return Object.freeze({
    expected: Object.freeze({ pendingTransactionId: null, revision: null }),
    generationDeletes: Object.freeze([]),
    generationPuts: Object.freeze([]),
    inventory: serializeLocalPluginInventory(createEmptyLocalPluginInventory()),
    journalDeletes: Object.freeze([]),
    journalPuts: Object.freeze([]),
    phase: 'initialize',
    receiptDeletes: Object.freeze([]),
    receiptPuts: Object.freeze([]),
    settingsDeletes: Object.freeze([]),
    settingsPuts: Object.freeze([]),
  });
}

export function packageStoreDiagnostic(error, fallback = 'V7DK_RESTRICTED_MODE') {
  let code = typeof error?.code === 'string' ? error.code : fallback;
  if (code.startsWith('PLUGIN_PACKAGE_STORAGE_')) {
    if (code.includes('QUOTA')) code = 'V7DK_STORAGE_QUOTA';
    else if (code.includes('READ')) code = 'V7DK_STORAGE_READ_FAILED';
    else if (code.includes('RESET')) code = 'V7DK_STORAGE_RECOVERY_FAILED';
    else if (code.includes('CAS')) code = 'V7DK_INVENTORY_STALE';
    else if (code.includes('OPEN') || code.includes('UNAVAILABLE')
      || code.includes('UNINITIALIZED')) code = 'V7DK_STORAGE_UNAVAILABLE';
    else code = 'V7DK_STORAGE_WRITE_FAILED';
  }
  return Object.freeze({
    code,
    message: typeof error?.message === 'string'
      ? error.message : 'External package inventory is unavailable.',
  });
}

export function requirePackageCommandId(value) {
  if (typeof value !== 'string' || !PACKAGE_STORE_IDENTIFIER_PATTERN.test(value)) {
    failPluginPackageStore('V7DK_TRANSACTION_RECEIPT_INVALID', 'Package command id is invalid.');
  }
  return value;
}
