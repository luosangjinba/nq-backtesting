import {
  createLocalPluginPackageCandidatePlan,
  createLocalPluginSettingsState,
  defineLocalPluginPackageManifest,
  readLocalPluginPackageCandidatePlan,
  readLocalPluginPackageManifest,
  readLocalPluginSettingsState,
} from '../plugin-contract/public.js';
import {
  deserializeLocalPluginInventory,
  inventoryWithoutPending,
  readLocalPluginInventory,
  serializeLocalPluginInventory,
} from './inventory-value.js';
import {
  readPackageCommandReceipt,
  readPackageTransactionJournal,
  readStoredPackageGeneration,
  readStoredPackageSettings,
} from './package-records.js';
import {
  canonicalPackageStoreJson,
  digestPackageStoreBytes,
  digestPackageStoreValue,
} from './portable-digest.js';
import { failPluginPackageStore } from './store-error.js';

function uniqueIndex(values, key, label, reader) {
  if (!Array.isArray(values)) failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} collection is invalid.`);
  const index = new Map();
  for (const candidate of values) {
    const value = reader(candidate);
    if (index.has(value[key])) failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} identities collide.`);
    index.set(value[key], value);
  }
  return index;
}

function unsignedReceipt(receipt) {
  const { digest, ...unsigned } = receipt;
  return unsigned;
}

function unsignedSettings(settings) {
  const { settingsRecordId, ...unsigned } = settings;
  return unsigned;
}

async function verifyGeneration(generation, cryptoPort, hostApiVersion) {
  if (await digestPackageStoreBytes(generation.archiveBytes, cryptoPort) !== generation.archiveDigest) {
    failPluginPackageStore('V7DK_INTEGRITY_MISMATCH', 'Stored package archive bytes changed.');
  }
  if (await digestPackageStoreValue(generation.manifest, cryptoPort)
    !== generation.candidate.manifestDigest) {
    failPluginPackageStore('V7DK_INTEGRITY_MISMATCH', 'Stored package manifest digest changed.');
  }
  try {
    readLocalPluginPackageCandidatePlan(createLocalPluginPackageCandidatePlan(
      defineLocalPluginPackageManifest(generation.manifest),
      {
        candidateDigest: generation.candidate.candidateDigest,
        contentDigest: generation.candidate.contentDigest,
        hostApiVersion,
        manifestDigest: generation.candidate.manifestDigest,
        source: { digest: generation.archiveDigest, kind: 'local-archive' },
      },
    ));
  } catch (cause) {
    failPluginPackageStore('V7DK_HOST_INCOMPATIBLE', 'Stored package is no longer compatible with this host.', { cause });
  }
}

async function verifySettings(settings, cryptoPort) {
  if (await digestPackageStoreValue(unsignedSettings(settings), cryptoPort)
    !== settings.settingsRecordId) {
    failPluginPackageStore('V7DK_INTEGRITY_MISMATCH', 'Stored package settings digest changed.');
  }
}

async function verifyReceipt(receipt, cryptoPort) {
  if (await digestPackageStoreValue(unsignedReceipt(receipt), cryptoPort) !== receipt.digest) {
    failPluginPackageStore('V7DK_INTEGRITY_MISMATCH', 'Stored package command receipt digest changed.');
  }
}

function settingsValue(settings) {
  return {
    packageValues: settings.packageValues,
    profileValues: settings.profileValues,
    quarantine: settings.quarantine,
    schemaVersion: settings.schemaVersion,
  };
}

function verifySelection(selection, generations, settings, label, { requireVersion = true } = {}) {
  const generation = generations.get(selection.generationId);
  const setting = settings.get(selection.settingsRecordId);
  if (!generation || !setting || generation.candidate.packageId !== selection.packageId
    || (requireVersion && generation.candidate.packageVersion !== selection.packageVersion)
    || setting.packageId !== selection.packageId || setting.generationId !== selection.generationId) {
    failPluginPackageStore('V7DK_INTEGRITY_MISMATCH', `${label} generation or settings record is missing.`);
  }
  const manifest = defineLocalPluginPackageManifest(generation.manifest);
  try { createLocalPluginSettingsState(manifest, settingsValue(setting)); } catch (cause) {
    failPluginPackageStore('V7DK_SETTINGS_INVALID', `${label} settings do not satisfy their manifest.`, { cause });
  }
  return { generation, setting };
}

