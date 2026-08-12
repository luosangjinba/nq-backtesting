import {
  createLocalPluginSettingsState,
  defineLocalPluginPackageManifest,
  readLocalPluginSettingsState,
} from '../plugin-contract/public.js';
import {
  readLocalPluginInventory,
  replaceLocalPluginInventory,
} from './inventory-value.js';
import { createStoredPackageSettings } from './package-records.js';
import { digestPackageStoreValue } from './portable-digest.js';
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

function requireInstalled(indexes, packageId, expectedGenerationId) {
  const inventory = readLocalPluginInventory(indexes.inventory);
  const selection = inventory.installed[packageId];
  if (!selection) failPluginPackageStore('V7DK_PACKAGE_NOT_INSTALLED', 'Local package is not installed.');
  if (selection.generationId !== expectedGenerationId) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Installed generation changed before the command.');
  }
  return selection;
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

async function settingsPreparation(indexes, selection, state, {
  cryptoPort,
  inventory,
  operation,
  reset = null,
}) {
  const settings = await settingsRecord({
    cryptoPort,
    generationId: selection.generationId,
    packageId: selection.packageId,
    state,
  });
  if (settings.settingsRecordId === selection.settingsRecordId) {
    failPluginPackageStore('V7DK_SETTINGS_INVALID', 'Settings command does not change an override.');
  }
  const installed = {
    ...inventory.installed,
    [selection.packageId]: Object.freeze({ ...selection, settingsRecordId: settings.settingsRecordId }),
  };
  const committedInventory = replaceLocalPluginInventory(indexes.inventory, {
    installed, pending: null, revision: inventory.revision + 1,
  });
  const retainedIds = new Set([
    selection.retainedPrior?.settingsRecordId,
    inventory.tombstones[selection.packageId]?.retainedSettingsRecordId,
  ].filter(Boolean));
  return createPluginPackageStorePreparation({
    cleanupGenerationIds: Object.freeze([]),
    cleanupSettingsRecordIds: Object.freeze(retainedIds.has(selection.settingsRecordId)
      ? [] : [selection.settingsRecordId]),
    committedInventory,
    confirmed: false,
    generationPuts: Object.freeze([]),
    migrationEvidence: Object.freeze([]),
    publicPlan: Object.freeze({
      baseRevision: inventory.revision,
      candidateDigest: selection.candidateDigest,
      confirmationId: null,
      operation,
      packageId: selection.packageId,
      packageVersion: selection.packageVersion,
      productionExecutionAuthorized: false,
      reset,
      requiredReviews: Object.freeze([]),
      stateAfterCommit: 'installed-inactive',
    }),
    resultState: 'installed-inactive',
    settingsPuts: Object.freeze(indexes.settings.has(settings.settingsRecordId)
      ? [] : [settings]),
  });
}

/** Prepare complete host-rendered package/profile override Apply through inventory CAS. */
export async function preparePackageSettingsApply(indexes, {
  cryptoPort,
  expectedGenerationId,
  expectedRevision,
  packageId,
  packageValues,
  profileValues,
} = {}) {
  const inventory = requireRevision(indexes.inventory, expectedRevision);
  const selection = requireInstalled(indexes, packageId, expectedGenerationId);
  const generation = indexes.generations.get(selection.generationId);
  const manifest = defineLocalPluginPackageManifest(generation.manifest);
  const current = indexes.settings.get(selection.settingsRecordId);
  let state;
  try {
    state = createLocalPluginSettingsState(manifest, {
      packageValues,
      profileValues,
      quarantine: current.quarantine,
      schemaVersion: current.schemaVersion,
    });
  } catch (cause) {
    failPluginPackageStore('V7DK_SETTINGS_INVALID', 'Complete package settings failed host validation.', { cause });
  }
  return settingsPreparation(indexes, selection, state, {
    cryptoPort, inventory, operation: 'settings-apply',
  });
}

/** Prepare removal of one selected override so its declared default becomes effective. */
export async function preparePackageSettingsReset(indexes, {
  cryptoPort,
  expectedGenerationId,
  expectedRevision,
  fieldId,
  packageId,
  scope,
} = {}) {
  const inventory = requireRevision(indexes.inventory, expectedRevision);
  const selection = requireInstalled(indexes, packageId, expectedGenerationId);
  if (!['package', 'profile'].includes(scope) || typeof fieldId !== 'string') {
    failPluginPackageStore('V7DK_SETTINGS_INVALID', 'Settings reset target is invalid.');
  }
  const generation = indexes.generations.get(selection.generationId);
  const manifest = defineLocalPluginPackageManifest(generation.manifest);
  const current = indexes.settings.get(selection.settingsRecordId);
  const packageValues = { ...current.packageValues };
  const profileValues = { ...current.profileValues };
  const target = scope === 'package' ? packageValues : profileValues;
  if (!Object.hasOwn(target, fieldId)) {
    failPluginPackageStore('V7DK_SETTINGS_INVALID', 'Selected setting has no override to reset.');
  }
  delete target[fieldId];
  const state = createLocalPluginSettingsState(manifest, {
    packageValues,
    profileValues,
    quarantine: current.quarantine,
    schemaVersion: current.schemaVersion,
  });
  return settingsPreparation(indexes, selection, state, {
    cryptoPort,
    inventory,
    operation: 'settings-reset',
    reset: Object.freeze({ fieldId, scope }),
  });
}
