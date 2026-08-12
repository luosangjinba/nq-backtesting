import {
  createLocalPluginSettingsState,
  migrateLocalPluginSettingsState,
  prepareLocalPluginPackageChange,
  readLocalPluginPackageCandidatePlan,
  readLocalPluginPackageChangePreparation,
  readLocalPluginPackageManifest,
  readLocalPluginSettingsState,
} from '../plugin-contract/public.js';
import {
  createInstalledPackageSelection,
  readLocalPluginInventory,
  replaceLocalPluginInventory,
} from './inventory-value.js';
import {
  createStoredPackageGeneration,
  createStoredPackageSettings,
} from './package-records.js';
import {
  digestPackageStoreBytes,
  digestPackageStoreValue,
} from './portable-digest.js';
import { createPluginPackageStorePreparation } from './store-preparation.js';
import { failPluginPackageStore } from './store-error.js';

function requireRevision(inventory, expectedRevision) {
  const value = readLocalPluginInventory(inventory);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== value.revision
    || value.pending !== null) {
    failPluginPackageStore('V7DK_INVENTORY_STALE', 'Package inventory revision is stale or unsettled.');
  }
  return value;
}

function admissionValues(indexes, input) {
  const inventory = requireRevision(indexes.inventory, input.expectedRevision);
  const candidate = readLocalPluginPackageCandidatePlan(input.candidate);
  const manifest = readLocalPluginPackageManifest(input.manifest);
  if (!(input.archiveBytes instanceof Uint8Array) || candidate.packageId !== manifest.packageId
    || candidate.packageVersion !== manifest.packageVersion
    || candidate.source.kind !== 'local-archive'
    || candidate.persistence.schemaVersion !== manifest.persistence.schemaVersion) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Candidate, manifest, and archive identities disagree.');
  }
  if (Object.hasOwn(inventory.quarantined, candidate.packageId)) {
    failPluginPackageStore('V7DK_PACKAGE_QUARANTINED', 'Resolve the quarantined package before installing another generation.');
  }
  return { candidate, current: inventory.installed[candidate.packageId] ?? null, inventory, manifest };
}

async function verifyAdmissionDigests(input, values) {
  if (await digestPackageStoreBytes(input.archiveBytes, input.cryptoPort) !== values.candidate.source.digest
    || await digestPackageStoreValue(values.manifest, input.cryptoPort) !== values.candidate.manifestDigest) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Candidate bytes changed after inspection.');
  }
}

function retained(selection) {
  return Object.freeze({
    generationId: selection.generationId,
    settingsRecordId: selection.settingsRecordId,
  });
}

function changePreparation(candidateValue, current, revision) {
  let change;
  try {
    change = readLocalPluginPackageChangePreparation(prepareLocalPluginPackageChange(candidateValue, {
      current: current === null ? null : {
        candidateDigest: current.candidateDigest,
        generationId: current.generationId,
        packageId: current.packageId,
        packageVersion: current.packageVersion,
        settingsSchemaVersion: current.settingsSchemaVersion,
      },
      inventoryRevision: revision,
    }));
  } catch (cause) {
    const code = cause?.code === 'PLUGIN_LOCAL_PACKAGE_ALREADY_INSTALLED'
      ? 'V7DK_PACKAGE_ALREADY_INSTALLED' : 'V7DK_CANDIDATE_STALE';
    failPluginPackageStore(code, 'Local package change could not be prepared.', { cause });
  }
  if (change.migration.direction === 'blocked-downgrade') {
    failPluginPackageStore('V7DK_MIGRATION_BLOCKED', 'Downgrade would coerce newer package-owned settings.');
  }
  return change;
}

function settingsValue(record) {
  return {
    packageValues: record.packageValues,
    profileValues: record.profileValues,
    quarantine: record.quarantine,
    schemaVersion: record.schemaVersion,
  };
}

