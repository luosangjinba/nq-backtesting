import {
  inventoryWithoutPending,
  readLocalPluginInventory,
  replaceLocalPluginInventory,
  serializeLocalPluginInventory,
} from './inventory-value.js';
import {
  JOURNAL_SCHEMA,
  PACKAGE_STORE_RECORD_VERSION,
  RECEIPT_SCHEMA,
  readPackageCommandReceipt,
  readPackageTransactionJournal,
} from './package-records.js';
import { digestPackageStoreValue } from './portable-digest.js';
import { failPluginPackageStore, PluginPackageStoreError } from './store-error.js';

function storageCode(error, phase) {
  if (error?.code === 'PLUGIN_PACKAGE_STORAGE_CAS_STALE') return 'V7DK_INVENTORY_STALE';
  if (error?.code === 'PLUGIN_PACKAGE_STORAGE_QUOTA') return 'V7DK_STORAGE_QUOTA';
  if (error?.code?.includes('READ')) return 'V7DK_STORAGE_READ_FAILED';
  if (phase === 'commit') return 'V7DK_STORAGE_COMMIT_FAILED';
  if (phase === 'recovery') return 'V7DK_STORAGE_RECOVERY_FAILED';
  return 'V7DK_STORAGE_WRITE_FAILED';
}

function failStorage(error, phase) {
  if (error instanceof PluginPackageStoreError) throw error;
  failPluginPackageStore(storageCode(error, phase), `Package ${phase} storage phase failed.`, { cause: error });
}

function pendingValue(input, phase) {
  return Object.freeze({
    baseRevision: input.baseRevision,
    candidateDigest: input.candidateDigest,
    commandId: input.commandId,
    operation: input.operation,
    packageId: input.packageId,
    phase,
    targetRevision: input.baseRevision + 1,
    transactionId: input.transactionId,
  });
}

function phaseChange({
  expectedPendingTransactionId,
  expectedRevision,
  generationDeletes = [],
  generationPuts = [],
  inventory,
  journalDeletes = [],
  journalPuts = [],
  phase,
  receiptDeletes = [],
  receiptPuts = [],
  settingsDeletes = [],
  settingsPuts = [],
}) {
  return Object.freeze({
    expected: Object.freeze({
      pendingTransactionId: expectedPendingTransactionId,
      revision: expectedRevision,
    }),
    generationDeletes: Object.freeze(generationDeletes),
    generationPuts: Object.freeze(generationPuts),
    inventory: serializeLocalPluginInventory(inventory),
    journalDeletes: Object.freeze(journalDeletes),
    journalPuts: Object.freeze(journalPuts),
    phase,
    receiptDeletes: Object.freeze(receiptDeletes),
    receiptPuts: Object.freeze(receiptPuts),
    settingsDeletes: Object.freeze(settingsDeletes),
    settingsPuts: Object.freeze(settingsPuts),
  });
}

async function rollbackStaged(storage, baseInventory, journal) {
  try {
    await storage.transact(phaseChange({
      expectedPendingTransactionId: journal.transactionId,
      expectedRevision: journal.baseRevision,
      generationDeletes: journal.stagedGenerationIds,
      inventory: inventoryWithoutPending(baseInventory),
      journalDeletes: [journal.transactionId],
      phase: 'rollback',
      receiptDeletes: [journal.commandId],
      settingsDeletes: journal.stagedSettingsRecordIds,
    }));
  } catch (error) {
    failStorage(error, 'recovery');
  }
}

async function finalizeCommitted(storage, committedInventory, journal) {
  try {
    await storage.transact(phaseChange({
      expectedPendingTransactionId: journal.transactionId,
      expectedRevision: journal.targetRevision,
      generationDeletes: journal.cleanupGenerationIds,
      inventory: inventoryWithoutPending(committedInventory),
      journalDeletes: [journal.transactionId],
      phase: 'finalize',
      settingsDeletes: journal.cleanupSettingsRecordIds,
    }));
    return false;
  } catch {
    return true;
  }
}