function referencedIds(inventory, journal) {
  const generationIds = new Set();
  const settingsIds = new Set();
  for (const selection of Object.values(inventory.installed)) {
    generationIds.add(selection.generationId);
    settingsIds.add(selection.settingsRecordId);
    if (selection.retainedPrior !== null) {
      generationIds.add(selection.retainedPrior.generationId);
      settingsIds.add(selection.retainedPrior.settingsRecordId);
    }
  }
  for (const selection of Object.values(inventory.quarantined)) {
    generationIds.add(selection.generationId);
    settingsIds.add(selection.settingsRecordId);
  }
  for (const value of Object.values(inventory.tombstones)) settingsIds.add(value.retainedSettingsRecordId);
  if (journal !== null) {
    for (const id of [...journal.stagedGenerationIds, ...journal.cleanupGenerationIds]) generationIds.add(id);
    for (const id of [...journal.stagedSettingsRecordIds, ...journal.cleanupSettingsRecordIds]) settingsIds.add(id);
  }
  return { generationIds, settingsIds };
}

function verifyPendingReceiptClosure(inventory, journal, receipts) {
  if (journal === null) return;
  const receipt = receipts.get(journal.commandId) ?? null;
  if (journal.phase === 'staged') {
    if (receipt !== null) {
      failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'A staged package journal cannot have a committed receipt.');
    }
    return;
  }
  if (!receipt || receipt.digest !== journal.receiptDigest
    || receipt.transactionId !== journal.transactionId
    || receipt.candidateDigest !== journal.candidateDigest
    || receipt.baseRevision !== journal.baseRevision
    || receipt.committedRevision !== journal.targetRevision
    || receipt.operation !== journal.operation || receipt.packageId !== journal.packageId
    || canonicalPackageStoreJson(receipt.migrationEvidence)
      !== canonicalPackageStoreJson(journal.migrationEvidence)
    || inventory.pending.commandId !== receipt.commandId) {
    failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'Committed package journal and receipt do not close exactly.');
  }
}

function verifyJournalRecordClosure(journal, generations, settings) {
  if (journal === null) return;
  if (journal.stagedGenerationIds.some((id) => !generations.has(id))
    || journal.stagedSettingsRecordIds.some((id) => !settings.has(id))) {
    failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'A pending journal is missing one of its staged immutable records.');
  }
}

function verifyReceiptHistory(inventory, receipts) {
  const values = [...receipts.values()];
  const revisions = values.map(({ committedRevision }) => committedRevision).sort((left, right) => left - right);
  if (values.length !== inventory.revision
    || new Set(values.map(({ transactionId }) => transactionId)).size !== values.length
    || revisions.some((revision, index) => revision !== index + 1)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Package receipt history does not close over every committed revision.');
  }
}

async function verifyCommittedInventoryDigest(inventoryValue, journal, cryptoPort) {
  if (journal?.phase !== 'committed') return;
  const finalInventory = serializeLocalPluginInventory(inventoryWithoutPending(inventoryValue));
  if (await digestPackageStoreValue(finalInventory, cryptoPort) !== journal.finalInventoryDigest) {
    failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'Committed inventory does not match its recovery digest.');
  }
}

/** Validate all inventory pointers, immutable records, digests, and pending-journal closure. */
export async function validatePackageStorageSnapshot(raw, {
  cryptoPort = globalThis.crypto,
  hostApiVersion = '1.0.0',
} = {}) {
  if (!raw || typeof raw !== 'object' || raw.inventory === null) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Package storage snapshot has no inventory.');
  }
  const inventoryValue = deserializeLocalPluginInventory(raw.inventory);
  const inventory = readLocalPluginInventory(inventoryValue);
  const generations = uniqueIndex(raw.generations, 'generationId', 'Generation', readStoredPackageGeneration);
  const settings = uniqueIndex(raw.settings, 'settingsRecordId', 'Settings', readStoredPackageSettings);
  const journals = uniqueIndex(raw.journals, 'transactionId', 'Journal', readPackageTransactionJournal);
  const receipts = uniqueIndex(raw.receipts, 'commandId', 'Receipt', readPackageCommandReceipt);
  const journal = inventory.pending === null ? null : journals.get(inventory.pending.transactionId);
  if ((inventory.pending === null && journals.size !== 0)
    || (inventory.pending !== null && (journals.size !== 1 || !journal))) {
    failPluginPackageStore('V7DK_STORAGE_RECOVERY_FAILED', 'Inventory pending state and journal inventory disagree.');
  }
  await Promise.all([
    ...[...generations.values()].map((value) => verifyGeneration(value, cryptoPort, hostApiVersion)),
    ...[...settings.values()].map((value) => verifySettings(value, cryptoPort)),
    ...[...receipts.values()].map((value) => verifyReceipt(value, cryptoPort)),
  ]);
  verifyPendingReceiptClosure(inventory, journal, receipts);
  verifyJournalRecordClosure(journal, generations, settings);
  verifyReceiptHistory(inventory, receipts);
  await verifyCommittedInventoryDigest(inventoryValue, journal, cryptoPort);
  for (const selection of Object.values(inventory.installed)) {
    verifySelection(selection, generations, settings, 'Installed package');
    if (selection.retainedPrior !== null) {
      verifySelection({
        ...selection,
        generationId: selection.retainedPrior.generationId,
        settingsRecordId: selection.retainedPrior.settingsRecordId,
      }, generations, settings, 'Retained prior package', { requireVersion: false });
    }
  }
  for (const selection of Object.values(inventory.quarantined)) {
    verifySelection(selection, generations, settings, 'Quarantined package');
  }
  for (const value of Object.values(inventory.tombstones)) {
    const setting = settings.get(value.retainedSettingsRecordId);
    if (!setting || setting.packageId !== value.packageId) {
      failPluginPackageStore('V7DK_RETAINED_DATA', 'Tombstone retained settings are missing.');
    }
  }
  const referenced = referencedIds(inventory, journal);
  if ([...generations.keys()].some((id) => !referenced.generationIds.has(id))
    || [...settings.keys()].some((id) => !referenced.settingsIds.has(id))) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Package storage contains an unreferenced partial record.');
  }
  return Object.freeze({ generations, inventory: inventoryValue, journal, journals, receipts, settings });
}

