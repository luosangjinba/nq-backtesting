import {
  createLocalPluginPackageCandidatePlan,
  defineLocalPluginPackageManifest,
  readLocalPluginPackageCandidatePlan,
  readLocalPluginPackageManifest,
} from '../plugin-contract/public.js';
import { canonicalPackageStoreJson, canonicalPackageStoreValue } from './portable-digest.js';
import { failPluginPackageStore } from './store-error.js';

export const GENERATION_SCHEMA = 'v7.local-plugin-generation';
export const SETTINGS_SCHEMA = 'v7.local-plugin-settings';
export const JOURNAL_SCHEMA = 'v7.local-plugin-transaction';
export const RECEIPT_SCHEMA = 'v7.local-plugin-command-receipt';
export const PACKAGE_STORE_RECORD_VERSION = 1;

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const OPERATIONS = new Set([
  'downgrade', 'install', 'quarantine', 'replacement', 'rollback',
  'settings-apply', 'settings-reset', 'uninstall', 'upgrade',
]);

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

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function requirePackageStoreOperation(value) {
  if (!OPERATIONS.has(value)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Package transaction operation is invalid.');
  }
  return value;
}

function normalizedManifest(value) {
  try {
    const manifest = readLocalPluginPackageManifest(defineLocalPluginPackageManifest(value));
    if (canonicalPackageStoreJson(manifest) !== canonicalPackageStoreJson(value)) throw new TypeError('non-canonical');
    return manifest;
  } catch (cause) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Stored package manifest is invalid.', { cause });
  }
}

function normalizedCandidate(value, manifest) {
  try {
    const candidate = readLocalPluginPackageCandidatePlan(createLocalPluginPackageCandidatePlan(
      defineLocalPluginPackageManifest(manifest),
      {
        candidateDigest: value.candidateDigest,
        contentDigest: value.contentDigest,
        hostApiVersion: value.compatibility.hostApiVersion,
        manifestDigest: value.manifestDigest,
        source: { digest: value.source.digest, kind: value.source.kind },
      },
    ));
    if (canonicalPackageStoreJson(candidate) !== canonicalPackageStoreJson(value)) throw new TypeError('non-canonical');
    return candidate;
  } catch (cause) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Stored package candidate is invalid.', { cause });
  }
}

/** Create immutable stored bytes and metadata for one inactive package generation. */
export function createStoredPackageGeneration({ archiveBytes, candidate, manifest }) {
  const manifestValue = readLocalPluginPackageManifest(manifest);
  const candidateValue = readLocalPluginPackageCandidatePlan(candidate);
  if (!(archiveBytes instanceof Uint8Array) || candidateValue.packageId !== manifestValue.packageId
    || candidateValue.packageVersion !== manifestValue.packageVersion
    || candidateValue.source.kind !== 'local-archive') {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Package generation inputs do not describe one local archive.');
  }
  return Object.freeze({
    activated: false,
    archiveBytes: new Uint8Array(archiveBytes),
    archiveDigest: candidateValue.source.digest,
    candidate: candidateValue,
    generationId: candidateValue.candidateDigest,
    manifest: manifestValue,
    productionExecutionAuthorized: false,
    publisherTrusted: false,
    schema: GENERATION_SCHEMA,
    state: 'installed-inactive',
    version: PACKAGE_STORE_RECORD_VERSION,
  });
}

/** Validate one stored generation without importing or evaluating its archive payload. */
export function readStoredPackageGeneration(value) {
  exact(value, [
    'activated', 'archiveBytes', 'archiveDigest', 'candidate', 'generationId',
    'manifest', 'productionExecutionAuthorized', 'publisherTrusted', 'schema',
    'state', 'version',
  ], 'Stored package generation');
  if (value.schema !== GENERATION_SCHEMA || value.version !== PACKAGE_STORE_RECORD_VERSION
    || value.state !== 'installed-inactive' || value.activated !== false
    || value.publisherTrusted !== false || value.productionExecutionAuthorized !== false
    || !(value.archiveBytes instanceof Uint8Array)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Stored package generation header is invalid.');
  }
  digest(value.archiveDigest, 'Archive digest');
  digest(value.generationId, 'Generation id');
  const manifest = normalizedManifest(value.manifest);
  const candidate = normalizedCandidate(value.candidate, manifest);
  if (candidate.source.digest !== value.archiveDigest || candidate.candidateDigest !== value.generationId) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Stored package generation identities disagree.');
  }
  return Object.freeze({ ...value, archiveBytes: new Uint8Array(value.archiveBytes), candidate, manifest });
}

/** Create one immutable package-owned settings snapshot. */
export function createStoredPackageSettings({ generationId, packageId, settings, settingsRecordId }) {
  const value = canonicalPackageStoreValue(settings);
  return readStoredPackageSettings({
    generationId,
    packageId,
    packageValues: value.packageValues,
    profileValues: value.profileValues,
    quarantine: value.quarantine,
    schema: SETTINGS_SCHEMA,
    schemaVersion: value.schemaVersion,
    settingsRecordId,
    version: PACKAGE_STORE_RECORD_VERSION,
  });
}