function transactionReceipt(input, digest) {
  return readPackageCommandReceipt({
    activated: false,
    baseRevision: input.baseRevision,
    candidateDigest: input.candidateDigest,
    commandId: input.commandId,
    committedRevision: input.baseRevision + 1,
    confirmed: input.confirmed,
    digest,
    migrationEvidence: input.migrationEvidence,
    operation: input.operation,
    packageId: input.packageId,
    productionExecutionAuthorized: false,
    publisherTrusted: false,
    resultState: input.resultState,
    schema: RECEIPT_SCHEMA,
    transactionId: input.transactionId,
    version: PACKAGE_STORE_RECORD_VERSION,
  });
}

async function transactionRecords(input, cryptoPort) {
  const finalInventory = inventoryWithoutPending(input.committedInventory);
  const receiptUnsigned = {
    activated: false,
    baseRevision: input.baseRevision,
    candidateDigest: input.candidateDigest,
    commandId: input.commandId,
    committedRevision: input.baseRevision + 1,
    confirmed: input.confirmed,
    migrationEvidence: input.migrationEvidence,
    operation: input.operation,
    packageId: input.packageId,
    productionExecutionAuthorized: false,
    publisherTrusted: false,
    resultState: input.resultState,
    schema: RECEIPT_SCHEMA,
    transactionId: input.transactionId,
    version: PACKAGE_STORE_RECORD_VERSION,
  };
  const receipt = transactionReceipt(
    input,
    await digestPackageStoreValue(receiptUnsigned, cryptoPort),
  );
  const commonJournal = {
    baseRevision: input.baseRevision,
    candidateDigest: input.candidateDigest,
    cleanupGenerationIds: input.cleanupGenerationIds,
    cleanupSettingsRecordIds: input.cleanupSettingsRecordIds,
    commandId: input.commandId,
    finalInventoryDigest: await digestPackageStoreValue(
      serializeLocalPluginInventory(finalInventory),
      cryptoPort,
    ),
    migrationEvidence: input.migrationEvidence,
    operation: input.operation,
    packageId: input.packageId,
    receiptDigest: receipt.digest,
    schema: JOURNAL_SCHEMA,
    stagedGenerationIds: input.generationPuts.map(({ generationId }) => generationId),
    stagedSettingsRecordIds: input.settingsPuts.map(({ settingsRecordId }) => settingsRecordId),
    targetRevision: input.baseRevision + 1,
    transactionId: input.transactionId,
    version: PACKAGE_STORE_RECORD_VERSION,
  };
  return Object.freeze({
    committedJournal: readPackageTransactionJournal({ ...commonJournal, phase: 'committed' }),
    finalInventory,
    receipt,
    stagedJournal: readPackageTransactionJournal({ ...commonJournal, phase: 'staged' }),
  });
}

function requireNotCancelled(signal) {
  if (signal?.aborted) {
    failPluginPackageStore('V7DK_TRANSACTION_CANCELLED', 'Package transaction was cancelled before commit.');
  }
}

async function resolveCommitFailure({ storage, input, records, verifyStorageSnapshot }, error) {
  let stored;
  try { stored = await storage.read(); } catch (readError) { failStorage(readError, 'recovery'); }
  const pending = stored.inventory?.pending;
  if (pending?.transactionId === input.transactionId && pending.phase === 'committed'
    && stored.inventory.revision === input.baseRevision + 1) {
    await verifyStorageSnapshot(stored);
    return true;
  }
  if (pending?.transactionId === input.transactionId && pending.phase === 'staged'
    && stored.inventory.revision === input.baseRevision) {
    await rollbackStaged(storage, replaceLocalPluginInventory(input.baseInventory, {
      pending: pendingValue(input, 'staged'),
    }), records.stagedJournal);
    failStorage(error, 'commit');
  }
  failPluginPackageStore(
    'V7DK_STORAGE_RECOVERY_FAILED',
    'Commit outcome could not be proven; Restricted Mode is required.',
    { cause: error },
  );
}