function projectedSettings(generation, settings) {
  const manifest = defineLocalPluginPackageManifest(generation.manifest);
  const state = createLocalPluginSettingsState(manifest, settingsValue(settings));
  return readLocalPluginSettingsState(state, manifest);
}

function packageSummary(selection, indexes) {
  const generation = indexes.generations.get(selection.generationId);
  const settings = indexes.settings.get(selection.settingsRecordId);
  const manifest = readLocalPluginPackageManifest(defineLocalPluginPackageManifest(generation.manifest));
  return Object.freeze({
    activated: false,
    candidateDigest: selection.candidateDigest,
    display: manifest.display,
    generationId: selection.generationId,
    license: manifest.license,
    packageId: selection.packageId,
    packageVersion: selection.packageVersion,
    productionExecutionAuthorized: false,
    publisher: Object.freeze({ ...manifest.publisher, verification: 'self-asserted' }),
    publisherTrusted: false,
    retainedPrior: selection.retainedPrior ?? null,
    settings: projectedSettings(generation, settings),
    source: selection.source,
    state: selection.state,
  });
}

/** Project a byte-free immutable snapshot for future host-rendered Plugin Center consumers. */
export function projectPackageStoreSnapshot(indexes, diagnostics = []) {
  const inventory = readLocalPluginInventory(indexes.inventory);
  return Object.freeze({
    diagnostics: Object.freeze([...diagnostics]),
    externalContributions: Object.freeze([]),
    installed: Object.freeze(Object.values(inventory.installed).map(
      (selection) => packageSummary(selection, indexes),
    )),
    mode: 'normal',
    pending: inventory.pending,
    productionExecutionAuthorized: false,
    quarantined: Object.freeze(Object.values(inventory.quarantined).map((selection) => Object.freeze({
      ...packageSummary({ ...selection, retainedPrior: null }, indexes),
      diagnosticCode: selection.diagnosticCode,
    }))),
    revision: inventory.revision,
    tombstones: Object.freeze(Object.values(inventory.tombstones).map((value) => Object.freeze({
      ...value,
      retainedData: true,
      settings: indexes.settings.get(value.retainedSettingsRecordId) ?? null,
    }))),
  });
}

/** Export only sanitized identities and diagnostics when exact inventory parsing is unavailable. */
export function sanitizedRestrictedSnapshot(raw, diagnostics, token) {
  const safeIds = (values, fields) => Object.freeze((Array.isArray(values) ? values : []).flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const selected = Object.fromEntries(fields.flatMap((field) => (
      typeof value[field] === 'string' ? [[field, value[field]]] : []
    )));
    return Object.keys(selected).length === 0 ? [] : [Object.freeze(selected)];
  }));
  return Object.freeze({
    diagnostics: Object.freeze([...diagnostics]),
    externalContributions: Object.freeze([]),
    installed: Object.freeze([]),
    mode: 'restricted',
    pending: null,
    productionExecutionAuthorized: false,
    quarantined: safeIds(raw?.generations, ['generationId']),
    recoveryToken: token,
    revision: Number.isSafeInteger(raw?.inventory?.revision) ? raw.inventory.revision : null,
    tombstones: safeIds(Object.values(raw?.inventory?.tombstones ?? {}), [
      'candidateDigest', 'generationId', 'packageId', 'packageVersion',
    ]),
  });
}

export function storageSnapshotsEqual(left, right) {
  return canonicalPackageStoreJson(left) === canonicalPackageStoreJson(right);
}