async function migratedSettings(indexes, manifestValue, current, cryptoPort) {
  try {
    if (current === null) {
      return Object.freeze({ evidence: Object.freeze([]), state: createLocalPluginSettingsState(manifestValue) });
    }
    const migrated = await migrateLocalPluginSettingsState(
      manifestValue,
      settingsValue(indexes.settings.get(current.settingsRecordId)),
      { digestValue: (value) => digestPackageStoreValue(value, cryptoPort) },
    );
    return Object.freeze({ evidence: migrated.applied, state: migrated.current });
  } catch (cause) {
    failPluginPackageStore('V7DK_MIGRATION_BLOCKED', 'Declarative package settings migration failed closed.', { cause });
  }
}

async function settingsRecord({ cryptoPort, generationId, packageId, state }) {
  const settings = readLocalPluginSettingsState(state);
  const unsigned = {
    generationId,
    packageId,
    packageValues: settings.packageValues,
    profileValues: settings.profileValues,
    quarantine: settings.quarantine,
    schema: 'v7.local-plugin-settings',
    schemaVersion: settings.schemaVersion,
    version: 1,
  };
  return createStoredPackageSettings({
    generationId,
    packageId,
    settings,
    settingsRecordId: await digestPackageStoreValue(unsigned, cryptoPort),
  });
}

/** Prepare an exact local archive admission and its reversible settings migration. */
export async function preparePackageAdmission(indexes, input = {}) {
  const values = admissionValues(indexes, input);
  await verifyAdmissionDigests(input, values);
  const change = changePreparation(input.candidate, values.current, values.inventory.revision);
  const migration = await migratedSettings(indexes, input.manifest, values.current, input.cryptoPort);
  const generation = createStoredPackageGeneration({
    archiveBytes: input.archiveBytes,
    candidate: input.candidate,
    manifest: input.manifest,
  });
  const settings = await settingsRecord({
    cryptoPort: input.cryptoPort,
    generationId: generation.generationId,
    packageId: values.candidate.packageId,
    state: migration.state,
  });
  const selection = createInstalledPackageSelection(
    generation,
    settings,
    values.current === null ? null : retained(values.current),
  );
  const cleanupPrior = values.current?.retainedPrior ?? null;
  const cleanupGenerationIds = cleanupPrior !== null
    && cleanupPrior.generationId !== generation.generationId
    ? [cleanupPrior.generationId] : [];
  const tombstoneSettingsRecordId = values.inventory.tombstones[
    values.candidate.packageId
  ]?.retainedSettingsRecordId ?? null;
  const cleanupSettingsRecordIds = cleanupPrior !== null
    && cleanupPrior.settingsRecordId !== settings.settingsRecordId
    && cleanupPrior.settingsRecordId !== tombstoneSettingsRecordId
    ? [cleanupPrior.settingsRecordId] : [];
  const quarantined = { ...values.inventory.quarantined };
  delete quarantined[values.candidate.packageId];
  return createPluginPackageStorePreparation({
    cleanupGenerationIds: Object.freeze(cleanupGenerationIds),
    cleanupSettingsRecordIds: Object.freeze(cleanupSettingsRecordIds),
    committedInventory: replaceLocalPluginInventory(indexes.inventory, {
      installed: { ...values.inventory.installed, [values.candidate.packageId]: selection },
      pending: null,
      quarantined,
      revision: values.inventory.revision + 1,
    }),
    confirmed: change.confirmationId !== null,
    generationPuts: Object.freeze(indexes.generations.has(generation.generationId)
      ? [] : [generation]),
    migrationEvidence: migration.evidence,
    publicPlan: Object.freeze({
      ...change,
      display: values.manifest.display,
      license: values.manifest.license,
      migration: Object.freeze({ ...change.migration, applied: migration.evidence }),
      publisher: Object.freeze({ ...values.manifest.publisher, verification: 'self-asserted' }),
      productionExecutionAuthorized: false,
    }),
    resultState: 'installed-inactive',
    settingsPuts: Object.freeze(indexes.settings.has(settings.settingsRecordId)
      ? [] : [settings]),
  });
}
