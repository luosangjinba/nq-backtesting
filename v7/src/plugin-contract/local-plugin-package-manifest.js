import {
  boundedText,
  contractId,
  exactRecord,
  portableValue,
} from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import { normalizePluginParameterSchemaWire } from './plugin-parameter-schema.js';
import { pluginVersion, pluginVersionRange } from './semantic-version.js';

export const LOCAL_PLUGIN_CONTRACT_PROFILE = 'local-declarative-package-v1';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const NOTICE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[A-Za-z0-9._/-]{1,240}$/u;
const POINTER = /^\/(?:packageValues|profileValues|quarantine)\/[a-z][A-Za-z0-9.-]{0,63}$/u;
const SPDX = /^[A-Za-z0-9.+-]+(?:\s+(?:AND|OR|WITH)\s+[A-Za-z0-9.+-]+)*$/u;
const MIGRATION_KINDS = new Set([
  'copy-if-absent', 'quarantine-field', 'rename', 'set-default-if-absent',
]);
const PRECONDITIONS = new Set([
  'destination-absent', 'source-present', 'source-present-destination-absent',
]);
const RESERVED_NOTICE_ROOTS = Object.freeze([
  'content-index.json', 'payload', 'provenance', 'receipts', 'v7-package.json',
  'v7dk.bundle.json', 'v7dk.index.json',
]);

class LocalPluginPackageManifestValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function digest(value, label) {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', `${label} is invalid.`);
  }
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', `${label} is invalid.`);
  }
  return value;
}

function localIdentity(value, label) {
  const id = contractId(value, label);
  if (['built-in.', 'core.', 'first-party.'].some((prefix) => id.startsWith(prefix))) {
    failPluginContract(
      'PLUGIN_LOCAL_PACKAGE_IDENTITY_FORGED',
      `${label} cannot claim a built-in, Core, or first-party identity.`,
    );
  }
  return id;
}

function normalizedPointer(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !POINTER.test(value) || value.includes('*')) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', `${label} is invalid.`);
  }
  return value;
}

function normalizeMigrationOperation(value) {
  exactRecord(
    value,
    ['fromPointer', 'kind', 'precondition', 'toPointer', 'value'],
    'PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID',
    'Local package migration operation',
  );
  if (!MIGRATION_KINDS.has(value.kind) || !PRECONDITIONS.has(value.precondition)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Migration operation kind or precondition is invalid.');
  }
  const fromPointer = normalizedPointer(value.fromPointer, 'Migration source pointer', { nullable: true });
  const toPointer = normalizedPointer(value.toPointer, 'Migration destination pointer');
  const normalizedValue = value.value === null ? null : portableValue(value.value, 'migration.value');
  const copies = value.kind === 'rename' || value.kind === 'copy-if-absent';
  const settingPointer = (pointer) => pointer?.startsWith('/packageValues/')
    || pointer?.startsWith('/profileValues/');
  if (copies && (fromPointer === null || normalizedValue !== null
    || !settingPointer(fromPointer) || !settingPointer(toPointer)
    || value.precondition !== 'source-present-destination-absent')) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Copy and rename migrations require exact source/destination preconditions.');
  }
  if (value.kind === 'set-default-if-absent' && (fromPointer !== null
    || !settingPointer(toPointer) || normalizedValue === null
    || value.precondition !== 'destination-absent')) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Default migrations require a value and destination-absent precondition.');
  }
  if (value.kind === 'quarantine-field' && (fromPointer === null
    || !settingPointer(fromPointer) || !toPointer.startsWith('/quarantine/') || normalizedValue !== null
    || value.precondition !== 'source-present')) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Quarantine migrations must move one present field into quarantine.');
  }
  if (fromPointer === toPointer) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Migration source and destination must differ.');
  }
  return Object.freeze({
    fromPointer,
    kind: value.kind,
    precondition: value.precondition,
    toPointer,
    value: normalizedValue,
  });
}

function hasPointerCycle(operations) {
  const edges = new Map(operations
    .filter(({ fromPointer }) => fromPointer !== null)
    .map(({ fromPointer, toPointer }) => [fromPointer, toPointer]));
  for (const start of edges.keys()) {
    const visited = new Set();
    let pointer = start;
    while (edges.has(pointer)) {
      if (visited.has(pointer)) return true;
      visited.add(pointer);
      pointer = edges.get(pointer);
    }
  }
  return false;
}

function currentSettingField(settings, pointer) {
  if (!pointer?.startsWith('/packageValues/') && !pointer?.startsWith('/profileValues/')) return null;
  const scope = pointer.startsWith('/packageValues/') ? 'package' : 'profile';
  const id = pointer.slice(pointer.lastIndexOf('/') + 1);
  return settings?.tabs.flatMap(({ source }) => source.fields)
    .find((field) => field.id === id && field.scopes.includes(scope)) ?? null;
}

