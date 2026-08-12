import {
  createIndexedDbPluginPackageStorage,
} from '../../../../src/plugin-package-storage/public.js';
import {
  createEmptyLocalPluginInventory,
  serializeLocalPluginInventory,
} from '../../../../src/plugin-package-store/public.js';

function change({
  expectedRevision,
  generationPuts = [],
  inventory,
  journalPuts = [],
  phase,
  receiptPuts = [],
  settingsPuts = [],
}) {
  return {
    expected: { pendingTransactionId: null, revision: expectedRevision },
    generationDeletes: [],
    generationPuts,
    inventory,
    journalDeletes: [],
    journalPuts,
    phase,
    receiptDeletes: [],
    receiptPuts,
    settingsDeletes: [],
    settingsPuts,
  };
}

const token = new URL(location.href).searchParams.get('token');
const databaseName = `v7.h117.package-storage.${token}`;
const storage = createIndexedDbPluginPackageStorage({ databaseName });

try {
  await storage.initialize();
  const empty = serializeLocalPluginInventory(createEmptyLocalPluginInventory());
  await storage.transact(change({
    expectedRevision: null,
    inventory: empty,
    phase: 'initialize',
  }));

  let cloneFailureCode = null;
  try {
    await storage.transact(change({
      expectedRevision: 0,
      generationPuts: [{ forbidden: () => {}, generationId: 'generation.invalid-clone' }],
      inventory: { ...empty, revision: 1 },
      phase: 'stage',
    }));
  } catch (error) {
    cloneFailureCode = error.code;
  }
  const afterCloneFailure = await storage.read();

  const committed = { ...empty, revision: 1 };
  await storage.transact(change({
    expectedRevision: 0,
    generationPuts: [{ generationId: 'generation.browser', value: 'bytes' }],
    inventory: committed,
    journalPuts: [{ transactionId: 'transaction.browser', value: 'committed' }],
    phase: 'commit',
    receiptPuts: [{ commandId: 'command.browser', value: 'receipt' }],
    settingsPuts: [{ settingsRecordId: 'settings.browser', value: 'settings' }],
  }));
  storage.close();

  const reopened = createIndexedDbPluginPackageStorage({ databaseName });
  await reopened.initialize();
  const durable = await reopened.read();
  let staleCode = null;
  try {
    await reopened.transact(change({
      expectedRevision: 0,
      inventory: { ...committed, revision: 2 },
      phase: 'commit',
    }));
  } catch (error) {
    staleCode = error.code;
  }
  globalThis.__h117PackageStorageEvidence = Object.freeze({
    atomicCloneFailure: Object.freeze({
      code: cloneFailureCode,
      generationCount: afterCloneFailure.generations.length,
      revision: afterCloneFailure.inventory.revision,
    }),
    durable: Object.freeze({
      generationCount: durable.generations.length,
      journalCount: durable.journals.length,
      receiptCount: durable.receipts.length,
      revision: durable.inventory.revision,
      settingsCount: durable.settings.length,
    }),
    staleCode,
  });
  await reopened.reset(empty, { pendingTransactionId: null, revision: 1 });
  const reset = await reopened.read();
  globalThis.__h117PackageStorageEvidence = Object.freeze({
    ...globalThis.__h117PackageStorageEvidence,
    reset: Object.freeze({
      generationCount: reset.generations.length,
      revision: reset.inventory.revision,
      settingsCount: reset.settings.length,
    }),
  });
  reopened.close();
  indexedDB.deleteDatabase(databaseName);
  document.body.dataset.status = 'ready';
} catch (error) {
  globalThis.__h117PackageStorageError = { code: error?.code, message: error?.message, stack: error?.stack };
  document.body.dataset.status = 'error';
}