/** Validate one immutable settings record; manifest validation remains contract-owned. */
export function readStoredPackageSettings(value) {
  exact(value, [
    'generationId', 'packageId', 'packageValues', 'profileValues', 'quarantine',
    'schema', 'schemaVersion', 'settingsRecordId', 'version',
  ], 'Stored package settings');
  if (value.schema !== SETTINGS_SCHEMA || value.version !== PACKAGE_STORE_RECORD_VERSION) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Stored settings header is invalid.');
  }
  return Object.freeze({
    generationId: digest(value.generationId, 'Settings generation id'),
    packageId: identifier(value.packageId, 'Settings package id'),
    packageValues: canonicalPackageStoreValue(value.packageValues),
    profileValues: canonicalPackageStoreValue(value.profileValues),
    quarantine: canonicalPackageStoreValue(value.quarantine),
    schema: SETTINGS_SCHEMA,
    schemaVersion: positiveInteger(value.schemaVersion, 'Settings schema version'),
    settingsRecordId: digest(value.settingsRecordId, 'Settings record id'),
    version: PACKAGE_STORE_RECORD_VERSION,
  });
}

function idList(value, label) {
  if (!Array.isArray(value) || value.some((entry) => !DIGEST.test(entry))
    || new Set(value).size !== value.length) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', `${label} is invalid.`);
  }
  return Object.freeze([...value].sort());
}

function migrationEvidenceList(value) {
  if (!Array.isArray(value) || value.length > 32) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Migration evidence is invalid.');
  }
  let previousVersion = null;
  return Object.freeze(value.map((entry) => {
    exact(entry, [
      'actualOutputDigest', 'expectedOutputDigest', 'fromSchemaVersion', 'toSchemaVersion',
    ], 'Migration evidence');
    if (!Number.isSafeInteger(entry.fromSchemaVersion) || entry.fromSchemaVersion < 1
      || !Number.isSafeInteger(entry.toSchemaVersion)
      || entry.toSchemaVersion <= entry.fromSchemaVersion
      || (previousVersion !== null && entry.fromSchemaVersion !== previousVersion)) {
      failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Migration evidence chain is invalid.');
    }
    previousVersion = entry.toSchemaVersion;
    return Object.freeze({
      actualOutputDigest: digest(entry.actualOutputDigest, 'Actual migration output digest'),
      expectedOutputDigest: digest(entry.expectedOutputDigest, 'Expected migration plan digest'),
      fromSchemaVersion: entry.fromSchemaVersion,
      toSchemaVersion: entry.toSchemaVersion,
    });
  }));
}

/** Create or validate one durable staged/committed recovery journal. */
export function readPackageTransactionJournal(value) {
  exact(value, [
    'baseRevision', 'candidateDigest', 'cleanupGenerationIds', 'cleanupSettingsRecordIds',
    'commandId', 'finalInventoryDigest', 'migrationEvidence', 'operation', 'packageId', 'phase',
    'receiptDigest', 'schema', 'stagedGenerationIds', 'stagedSettingsRecordIds',
    'targetRevision', 'transactionId', 'version',
  ], 'Package transaction journal');
  if (value.schema !== JOURNAL_SCHEMA || value.version !== PACKAGE_STORE_RECORD_VERSION
    || !['committed', 'staged'].includes(value.phase)
    || !Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0
    || value.targetRevision !== value.baseRevision + 1) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Package transaction journal header is invalid.');
  }
  return Object.freeze({
    baseRevision: value.baseRevision,
    candidateDigest: digest(value.candidateDigest, 'Journal candidate digest'),
    cleanupGenerationIds: idList(value.cleanupGenerationIds, 'Cleanup generation ids'),
    cleanupSettingsRecordIds: idList(value.cleanupSettingsRecordIds, 'Cleanup settings ids'),
    commandId: identifier(value.commandId, 'Journal command id'),
    finalInventoryDigest: digest(value.finalInventoryDigest, 'Final inventory digest'),
    migrationEvidence: migrationEvidenceList(value.migrationEvidence),
    operation: requirePackageStoreOperation(value.operation),
    packageId: identifier(value.packageId, 'Journal package id'),
    phase: value.phase,
    receiptDigest: digest(value.receiptDigest, 'Journal receipt digest'),
    schema: JOURNAL_SCHEMA,
    stagedGenerationIds: idList(value.stagedGenerationIds, 'Staged generation ids'),
    stagedSettingsRecordIds: idList(value.stagedSettingsRecordIds, 'Staged settings ids'),
    targetRevision: value.targetRevision,
    transactionId: identifier(value.transactionId, 'Journal transaction id'),
    version: PACKAGE_STORE_RECORD_VERSION,
  });
}

/** Validate one durable, non-authorizing package command receipt. */
export function readPackageCommandReceipt(value) {
  exact(value, [
    'activated', 'baseRevision', 'candidateDigest', 'commandId', 'committedRevision',
    'confirmed', 'digest', 'migrationEvidence', 'operation', 'packageId', 'productionExecutionAuthorized',
    'publisherTrusted', 'resultState', 'schema', 'transactionId', 'version',
  ], 'Package command receipt');
  if (value.schema !== RECEIPT_SCHEMA || value.version !== PACKAGE_STORE_RECORD_VERSION
    || value.activated !== false || value.publisherTrusted !== false
    || value.productionExecutionAuthorized !== false || typeof value.confirmed !== 'boolean'
    || !Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0
    || value.committedRevision !== value.baseRevision + 1
    || !['installed-inactive', 'quarantined', 'removed'].includes(value.resultState)) {
    failPluginPackageStore('V7DK_INVENTORY_INVALID', 'Package command receipt is invalid.');
  }
  return Object.freeze({
    ...value,
    candidateDigest: digest(value.candidateDigest, 'Receipt candidate digest'),
    commandId: identifier(value.commandId, 'Receipt command id'),
    digest: digest(value.digest, 'Receipt digest'),
    migrationEvidence: migrationEvidenceList(value.migrationEvidence),
    operation: requirePackageStoreOperation(value.operation),
    packageId: identifier(value.packageId, 'Receipt package id'),
    transactionId: identifier(value.transactionId, 'Receipt transaction id'),
  });
}
