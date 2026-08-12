import {
  preparePackageQuarantine,
  preparePackageRollback,
  preparePackageUninstall,
} from './command-preparations.js';
import { preparePackageAdmission } from './admission-preparation.js';
import {
  preparePackageSettingsApply,
  preparePackageSettingsReset,
} from './settings-preparations.js';
import {
  createEmptyLocalPluginInventory,
  readLocalPluginInventory,
  serializeLocalPluginInventory,
} from './inventory-value.js';
import { digestPackageStoreValue } from './portable-digest.js';
import { readPluginPackageStorePreparationInternal } from './store-preparation.js';
import {
  projectPackageStoreSnapshot,
  sanitizedRestrictedSnapshot,
  validatePackageStorageSnapshot,
} from './storage-snapshot.js';
import {
  executePluginPackageTransaction,
  recoverPluginPackageTransaction,
} from './transaction-executor.js';
import { failPluginPackageStore } from './store-error.js';
import {
  initialPackageStorageChange,
  PACKAGE_STORE_IDENTIFIER_PATTERN,
  packageStoreDiagnostic,
  packageTransactionIdFactory,
  requirePackageCommandId,
  requirePackageStoragePort,
} from './runtime-support.js';

/** Own the sole device-local package inventory, exact commands, and deterministic recovery. */
export function createPluginPackageStoreRuntime({
  cryptoPort = globalThis.crypto,
  hostApiVersion = '1.0.0',
  idFactory,
  storage,
} = {}) {
  const port = requirePackageStoragePort(storage);
  const nextTransactionId = packageTransactionIdFactory(idFactory);
  if (!cryptoPort?.subtle || typeof hostApiVersion !== 'string') {
    failPluginPackageStore('V7DK_STORAGE_CRYPTO_UNAVAILABLE', 'Package store runtime ports are invalid.');
  }
  const listeners = new Set();
  let busy = false;
  let diagnostics = Object.freeze([]);
  let disposed = false;
  let indexes = null;
  let initializing = null;
  let mode = 'uninitialized';
  let rawSnapshot = null;
  let restrictedToken = null;

  function requireLive() {
    if (disposed) failPluginPackageStore('V7DK_PACKAGE_STORE_DISPOSED', 'Package store is disposed.');
  }

  function requireReady() {
    requireLive();
    if (mode === 'restricted') {
      failPluginPackageStore('V7DK_RESTRICTED_MODE', 'Package lifecycle commands are disabled in Restricted Mode.');
    }
    if (mode !== 'normal' || indexes === null) {
      failPluginPackageStore('V7DK_PACKAGE_STORE_UNINITIALIZED', 'Package store is not initialized.');
    }
    return indexes;
  }

  function publicSnapshot() {
    requireLive();
    if (mode === 'restricted') {
      return sanitizedRestrictedSnapshot(rawSnapshot, diagnostics, restrictedToken);
    }
    if (mode !== 'normal' || indexes === null) {
      return Object.freeze({
        diagnostics: Object.freeze([]),
        externalContributions: Object.freeze([]),
        installed: Object.freeze([]),
        mode: 'uninitialized',
        pending: null,
        productionExecutionAuthorized: false,
        quarantined: Object.freeze([]),
        revision: null,
        tombstones: Object.freeze([]),
      });
    }
    return projectPackageStoreSnapshot(indexes, diagnostics);
  }

  function publish() {
    const snapshot = publicSnapshot();
    for (const listener of listeners) {
      try { listener(snapshot); } catch { listeners.delete(listener); }
    }
    return snapshot;
  }

  async function enterRestricted(error, raw = rawSnapshot) {
    rawSnapshot = raw;
    indexes = null;
    mode = 'restricted';
    diagnostics = Object.freeze([packageStoreDiagnostic(error)]);
    restrictedToken = await digestPackageStoreValue({
      codes: diagnostics.map(({ code }) => code),
      generationIds: (Array.isArray(raw?.generations) ? raw.generations : []).flatMap((value) => (
        typeof value?.generationId === 'string' ? [value.generationId] : []
      )).sort(),
      revision: Number.isSafeInteger(raw?.inventory?.revision) ? raw.inventory.revision : null,
    }, cryptoPort);
    return publish();
  }

  async function validate(raw) {
    return validatePackageStorageSnapshot(raw, { cryptoPort, hostApiVersion });
  }

  function rawCasIdentity() {
    return Object.freeze({
      pendingTransactionId: typeof rawSnapshot?.inventory?.pending?.transactionId === 'string'
        ? rawSnapshot.inventory.pending.transactionId : null,
      revision: Number.isSafeInteger(rawSnapshot?.inventory?.revision)
        && rawSnapshot.inventory.revision >= 0 ? rawSnapshot.inventory.revision : null,
    });
  }

  async function settle(raw) {
    let candidate = raw;
    let validated = await validate(candidate);
    if (readLocalPluginInventory(validated.inventory).pending !== null) {
      let lastFailure;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          candidate = await recoverPluginPackageTransaction({
            cryptoPort,
            inventory: validated.inventory,
            storage: port,
            storageSnapshot: candidate,
            verifyStorageSnapshot: validate,
          });
          validated = await validate(candidate);
          lastFailure = null;
          break;
        } catch (error) {
          lastFailure = error;
          try {
            candidate = await port.read();
            validated = await validate(candidate);
          } catch {
            // The second attempt must inspect the same durable uncertainty.
          }
        }
      }
      if (lastFailure) throw lastFailure;
    }
    rawSnapshot = candidate;
    indexes = validated;
    diagnostics = Object.freeze([]);
    restrictedToken = null;
    mode = 'normal';
    return publish();
  }

  async function initialize() {
    requireLive();
    if (mode === 'normal') return publicSnapshot();
    if (initializing !== null) return initializing;
    if (busy) failPluginPackageStore('V7DK_TRANSACTION_CONCURRENT', 'Package recovery is already settling.');
    busy = true;
    let raw;
    const attempt = (async () => {
      try {
        await port.initialize();
        raw = await port.read();
        if (raw.inventory === null) {
          try {
            await port.transact(initialPackageStorageChange());
          } catch (error) {
            if (error?.code !== 'PLUGIN_PACKAGE_STORAGE_CAS_STALE') throw error;
          }
          raw = await port.read();
        }
        return await settle(raw);
      } catch (error) {
        return enterRestricted(error, raw ?? null);
      }
    })();
    initializing = attempt;
    try {
      return await attempt;
    } finally {
      if (initializing === attempt) initializing = null;
      busy = false;
    }
  }

  async function prepare(action, input) {
    if (busy) failPluginPackageStore('V7DK_TRANSACTION_CONCURRENT', 'Another package transaction is unsettled.');
    return action(requireReady(), { ...input, cryptoPort });
  }

  async function refreshAfterFailure(error) {
    let raw;
    try {
      raw = await port.read();
      const validated = await validate(raw);
      rawSnapshot = raw;
      indexes = validated;
      mode = 'normal';
      diagnostics = Object.freeze([]);
      publish();
    } catch (refreshError) {
      await enterRestricted(refreshError, raw ?? rawSnapshot);
    }
    throw error;
  }

  async function commitPrepared(candidate, {
    commandId: commandValue,
    confirmationId = null,
    signal = null,
  } = {}) {
    const current = requireReady();
    if (busy) failPluginPackageStore('V7DK_TRANSACTION_CONCURRENT', 'Another package transaction is unsettled.');
    const id = requirePackageCommandId(commandValue);
    const prepared = readPluginPackageStorePreparationInternal(candidate);
    const plan = prepared.publicPlan;
    const inventory = readLocalPluginInventory(current.inventory);
    if (inventory.revision !== plan.baseRevision || inventory.pending !== null) {
      failPluginPackageStore('V7DK_INVENTORY_STALE', 'Prepared package command is stale.');
    }
    if (current.receipts.has(id)) {
      failPluginPackageStore('V7DK_TRANSACTION_REPLAYED', 'Package command receipt was already committed.');
    }
    if (plan.confirmationId !== confirmationId) {
      failPluginPackageStore('V7DK_CONFIRMATION_REQUIRED', 'Confirm the exact package digest and inventory revision.');
    }
    const transactionId = nextTransactionId();
    if (typeof transactionId !== 'string' || !PACKAGE_STORE_IDENTIFIER_PATTERN.test(transactionId)
      || current.journals.has(transactionId)
      || [...current.receipts.values()].some((receipt) => receipt.transactionId === transactionId)) {
      failPluginPackageStore('V7DK_TRANSACTION_RECEIPT_INVALID', 'Package transaction identity is invalid.');
    }
    busy = true;
    try {
      const result = await executePluginPackageTransaction({
        baseInventory: current.inventory,
        baseRevision: plan.baseRevision,
        candidateDigest: plan.candidateDigest,
        cleanupGenerationIds: prepared.cleanupGenerationIds,
        cleanupSettingsRecordIds: prepared.cleanupSettingsRecordIds,
        commandId: id,
        committedInventory: prepared.committedInventory,
        confirmed: prepared.confirmed,
        cryptoPort,
        generationPuts: prepared.generationPuts,
        migrationEvidence: prepared.migrationEvidence,
        operation: plan.operation,
        packageId: plan.packageId,
        resultState: prepared.resultState,
        settingsPuts: prepared.settingsPuts,
        signal,
        storage: port,
        transactionId,
        verifyStorageSnapshot: validate,
      });
      rawSnapshot = await port.read();
      indexes = await validate(rawSnapshot);
      diagnostics = result.cleanupPending
        ? Object.freeze([Object.freeze({
          code: 'V7DK_STORAGE_CLEANUP_PENDING',
          message: 'The committed package generation is complete; cleanup will resume on restart.',
        })])
        : Object.freeze([]);
      mode = 'normal';
      publish();
      return Object.freeze({
        cleanupPending: result.cleanupPending,
        commitWasUncertain: result.commitWasUncertain,
        receipt: result.receipt,
        snapshot: publicSnapshot(),
      });
    } catch (error) {
      if (error?.code === 'V7DK_STORAGE_RECOVERY_FAILED') {
        let raw;
        try { raw = await port.read(); } catch { raw = rawSnapshot; }
        await enterRestricted(error, raw);
        throw error;
      }
      return await refreshAfterFailure(error);
    } finally {
      busy = false;
    }
  }

  return Object.freeze({
    commitPrepared,
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      port.close();
    },
    exportDiagnostics() {
      requireLive();
      const snapshot = publicSnapshot();
      return Object.freeze({
        diagnostics: snapshot.diagnostics,
        mode: snapshot.mode,
        packageIdentities: Object.freeze([
          ...snapshot.installed,
          ...snapshot.quarantined,
          ...snapshot.tombstones,
        ].map(({ candidateDigest = null, generationId = null, packageId = null, packageVersion = null }) => Object.freeze({
          candidateDigest, generationId, packageId, packageVersion,
        }))),
        productionExecutionAuthorized: false,
        revision: snapshot.revision,
      });
    },
    initialize,
    prepareInstall(input) { return prepare(preparePackageAdmission, input); },
    prepareQuarantine(input) { return prepare(preparePackageQuarantine, input); },
    prepareRollback(input) { return prepare(preparePackageRollback, input); },
    prepareSettingsApply(input) { return prepare(preparePackageSettingsApply, input); },
    prepareSettingsReset(input) { return prepare(preparePackageSettingsReset, input); },
    prepareUninstall(input) { return prepare(preparePackageUninstall, input); },
    async removeRestrictedInventory({ confirmationToken } = {}) {
      requireLive();
      if (busy) failPluginPackageStore('V7DK_TRANSACTION_CONCURRENT', 'A package transaction is still settling.');
      if (mode !== 'restricted' || confirmationToken !== restrictedToken) {
        failPluginPackageStore('V7DK_CONFIRMATION_REQUIRED', 'Restricted inventory removal requires its exact recovery token.');
      }
      busy = true;
      try {
        await port.initialize();
        await port.reset(
          serializeLocalPluginInventory(createEmptyLocalPluginInventory()),
          rawCasIdentity(),
        );
        return settle(await port.read());
      } catch (error) {
        await enterRestricted(error);
        const failure = packageStoreDiagnostic(error, 'V7DK_STORAGE_RECOVERY_FAILED');
        failPluginPackageStore(failure.code, failure.message, { cause: error });
      } finally {
        busy = false;
      }
    },
    async retryRecovery() {
      requireLive();
      if (busy) failPluginPackageStore('V7DK_TRANSACTION_CONCURRENT', 'A package transaction is still settling.');
      if (mode !== 'restricted') return publicSnapshot();
      busy = true;
      try {
        await port.initialize();
        return await settle(await port.read());
      } catch (error) {
        return await enterRestricted(error);
      } finally {
        busy = false;
      }
    },
    snapshot: publicSnapshot,
    subscribe(listener) {
      requireLive();
      if (typeof listener !== 'function') throw new TypeError('Package store listener is invalid.');
      listeners.add(listener);
      try { listener(publicSnapshot()); } catch (error) { listeners.delete(listener); throw error; }
      return Object.freeze({ unsubscribe: () => listeners.delete(listener) });
    },
  });
}
