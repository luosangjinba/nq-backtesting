import {
  createInstalledPackageSelection,
  createPackageTombstone,
  createQuarantinedPackageSelection,
  readLocalPluginInventory,
  replaceLocalPluginInventory,
} from './inventory-value.js';
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

function preparation(value) {
  return createPluginPackageStorePreparation({
    cleanupGenerationIds: Object.freeze(value.cleanupGenerationIds ?? []),
    cleanupSettingsRecordIds: Object.freeze(value.cleanupSettingsRecordIds ?? []),
    committedInventory: value.committedInventory,
    confirmed: value.publicPlan.confirmationId !== null,
    generationPuts: Object.freeze(value.generationPuts ?? []),
    migrationEvidence: Object.freeze([]),
    publicPlan: Object.freeze(value.publicPlan),
    resultState: value.resultState,
    settingsPuts: Object.freeze(value.settingsPuts ?? []),
  });
}

function retained(selection) {
  return Object.freeze({
    generationId: selection.generationId,
    settingsRecordId: selection.settingsRecordId,
  });
}

function lifecyclePlan(inventory, selection, operation, reviews, extra = {}) {
  return Object.freeze({
    baseRevision: inventory.revision,
    candidateDigest: selection.candidateDigest,
    confirmationId: [
      'local-package', `r${inventory.revision}`, operation, selection.packageId,
      selection.generationId,
    ].join(':'),
    operation,
    packageId: selection.packageId,
    packageVersion: selection.packageVersion,
    productionExecutionAuthorized: false,
    requiredReviews: Object.freeze(reviews),
    ...extra,
  });
}

/** Prepare a retained-prior rollback without mutating either immutable generation. */
export function preparePackageRollback(indexes, {
  expectedGenerationId,
  expectedRevision,
  packageId,
} = {}) {
  const inventory = requireRevision(indexes.inventory, expectedRevision);
  const current = requireInstalled(indexes, packageId, expectedGenerationId);
  if (current.retainedPrior === null) {
    failPluginPackageStore('V7DK_ROLLBACK_UNAVAILABLE', 'No complete prior generation is retained.');
  }
  const priorGeneration = indexes.generations.get(current.retainedPrior.generationId);
  const priorSettings = indexes.settings.get(current.retainedPrior.settingsRecordId);
  if (!priorGeneration || !priorSettings) {
    failPluginPackageStore('V7DK_ROLLBACK_UNAVAILABLE', 'Retained prior generation is incomplete.');
  }
  const selection = createInstalledPackageSelection(priorGeneration, priorSettings, retained(current));
  const committedInventory = replaceLocalPluginInventory(indexes.inventory, {
    installed: { ...inventory.installed, [packageId]: selection },
    pending: null,
    revision: inventory.revision + 1,
  });
  return preparation({
    committedInventory,
    publicPlan: lifecyclePlan(inventory, current, 'rollback', [
      'restore-retained-generation', 'package-remains-inactive',
    ], { targetGenerationId: selection.generationId }),
    resultState: 'installed-inactive',
  });
}

/** Prepare exclusion of one installed generation while retaining bytes and diagnostics. */
export function preparePackageQuarantine(indexes, {
  diagnosticCode,
  expectedGenerationId,
  expectedRevision,
  packageId,
} = {}) {
  const inventory = requireRevision(indexes.inventory, expectedRevision);
  const current = requireInstalled(indexes, packageId, expectedGenerationId);
  const installed = { ...inventory.installed };
  delete installed[packageId];
  const quarantined = {
    ...inventory.quarantined,
    [packageId]: createQuarantinedPackageSelection(current, diagnosticCode),
  };
  const committedInventory = replaceLocalPluginInventory(indexes.inventory, {
    installed, pending: null, quarantined, revision: inventory.revision + 1,
  });
  const prior = current.retainedPrior;
  const tombstoneSettingsRecordId = inventory.tombstones[
    current.packageId
  ]?.retainedSettingsRecordId ?? null;
  return preparation({
    cleanupGenerationIds: prior ? [prior.generationId] : [],
    cleanupSettingsRecordIds: prior !== null
      && prior.settingsRecordId !== tombstoneSettingsRecordId
      ? [prior.settingsRecordId] : [],
    committedInventory,
    publicPlan: lifecyclePlan(inventory, current, 'quarantine', [
      'exclude-package-generation', 'retain-bytes-and-diagnostics',
    ], { diagnosticCode }),
    resultState: 'quarantined',
  });
}

/** Prepare uninstall while preserving a tombstone and exact package-owned settings. */
export function preparePackageUninstall(indexes, {
  expectedGenerationId,
  expectedRevision,
  packageId,
} = {}) {
  const inventory = requireRevision(indexes.inventory, expectedRevision);
  const installedSelection = inventory.installed[packageId] ?? null;
  const quarantinedSelection = inventory.quarantined[packageId] ?? null;
  const current = installedSelection ?? quarantinedSelection;
  if (!current) failPluginPackageStore('V7DK_PACKAGE_NOT_INSTALLED', 'Local package is absent.');
  if (current.generationId !== expectedGenerationId) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Package generation changed before uninstall.');
  }
  const storedSettings = indexes.settings.get(current.settingsRecordId);
  const selection = installedSelection ?? Object.freeze({
    ...current,
    settingsSchemaVersion: storedSettings.schemaVersion,
  });
  const installed = { ...inventory.installed };
  const quarantined = { ...inventory.quarantined };
  delete installed[packageId];
  delete quarantined[packageId];
  const tombstone = createPackageTombstone(selection, inventory.revision + 1);
  const committedInventory = replaceLocalPluginInventory(indexes.inventory, {
    installed,
    pending: null,
    quarantined,
    revision: inventory.revision + 1,
    tombstones: { ...inventory.tombstones, [packageId]: tombstone },
  });
  const prior = installedSelection?.retainedPrior ?? null;
  const replacedTombstoneSettingsId = inventory.tombstones[packageId]?.retainedSettingsRecordId ?? null;
  const cleanupSettingsRecordIds = new Set(prior ? [prior.settingsRecordId] : []);
  if (replacedTombstoneSettingsId !== null
    && replacedTombstoneSettingsId !== selection.settingsRecordId) {
    cleanupSettingsRecordIds.add(replacedTombstoneSettingsId);
  }
  return preparation({
    cleanupGenerationIds: [current.generationId, ...(prior ? [prior.generationId] : [])],
    cleanupSettingsRecordIds: [...cleanupSettingsRecordIds],
    committedInventory,
    publicPlan: lifecyclePlan(inventory, selection, 'uninstall', [
      'preserve-package-data-on-uninstall', 'retain-host-owned-history',
    ], { retainedSettingsRecordId: selection.settingsRecordId }),
    resultState: 'removed',
  });
}