function requireCurrentMigrationDestinations(operations, settings) {
  for (const operation of operations) {
    if (operation.toPointer.startsWith('/quarantine/')) continue;
    const field = currentSettingField(settings, operation.toPointer);
    if (!field || (operation.kind === 'set-default-if-absent'
      && JSON.stringify(operation.value) !== JSON.stringify(field.defaultValue))) {
      failPluginContract(
        'PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID',
        'Migration destinations and default values must match the current settings schema.',
      );
    }
  }
}

function normalizeMigrations(value, schemaVersion, settings) {
  if (!Array.isArray(value) || value.length > 32) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Local package migrations are invalid.');
  }
  const migrations = value.map((migration) => {
    exactRecord(
      migration,
      ['expectedOutputDigest', 'fromSchemaVersion', 'operations', 'toSchemaVersion'],
      'PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID',
      'Local package migration',
    );
    const fromSchemaVersion = positiveInteger(migration.fromSchemaVersion, 'Migration source schema version');
    const toSchemaVersion = positiveInteger(migration.toSchemaVersion, 'Migration destination schema version');
    if (fromSchemaVersion >= toSchemaVersion || toSchemaVersion > schemaVersion
      || !Array.isArray(migration.operations) || migration.operations.length < 1
      || migration.operations.length > 64) {
      failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Migration version transition or operation count is invalid.');
    }
    const operations = Object.freeze(migration.operations.map(normalizeMigrationOperation));
    requireCurrentMigrationDestinations(operations, settings);
    const destinations = operations.map(({ toPointer }) => toPointer);
    const sources = operations.flatMap(({ fromPointer }) => fromPointer === null ? [] : [fromPointer]);
    if (new Set(destinations).size !== destinations.length
      || new Set(sources).size !== sources.length || hasPointerCycle(operations)) {
      failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Migration pointers must be unambiguous and acyclic.');
    }
    return Object.freeze({
      expectedOutputDigest: digest(migration.expectedOutputDigest, 'Migration expected output digest'),
      fromSchemaVersion,
      operations,
      toSchemaVersion,
    });
  }).sort((left, right) => left.fromSchemaVersion - right.fromSchemaVersion);
  if (new Set(migrations.map(({ fromSchemaVersion }) => fromSchemaVersion)).size !== migrations.length
    || migrations.some((migration, index) => (
      index > 0 && migrations[index - 1].toSchemaVersion !== migration.fromSchemaVersion
    )) || (migrations.length > 0 && migrations.at(-1).toSchemaVersion !== schemaVersion)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_INVALID', 'Migration transitions must form one unambiguous chain.');
  }
  return Object.freeze(migrations);
}

function normalizeSettings(value) {
  if (value === null) return null;
  const settings = normalizePluginParameterSchemaWire(value);
  const invalid = settings.tabs.some(({ source }) => (
    source.kind !== 'settings'
    || source.fields.some(({ scopes }) => scopes.some((scope) => !['package', 'profile'].includes(scope)))
  ));
  if (invalid) {
    failPluginContract(
      'PLUGIN_LOCAL_PACKAGE_SETTINGS_INVALID',
      'Local package settings must be host-rendered and scoped only to package/profile values.',
    );
  }
  return settings;
}

function requireEmpty(value, code, label) {
  if (!Array.isArray(value) || value.length !== 0) {
    failPluginContract(code, `${label} must be empty for the local declarative profile.`);
  }
  return Object.freeze([]);
}

function validateManifestShape(value) {
  exactRecord(
    value,
    [
      'capabilities', 'conformance', 'contractProfile', 'contributions', 'display',
      'execution', 'hostApiRange', 'license', 'manifestVersion', 'packageId',
      'packageVersion', 'permissions', 'persistence', 'publisher', 'settings',
    ],
    'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID',
    'Local plugin package manifest',
  );
  if (value.manifestVersion !== 2 || value.contractProfile !== LOCAL_PLUGIN_CONTRACT_PROFILE) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_PROFILE_UNSUPPORTED', 'Manifest V2 requires the local declarative package profile.');
  }
  exactRecord(value.display, ['description', 'name'], 'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package display');
  exactRecord(value.publisher, ['id', 'name'], 'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package publisher');
  exactRecord(value.license, ['expression', 'noticePath'], 'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package license');
  exactRecord(value.capabilities, ['extends', 'provides', 'requires'], 'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package capabilities');
  exactRecord(value.execution, ['entrypoint', 'tier'], 'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package execution');
  exactRecord(value.persistence, ['migrations', 'retention', 'schemaVersion'], 'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package persistence');
  exactRecord(value.conformance, ['requiredReceiptDigests', 'sdkVersion', 'toolchainDigest'], 'PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package conformance');
}

function normalizeCapabilities(value) {
  return Object.freeze({
    extends: requireEmpty(value.capabilities.extends, 'PLUGIN_LOCAL_PACKAGE_CONTRIBUTION_UNAVAILABLE', 'Extended capabilities'),
    provides: requireEmpty(value.capabilities.provides, 'PLUGIN_LOCAL_PACKAGE_CONTRIBUTION_UNAVAILABLE', 'Provided capabilities'),
    requires: requireEmpty(value.capabilities.requires, 'PLUGIN_LOCAL_PACKAGE_CONTRIBUTION_UNAVAILABLE', 'Required capabilities'),
  });
}

