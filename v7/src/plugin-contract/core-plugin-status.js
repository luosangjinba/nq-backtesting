import { exactRecord } from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import { readBuiltInPluginPlan } from './built-in-plugin-plan.js';
import {
  definePluginParameterSchema,
  resolvePluginSettings,
} from './plugin-parameter-schema.js';
import {
  normalizeCorePluginProfile,
  readCorePluginProfileRecord,
} from './core-plugin-profile-value.js';

const HOST_STATES = new Set(['failed', 'idle', 'running', 'starting', 'stopped', 'stopping']);

function requireHostSnapshot(value) {
  exactRecord(
    value,
    ['moduleIds', 'status'],
    'CORE_PLUGIN_HOST_SNAPSHOT_INVALID',
    'Core Plugin host snapshot',
  );
  if (!HOST_STATES.has(value.status) || !Array.isArray(value.moduleIds)
    || value.moduleIds.some((id) => typeof id !== 'string')
    || new Set(value.moduleIds).size !== value.moduleIds.length) {
    failPluginContract('CORE_PLUGIN_HOST_SNAPSHOT_INVALID', 'Core Plugin host snapshot is invalid.');
  }
  return value;
}

function dependentMap(packages) {
  const result = new Map(packages.map(({ manifest }) => [manifest.packageId, []]));
  for (const entry of packages) {
    for (const dependencyId of entry.dependencyPackageIds) {
      result.get(dependencyId).push(entry.manifest.packageId);
    }
  }
  for (const values of result.values()) values.sort();
  return result;
}

function settingsView(manifest, profile) {
  return Object.freeze(manifest.contributions.flatMap((contribution) => {
    if (!contribution.parameters) return [];
    const settingsTabs = contribution.parameters.tabs.filter(({ source }) => source.kind === 'settings');
    if (settingsTabs.length === 0) return [];
    const schema = definePluginParameterSchema(contribution.parameters);
    const resolved = new Map(resolvePluginSettings(schema, {
      packageValues: profile.packageValues[manifest.packageId]?.[contribution.id] ?? {},
      profileValues: profile.profileValues[manifest.packageId]?.[contribution.id] ?? {},
    }).values.map((value) => [value.fieldId, value]));
    return [{
      contributionId: contribution.id,
      displayName: contribution.displayName,
      packageValues: profile.packageValues[manifest.packageId]?.[contribution.id]
        ?? Object.freeze({}),
      profileValues: profile.profileValues[manifest.packageId]?.[contribution.id]
        ?? Object.freeze({}),
      tabs: Object.freeze(settingsTabs.map((tab) => Object.freeze({
        fields: Object.freeze(tab.source.fields
          .filter(({ scopes }) => scopes.includes('package') || scopes.includes('profile'))
          .map((field) => Object.freeze({ ...field, ...resolved.get(field.id) }))),
        id: tab.id,
      })).filter(({ fields }) => fields.length > 0)),
    }];
  }).filter(({ tabs }) => tabs.length > 0));
}

function pendingChangeState(packageId, active, pending, dependencyLinked) {
  if (pending === null) return 'clean';
  const activeEnabled = active.enabledPackageIds.includes(packageId);
  const pendingEnabled = pending.enabledPackageIds.includes(packageId);
  const settingsChanged = JSON.stringify(active.packageValues[packageId] ?? {})
      !== JSON.stringify(pending.packageValues[packageId] ?? {})
    || JSON.stringify(active.profileValues[packageId] ?? {})
      !== JSON.stringify(pending.profileValues[packageId] ?? {});
  if (activeEnabled !== pendingEnabled) {
    if (dependencyLinked) return 'pending-dependency-cascade';
    return pendingEnabled ? 'pending-enable' : 'pending-disable';
  }
  return settingsChanged ? 'pending-settings' : 'clean';
}

function runtimeState({
  dependenciesActive,
  enabledByActive,
  enabledByGeneration,
  failure,
  generationSource,
  modulePresent,
}) {
  if (!enabledByActive) return 'disabled';
  if (failure) return 'failed';
  if (!enabledByGeneration && generationSource === 'kernel-safe') return 'recovery-disabled';
  if (!enabledByGeneration || !modulePresent || !dependenciesActive) return 'suspended';
  return 'active';
}

