import { canonicalPackageStoreValue } from './portable-digest.js';
import {
  PACKAGE_STORE_RECORD_VERSION,
  readStoredPackageGeneration,
  readStoredPackageSettings,
  requirePackageStoreOperation,
} from './package-records.js';
import { failPluginPackageStore } from './store-error.js';

export const INVENTORY_SCHEMA = 'v7.local-plugin-inventory';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const DIAGNOSTIC = /^[A-Z][A-Z0-9_]{1,127}$/u;

class LocalPluginInventoryValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function exact(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} fields are invalid.`);
  }
  return value;
}

function digest(value, label) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} is invalid.`);
  }
  return value;
}

function identifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} is invalid.`);
  }
  return value;
}

function sourceRecord(value) {
  exact(value, [
    'automaticUpdate', 'digest', 'kind', 'publisherVerification', 'signature', 'trust',
  ], 'Installed source record');
  if (value.kind !== 'local-archive' || value.trust !== 'unverified-local'
    || value.automaticUpdate !== false || value.signature !== 'not-applicable'
    || value.publisherVerification !== 'self-asserted') {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Installed source record increased authority.');
  }
  return Object.freeze({ ...value, digest: digest(value.digest, 'Installed source digest') });
}

function retainedPrior(value) {
  if (value === null) return null;
  exact(value, ['generationId', 'settingsRecordId'], 'Retained prior generation');
  return Object.freeze({
    generationId: digest(value.generationId, 'Prior generation id'),
    settingsRecordId: digest(value.settingsRecordId, 'Prior settings record id'),
  });
}

function installedSelection(value, packageId) {
  exact(value, [
    'activated', 'candidateDigest', 'generationId', 'packageId', 'packageVersion',
    'productionExecutionAuthorized', 'publisherTrusted', 'retainedPrior', 'settingsRecordId',
    'settingsSchemaVersion', 'source', 'state',
  ], 'Installed package selection');
  if (value.packageId !== packageId || value.state !== 'installed-inactive'
    || value.activated !== false || value.publisherTrusted !== false
    || value.productionExecutionAuthorized !== false
    || !Number.isSafeInteger(value.settingsSchemaVersion) || value.settingsSchemaVersion < 1) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Installed package selection is invalid.');
  }
  const candidateDigest = digest(value.candidateDigest, 'Installed candidate digest');
  const generationId = digest(value.generationId, 'Installed generation id');
  if (candidateDigest !== generationId) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Installed generation identity is not content-addressed.');
  }
  return Object.freeze({
    ...value,
    candidateDigest,
    generationId,
    packageId: identifier(value.packageId, 'Installed package id'),
    packageVersion: identifier(value.packageVersion, 'Installed package version'),
    retainedPrior: retainedPrior(value.retainedPrior),
    settingsRecordId: digest(value.settingsRecordId, 'Installed settings record id'),
    source: sourceRecord(value.source),
  });
}

function quarantinedSelection(value, packageId) {
  exact(value, [
    'candidateDigest', 'diagnosticCode', 'generationId', 'packageId', 'packageVersion',
    'settingsRecordId', 'source', 'state',
  ], 'Quarantined package selection');
  if (value.packageId !== packageId || value.state !== 'quarantined'
    || typeof value.diagnosticCode !== 'string' || !DIAGNOSTIC.test(value.diagnosticCode)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Quarantined package selection is invalid.');
  }
  return Object.freeze({
    ...value,
    candidateDigest: digest(value.candidateDigest, 'Quarantined candidate digest'),
    generationId: digest(value.generationId, 'Quarantined generation id'),
    packageId: identifier(value.packageId, 'Quarantined package id'),
    packageVersion: identifier(value.packageVersion, 'Quarantined package version'),
    settingsRecordId: digest(value.settingsRecordId, 'Quarantined settings record id'),
    source: sourceRecord(value.source),
  });
}

function tombstone(value, packageId) {
  exact(value, [
    'candidateDigest', 'generationId', 'packageId', 'packageVersion', 'removedRevision',
    'retainedSettingsRecordId', 'retention', 'settingsSchemaVersion', 'source', 'state',
  ], 'Package tombstone');
  if (value.packageId !== packageId || value.state !== 'removed'
    || value.retention !== 'preserve-on-uninstall'
    || !Number.isSafeInteger(value.removedRevision) || value.removedRevision < 1
    || !Number.isSafeInteger(value.settingsSchemaVersion) || value.settingsSchemaVersion < 1) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Package tombstone is invalid.');
  }
  return Object.freeze({
    ...value,
    candidateDigest: digest(value.candidateDigest, 'Tombstone candidate digest'),
    generationId: digest(value.generationId, 'Tombstone generation id'),
    packageId: identifier(value.packageId, 'Tombstone package id'),
    packageVersion: identifier(value.packageVersion, 'Tombstone package version'),
    retainedSettingsRecordId: digest(value.retainedSettingsRecordId, 'Tombstone settings id'),
    source: sourceRecord(value.source),
  });
}

function pendingTransaction(value, revision) {
  if (value === null) return null;
  exact(value, [
    'baseRevision', 'candidateDigest', 'commandId', 'operation', 'packageId', 'phase',
    'targetRevision', 'transactionId',
  ], 'Pending package transaction');
  if (!['committed', 'staged'].includes(value.phase)
    || !Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0
    || value.targetRevision !== value.baseRevision + 1
    || revision !== (value.phase === 'staged' ? value.baseRevision : value.targetRevision)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Pending package transaction revision is invalid.');
  }
  return Object.freeze({
    ...value,
    candidateDigest: digest(value.candidateDigest, 'Pending candidate digest'),
    commandId: identifier(value.commandId, 'Pending command id'),
    operation: requirePackageStoreOperation(value.operation),
    packageId: identifier(value.packageId, 'Pending package id'),
    transactionId: identifier(value.transactionId, 'Pending transaction id'),
  });
}

function recordMap(value, label, normalize) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} must be a plain record.`);
  }
  const entries = Object.keys(value).sort().map((packageId) => [
    identifier(packageId, `${label} package id`), normalize(value[packageId], packageId),
  ]);
  return Object.freeze(Object.fromEntries(entries));
}