function normalizeExecution(value) {
  if (value.execution.tier !== 'none' || value.execution.entrypoint !== null) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_EXECUTION_UNAVAILABLE', 'Local packages cannot declare an execution tier or entrypoint.');
  }
  return Object.freeze({ entrypoint: null, tier: 'none' });
}

function normalizePersistence(value, settings) {
  if (value.persistence.retention !== 'preserve-on-uninstall') {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Local package retention must preserve data on uninstall.');
  }
  const schemaVersion = positiveInteger(value.persistence.schemaVersion, 'Persistence schema version');
  return Object.freeze({
    migrations: normalizeMigrations(value.persistence.migrations, schemaVersion, settings),
    retention: 'preserve-on-uninstall',
    schemaVersion,
  });
}

function normalizeLicense(value) {
  const noticePath = value.license.noticePath;
  if (typeof value.license.expression !== 'string' || value.license.expression.length > 160
    || !SPDX.test(value.license.expression)
    || typeof noticePath !== 'string' || !NOTICE_PATH.test(noticePath)
    || noticePath.includes('\\') || noticePath.normalize('NFC') !== noticePath
    || noticePath.endsWith('/') || noticePath.split('/').some((part) => part === '.')
    || RESERVED_NOTICE_ROOTS.some((root) => noticePath === root || noticePath.startsWith(`${root}/`))) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Package license expression or notice path is invalid.');
  }
  return Object.freeze({ expression: value.license.expression, noticePath });
}

function normalizeConformance(value) {
  if (!Array.isArray(value.conformance.requiredReceiptDigests)
    || value.conformance.requiredReceiptDigests.length > 3) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Required receipt digests are invalid.');
  }
  const receiptDigests = value.conformance.requiredReceiptDigests
    .map((entry) => digest(entry, 'Required receipt digest')).sort();
  if (new Set(receiptDigests).size !== receiptDigests.length
    || ![0, 3].includes(receiptDigests.length)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MANIFEST_INVALID', 'Required receipt digests must be empty for authoring or contain exactly three unique receipts.');
  }
  return Object.freeze({
    requiredReceiptDigests: Object.freeze(receiptDigests),
    sdkVersion: pluginVersion(value.conformance.sdkVersion, 'Conformance SDK version'),
    toolchainDigest: digest(value.conformance.toolchainDigest, 'Conformance toolchain digest'),
  });
}

function normalizeManifest(value) {
  validateManifestShape(value);
  const capabilities = normalizeCapabilities(value);
  const execution = normalizeExecution(value);
  const settings = normalizeSettings(value.settings);
  const persistence = normalizePersistence(value, settings);
  const license = normalizeLicense(value);
  const conformance = normalizeConformance(value);
  return Object.freeze({
    capabilities,
    conformance,
    contractProfile: LOCAL_PLUGIN_CONTRACT_PROFILE,
    contributions: requireEmpty(value.contributions, 'PLUGIN_LOCAL_PACKAGE_CONTRIBUTION_UNAVAILABLE', 'Contributions'),
    display: Object.freeze({
      description: boundedText(value.display.description, 'Package description', { max: 320 }),
      name: boundedText(value.display.name, 'Package name', { max: 96 }),
    }),
    execution,
    hostApiRange: pluginVersionRange(value.hostApiRange, 'Host API range'),
    license,
    manifestVersion: 2,
    packageId: localIdentity(value.packageId, 'Package id'),
    packageVersion: pluginVersion(value.packageVersion, 'Package version'),
    permissions: requireEmpty(value.permissions, 'PLUGIN_LOCAL_PACKAGE_PERMISSION_UNAUTHORIZED', 'Permissions'),
    persistence,
    publisher: Object.freeze({
      id: localIdentity(value.publisher.id, 'Publisher id'),
      name: boundedText(value.publisher.name, 'Publisher name', { max: 96 }),
    }),
    settings,
  });
}

/** Define portable Manifest V2 metadata for one inactive local declarative package. */
export function defineLocalPluginPackageManifest(value = {}) {
  return new LocalPluginPackageManifestValue(normalizeManifest(value));
}

/** Read one branded local Manifest V2 without importing or evaluating package payload. */
export function readLocalPluginPackageManifest(candidate) {
  if (!(candidate instanceof LocalPluginPackageManifestValue)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MANIFEST_REQUIRED', 'A branded local package manifest is required.');
  }
  return candidate.read();
}

/** Bind exact build, test, and preview receipts into an otherwise validated authoring manifest. */
export function finalizeLocalPluginPackageManifest(candidate, requiredReceiptDigests) {
  const manifest = readLocalPluginPackageManifest(candidate);
  if (!Array.isArray(requiredReceiptDigests) || requiredReceiptDigests.length !== 3) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_RECEIPT_REQUIRED', 'Exactly three current Developer Kit receipt digests are required.');
  }
  return defineLocalPluginPackageManifest({
    ...manifest,
    conformance: { ...manifest.conformance, requiredReceiptDigests },
  });
}