/** Execute one staged, verified, atomic package-store transaction. */
export async function executePluginPackageTransaction(input) {
  const records = await transactionRecords(input, input.cryptoPort);
  const stagedInventory = replaceLocalPluginInventory(input.baseInventory, {
    pending: pendingValue(input, 'staged'),
  });
  const committedInventory = replaceLocalPluginInventory(input.committedInventory, {
    pending: pendingValue(input, 'committed'),
  });
  requireNotCancelled(input.signal);
  try {
    await input.storage.transact(phaseChange({
      expectedPendingTransactionId: null,
      expectedRevision: input.baseRevision,
      generationPuts: input.generationPuts,
      inventory: stagedInventory,
      journalPuts: [records.stagedJournal],
      phase: 'stage',
      settingsPuts: input.settingsPuts,
    }));
  } catch (error) {
    failStorage(error, 'stage');
  }
  try {
    const staged = await input.storage.read();
    await input.verifyStorageSnapshot(staged);
    requireNotCancelled(input.signal);
  } catch (error) {
    await rollbackStaged(input.storage, stagedInventory, records.stagedJournal);
    if (error instanceof PluginPackageStoreError) throw error;
    if (typeof error?.code === 'string' && error.code.startsWith('PLUGIN_PACKAGE_STORAGE_')) {
      failStorage(error, 'stage');
    }
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Staged package bytes failed exact verification.', { cause: error });
  }
  let commitWasUncertain = false;
  try {
    await input.storage.transact(phaseChange({
      expectedPendingTransactionId: input.transactionId,
      expectedRevision: input.baseRevision,
      inventory: committedInventory,
      journalPuts: [records.committedJournal],
      phase: 'commit',
      receiptPuts: [records.receipt],
    }));
  } catch (error) {
    commitWasUncertain = await resolveCommitFailure({
      input, records, storage: input.storage, verifyStorageSnapshot: input.verifyStorageSnapshot,
    }, error);
  }
  const cleanupPending = await finalizeCommitted(input.storage, committedInventory, records.committedJournal);
  return Object.freeze({ cleanupPending, commitWasUncertain, receipt: records.receipt });
}

/** Deterministically finish or roll back one durable pending journal after restart. */
export async function recoverPluginPackageTransaction({
  cryptoPort,
  inventory,
  storage,
  storageSnapshot,
  verifyStorageSnapshot,
}) {
  const current = readLocalPluginInventory(inventory);
  if (current.pending === null) return storageSnapshot;
  const journal = readPackageTransactionJournal(storageSnapshot.journals.find(
    ({ transactionId }) => transactionId === current.pending.transactionId,
  ));
  if (journal.phase !== current.pending.phase || journal.baseRevision !== current.pending.baseRevision
    || journal.targetRevision !== current.pending.targetRevision
    || journal.candidateDigest !== current.pending.candidateDigest
    || journal.commandId !== current.pending.commandId
    || journal.operation !== current.pending.operation
    || journal.packageId !== current.pending.packageId
    || journal.transactionId !== current.pending.transactionId) {
    failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'Pending inventory and recovery journal disagree.');
  }
  if (journal.phase === 'staged') {
    await rollbackStaged(storage, inventory, journal);
  } else {
    const finalInventory = inventoryWithoutPending(inventory);
    const digest = await digestPackageStoreValue(serializeLocalPluginInventory(finalInventory), cryptoPort);
    if (digest !== journal.finalInventoryDigest) {
      failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'Committed inventory does not match its recovery marker.');
    }
    await verifyStorageSnapshot(storageSnapshot);
    if (await finalizeCommitted(storage, inventory, journal)) {
      failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'Committed package cleanup could not settle.');
    }
  }
  return storage.read();
}
