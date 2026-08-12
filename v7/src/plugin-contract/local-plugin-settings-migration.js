import { exactRecord, portableValue } from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import {
  definePluginParameterSchema,
  resolvePluginSettings,
  validatePluginSettings,
} from './plugin-parameter-schema.js';
import { readLocalPluginPackageManifest } from './local-plugin-package-manifest.js';

class LocalPluginSettingsStateValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function plainMap(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_SETTINGS_STATE_INVALID', `${label} must be a plain record.`);
  }
  return portableValue(value, label);
}

function settingsSchema(manifest) {
  return manifest.settings === null ? null : definePluginParameterSchema(manifest.settings);
}

function normalizedCurrentState(manifest, value) {
  exactRecord(
    value,
    ['packageValues', 'profileValues', 'quarantine', 'schemaVersion'],
    'PLUGIN_LOCAL_PACKAGE_SETTINGS_STATE_INVALID',
    'Local package settings state',
  );
  if (value.schemaVersion !== manifest.persistence.schemaVersion) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_SETTINGS_STATE_INVALID', 'Settings schema version is not current.');
  }
  const packageValues = plainMap(value.packageValues, 'packageValues');
  const profileValues = plainMap(value.profileValues, 'profileValues');
  const quarantine = plainMap(value.quarantine, 'quarantine');
  const schema = settingsSchema(manifest);
  if (schema === null) {
    if (Object.keys(packageValues).length > 0 || Object.keys(profileValues).length > 0) {
      failPluginContract('PLUGIN_LOCAL_PACKAGE_SETTINGS_STATE_INVALID', 'A package without settings cannot retain overrides.');
    }
  } else {
    validatePluginSettings(schema, { packageValues, profileValues });
  }
  return Object.freeze({ packageValues, profileValues, quarantine, schemaVersion: value.schemaVersion });
}

/** Create one current, host-validated local package settings state. */
export function createLocalPluginSettingsState(manifestCandidate, value = null) {
  const manifest = readLocalPluginPackageManifest(manifestCandidate);
  const candidate = value ?? {
    packageValues: {},
    profileValues: {},
    quarantine: {},
    schemaVersion: manifest.persistence.schemaVersion,
  };
  return new LocalPluginSettingsStateValue(normalizedCurrentState(manifest, candidate));
}

function pointerParts(pointer) {
  const [, scope, fieldId] = pointer.split('/');
  return { fieldId, scope };
}

function hasPointer(state, pointer) {
  const { fieldId, scope } = pointerParts(pointer);
  return Object.hasOwn(state[scope], fieldId);
}

function readPointer(state, pointer) {
  const { fieldId, scope } = pointerParts(pointer);
  return state[scope][fieldId];
}

function writePointer(state, pointer, value) {
  const { fieldId, scope } = pointerParts(pointer);
  state[scope][fieldId] = value;
}

function deletePointer(state, pointer) {
  const { fieldId, scope } = pointerParts(pointer);
  delete state[scope][fieldId];
}

function applyOperation(state, operation) {
  const sourcePresent = operation.fromPointer !== null && hasPointer(state, operation.fromPointer);
  const destinationPresent = hasPointer(state, operation.toPointer);
  if ((operation.precondition === 'source-present' && !sourcePresent)
    || (operation.precondition === 'destination-absent' && destinationPresent)
    || (operation.precondition === 'source-present-destination-absent'
      && (!sourcePresent || destinationPresent))) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_PRECONDITION', 'Migration input precondition failed.');
  }
  if (operation.kind === 'set-default-if-absent') {
    writePointer(state, operation.toPointer, operation.value);
    return;
  }
  const sourceValue = readPointer(state, operation.fromPointer);
  writePointer(state, operation.toPointer, sourceValue);
  if (operation.kind === 'rename' || operation.kind === 'quarantine-field') {
    deletePointer(state, operation.fromPointer);
  }
}

function mutableState(value) {
  return {
    packageValues: { ...plainMap(value.packageValues, 'packageValues') },
    profileValues: { ...plainMap(value.profileValues, 'profileValues') },
    quarantine: { ...plainMap(value.quarantine, 'quarantine') },
    schemaVersion: value.schemaVersion,
  };
}

/** Apply the exact declarative forward chain and verify every expected output digest. */
export async function migrateLocalPluginSettingsState(manifestCandidate, value, { digestValue } = {}) {
  const manifest = readLocalPluginPackageManifest(manifestCandidate);
  exactRecord(
    value,
    ['packageValues', 'profileValues', 'quarantine', 'schemaVersion'],
    'PLUGIN_LOCAL_PACKAGE_SETTINGS_STATE_INVALID',
    'Stored local package settings',
  );
  if (!Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1
    || typeof digestValue !== 'function') {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_SETTINGS_STATE_INVALID', 'Stored settings or digest port is invalid.');
  }
  if (value.schemaVersion > manifest.persistence.schemaVersion) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_DOWNGRADE_BLOCKED', 'Settings cannot be coerced into an older schema.');
  }
  const original = portableValue(mutableState(value), 'originalSettings');
  const state = mutableState(value);
  const applied = [];
  while (state.schemaVersion < manifest.persistence.schemaVersion) {
    const migration = manifest.persistence.migrations.find(
      ({ fromSchemaVersion }) => fromSchemaVersion === state.schemaVersion,
    );
    if (!migration) {
      failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_CHAIN_MISSING', 'A complete declarative migration chain is required.');
    }
    for (const operation of migration.operations) applyOperation(state, operation);
    state.schemaVersion = migration.toSchemaVersion;
    const output = Object.freeze({
      packageValues: Object.freeze({ ...state.packageValues }),
      profileValues: Object.freeze({ ...state.profileValues }),
      quarantine: Object.freeze({ ...state.quarantine }),
      schemaVersion: state.schemaVersion,
    });
    const expectedPlanDigest = await digestValue({
      fromSchemaVersion: migration.fromSchemaVersion,
      operations: migration.operations,
      toSchemaVersion: migration.toSchemaVersion,
    });
    if (expectedPlanDigest !== migration.expectedOutputDigest) {
      failPluginContract('PLUGIN_LOCAL_PACKAGE_MIGRATION_DIGEST_MISMATCH', 'Migration plan digest did not match the manifest.');
    }
    applied.push(Object.freeze({
      actualOutputDigest: await digestValue(output),
      expectedOutputDigest: migration.expectedOutputDigest,
      fromSchemaVersion: migration.fromSchemaVersion,
      toSchemaVersion: migration.toSchemaVersion,
    }));
  }
  const current = normalizedCurrentState(manifest, state);
  return Object.freeze({
    applied: Object.freeze(applied),
    current: new LocalPluginSettingsStateValue(current),
    original,
    reversibleByStoredOriginal: true,
  });
}

/** Read one branded local settings state and derive default/effective value sources. */
export function readLocalPluginSettingsState(candidate, manifestCandidate = null) {
  if (!(candidate instanceof LocalPluginSettingsStateValue)) {
    failPluginContract('PLUGIN_LOCAL_PACKAGE_SETTINGS_STATE_REQUIRED', 'A branded local package settings state is required.');
  }
  const value = candidate.read();
  if (manifestCandidate === null) return value;
  const manifest = readLocalPluginPackageManifest(manifestCandidate);
  const schema = settingsSchema(manifest);
  return Object.freeze({
    ...value,
    effective: schema === null ? Object.freeze([]) : resolvePluginSettings(schema, {
      packageValues: value.packageValues,
      profileValues: value.profileValues,
    }).values,
  });
}