/** Project a package-neutral Core Plugin catalog with independent runtime and pending states. */
export function createCorePluginCatalogSnapshot({
  effectiveProfile,
  generationSource,
  moduleHostSnapshot,
  plan,
  record,
  recoveryCode = null,
} = {}) {
  const planned = readBuiltInPluginPlan(plan);
  const current = readCorePluginProfileRecord(record);
  const effective = normalizeCorePluginProfile(plan, effectiveProfile);
  const host = requireHostSnapshot(moduleHostSnapshot);
  const activeModules = new Set(host.moduleIds);
  const effectivePackages = new Set(effective.enabledPackageIds);
  for (const { manifest } of planned.packages) {
    if (!effectivePackages.has(manifest.packageId) && activeModules.has(manifest.module.id)) {
      failPluginContract(
        'CORE_PLUGIN_HOST_SNAPSHOT_MISMATCH',
        `Disabled generation unexpectedly contains ${manifest.module.id}.`,
      );
    }
  }
  const dependents = dependentMap(planned.packages);
  const toggled = planned.packages.filter(({ manifest }) => (
    current.pending !== null
      && current.active.enabledPackageIds.includes(manifest.packageId)
        !== current.pending.profile.enabledPackageIds.includes(manifest.packageId)
  )).map(({ manifest }) => manifest.packageId);
  const linkedToggle = new Set(toggled.length > 1 ? toggled : []);
  const runtimeByPackage = new Map();
  for (const entry of planned.packages) {
    const { manifest } = entry;
    const failure = current.lastFailure?.packageId === manifest.packageId
      ? current.lastFailure : null;
    const state = runtimeState({
      dependenciesActive: entry.dependencyPackageIds.every((id) => runtimeByPackage.get(id) === 'active'),
      enabledByActive: current.active.enabledPackageIds.includes(manifest.packageId),
      enabledByGeneration: effectivePackages.has(manifest.packageId),
      failure,
      generationSource,
      modulePresent: activeModules.has(manifest.module.id),
    });
    runtimeByPackage.set(manifest.packageId, state);
  }
  const packages = planned.packages.map((entry) => {
    const { manifest } = entry;
    const settings = settingsView(manifest, current.pending?.profile ?? current.active);
    return Object.freeze({
      capabilities: manifest.capabilities,
      changeState: pendingChangeState(
        manifest.packageId,
        current.active,
        current.pending?.profile ?? null,
        linkedToggle.has(manifest.packageId),
      ),
      contributionIds: Object.freeze(manifest.contributions.map(({ id }) => id)),
      contributions: manifest.contributions,
      dependencyPackageIds: entry.dependencyPackageIds,
      dependentPackageIds: Object.freeze(dependents.get(manifest.packageId)),
      description: manifest.display.description,
      diagnostic: current.lastFailure?.packageId === manifest.packageId ? current.lastFailure : null,
      distribution: manifest.distribution,
      hasSettings: settings.length > 0,
      enabled: current.active.enabledPackageIds.includes(manifest.packageId),
      moduleId: manifest.module.id,
      moduleVersion: manifest.module.version,
      name: manifest.display.name,
      packageId: manifest.packageId,
      packageVersion: manifest.packageVersion,
      pendingEnabled: (current.pending?.profile ?? current.active)
        .enabledPackageIds.includes(manifest.packageId),
      runtimeState: runtimeByPackage.get(manifest.packageId),
      settings,
    });
  });
  return Object.freeze({
    generationSource,
    hostStatus: host.status,
    lastFailure: current.lastFailure,
    packages: Object.freeze(packages),
    pending: current.pending === null ? null : Object.freeze({
      attemptId: current.pending.attemptId,
      baseRevision: current.pending.baseRevision,
      revision: current.revision,
    }),
    recoveryCode,
    revision: current.revision,
    restartRequired: current.pending !== null,
  });
}