function normalizedInventory(value) {
  exact(value, [
    'installed', 'pending', 'quarantined', 'revision', 'schema', 'tombstones', 'version',
  ], 'Local package inventory');
  if (value.schema !== INVENTORY_SCHEMA || value.version !== PACKAGE_STORE_RECORD_VERSION
    || !Number.isSafeInteger(value.revision) || value.revision < 0) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Local package inventory header is invalid.');
  }
  const installed = recordMap(value.installed, 'Installed inventory', installedSelection);
  const quarantined = recordMap(value.quarantined, 'Quarantined inventory', quarantinedSelection);
  if (Object.keys(installed).some((packageId) => Object.hasOwn(quarantined, packageId))) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'A package cannot be installed and quarantined simultaneously.');
  }
  return Object.freeze({
    installed,
    pending: pendingTransaction(value.pending, value.revision),
    quarantined,
    revision: value.revision,
    schema: INVENTORY_SCHEMA,
    tombstones: recordMap(value.tombstones, 'Tombstone inventory', tombstone),
    version: PACKAGE_STORE_RECORD_VERSION,
  });
}

/** Create the missing-device initial inventory without touching Core profile state. */
export function createEmptyLocalPluginInventory() {
  return new LocalPluginInventoryValue(normalizedInventory({
    installed: {}, pending: null, quarantined: {}, revision: 0,
    schema: INVENTORY_SCHEMA, tombstones: {}, version: PACKAGE_STORE_RECORD_VERSION,
  }));
}

/** Deserialize and validate one exact device-local inventory record. */
export function deserializeLocalPluginInventory(value) {
  return new LocalPluginInventoryValue(normalizedInventory(value));
}

/** Read one branded inventory record. */
export function readLocalPluginInventory(candidate) {
  if (!(candidate instanceof LocalPluginInventoryValue)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'A branded local package inventory is required.');
  }
  return candidate.read();
}

/** Serialize one branded inventory record to its exact portable storage wire. */
export function serializeLocalPluginInventory(candidate) {
  return readLocalPluginInventory(candidate);
}

export function replaceLocalPluginInventory(candidate, changes) {
  const current = readLocalPluginInventory(candidate);
  return deserializeLocalPluginInventory({ ...current, ...canonicalPackageStoreValue(changes) });
}

export function inventoryWithoutPending(candidate) {
  const current = readLocalPluginInventory(candidate);
  return replaceLocalPluginInventory(candidate, { pending: null });
}

export function createInstalledPackageSelection(generationValue, settingsValue, retained = null) {
  const generation = readStoredPackageGeneration(generationValue);
  const settings = readStoredPackageSettings(settingsValue);
  const candidate = generation.candidate;
  if (settings.packageId !== candidate.packageId || settings.generationId !== generation.generationId
    || settings.schemaVersion !== candidate.persistence.schemaVersion) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Generation and settings identities disagree.');
  }
  return installedSelection({
    activated: false,
    candidateDigest: candidate.candidateDigest,
    generationId: generation.generationId,
    packageId: candidate.packageId,
    packageVersion: candidate.packageVersion,
    productionExecutionAuthorized: false,
    publisherTrusted: false,
    retainedPrior: retained,
    settingsRecordId: settings.settingsRecordId,
    settingsSchemaVersion: settings.schemaVersion,
    source: candidate.source,
    state: 'installed-inactive',
  }, candidate.packageId);
}

export function createQuarantinedPackageSelection(selection, diagnosticCode) {
  return quarantinedSelection({
    candidateDigest: selection.candidateDigest,
    diagnosticCode,
    generationId: selection.generationId,
    packageId: selection.packageId,
    packageVersion: selection.packageVersion,
    settingsRecordId: selection.settingsRecordId,
    source: selection.source,
    state: 'quarantined',
  }, selection.packageId);
}

export function createPackageTombstone(selection, removedRevision) {
  return tombstone({
    candidateDigest: selection.candidateDigest,
    generationId: selection.generationId,
    packageId: selection.packageId,
    packageVersion: selection.packageVersion,
    removedRevision,
    retainedSettingsRecordId: selection.settingsRecordId,
    retention: 'preserve-on-uninstall',
    settingsSchemaVersion: selection.settingsSchemaVersion,
    source: selection.source,
    state: 'removed',
  }, selection.packageId);
}
