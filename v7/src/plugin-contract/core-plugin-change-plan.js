import { exactRecord } from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import { readBuiltInPluginPlan } from './built-in-plugin-plan.js';
import {
  corePluginProfilesEqual,
  createDefaultCorePluginProfile,
  normalizeCorePluginProfile,
  readCorePluginProfileRecord,
} from './core-plugin-profile-value.js';
import { planCorePluginApplicationImpact } from './core-plugin-application-impact.js';

const INTENT_KINDS = new Set(['replace-settings', 'reset-profile', 'toggle-package']);

class CorePluginChangePreparationValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function cloneProfile(profile) {
  return JSON.parse(JSON.stringify(profile));
}

function packageMap(plan) {
  return new Map(readBuiltInPluginPlan(plan).packages.map((entry) => [
    entry.manifest.packageId,
    entry,
  ]));
}

function requireIntent(intent, revision, packages) {
  if (!intent || typeof intent !== 'object' || !INTENT_KINDS.has(intent.kind)
    || intent.expectedRevision !== revision) {
    failPluginContract('CORE_PLUGIN_PREPARATION_STALE', 'Core Plugin intent revision is stale or invalid.');
  }
  if (intent.kind === 'toggle-package') {
    exactRecord(
      intent,
      ['enabled', 'expectedRevision', 'kind', 'packageId'],
      'CORE_PLUGIN_INTENT_INVALID',
      'Core Plugin toggle intent',
    );
    if (typeof intent.enabled !== 'boolean' || !packages.has(intent.packageId)) {
      failPluginContract('CORE_PLUGIN_INTENT_INVALID', 'Core Plugin toggle intent is invalid.');
    }
  } else if (intent.kind === 'replace-settings') {
    exactRecord(
      intent,
      ['contributionId', 'expectedRevision', 'kind', 'packageId', 'scope', 'values'],
      'CORE_PLUGIN_INTENT_INVALID',
      'Core Plugin settings intent',
    );
    if (!packages.has(intent.packageId) || !['package', 'profile'].includes(intent.scope)) {
      failPluginContract('CORE_PLUGIN_INTENT_INVALID', 'Core Plugin settings intent is invalid.');
    }
  } else {
    exactRecord(
      intent,
      ['expectedRevision', 'kind'],
      'CORE_PLUGIN_INTENT_INVALID',
      'Core Plugin reset intent',
    );
  }
  return intent;
}

function dependentMap(packages) {
  const result = new Map([...packages.keys()].map((id) => [id, new Set()]));
  for (const [packageId, entry] of packages) {
    for (const dependencyId of entry.dependencyPackageIds) result.get(dependencyId).add(packageId);
  }
  return result;
}

function addDependencies(packageId, enabled, packages, cascaded) {
  for (const dependencyId of packages.get(packageId).dependencyPackageIds) {
    if (!enabled.has(dependencyId)) {
      enabled.add(dependencyId);
      cascaded.add(dependencyId);
    }
    addDependencies(dependencyId, enabled, packages, cascaded);
  }
}

function removeDependents(packageId, enabled, dependents, cascaded) {
  for (const dependentId of dependents.get(packageId)) {
    if (!enabled.has(dependentId)) continue;
    enabled.delete(dependentId);
    cascaded.add(dependentId);
    removeDependents(dependentId, enabled, dependents, cascaded);
  }
}

function toggleCandidate(profile, intent, packages) {
  const candidate = cloneProfile(profile);
  const enabled = new Set(candidate.enabledPackageIds);
  const cascaded = new Set();
  if (intent.enabled) {
    enabled.add(intent.packageId);
    addDependencies(intent.packageId, enabled, packages, cascaded);
  } else {
    enabled.delete(intent.packageId);
    removeDependents(intent.packageId, enabled, dependentMap(packages), cascaded);
  }
  candidate.enabledPackageIds = [...enabled].sort();
  return Object.freeze({ candidate, cascaded: Object.freeze([...cascaded].sort()) });
}

function settingsCandidate(profile, intent) {
  const candidate = cloneProfile(profile);
  const field = `${intent.scope}Values`;
  const packageValues = candidate[field][intent.packageId] ?? {};
  const nextPackage = { ...packageValues };
  if (Object.keys(intent.values).length === 0) delete nextPackage[intent.contributionId];
  else nextPackage[intent.contributionId] = intent.values;
  if (Object.keys(nextPackage).length === 0) delete candidate[field][intent.packageId];
  else candidate[field][intent.packageId] = nextPackage;
  return candidate;
}

function changedPackages(active, candidate, packageIds) {
  return packageIds.filter((packageId) => {
    const activeEnabled = active.enabledPackageIds.includes(packageId);
    const candidateEnabled = candidate.enabledPackageIds.includes(packageId);
    return activeEnabled !== candidateEnabled
      || JSON.stringify(active.packageValues[packageId] ?? {})
        !== JSON.stringify(candidate.packageValues[packageId] ?? {})
      || JSON.stringify(active.profileValues[packageId] ?? {})
        !== JSON.stringify(candidate.profileValues[packageId] ?? {});
  });
}

/** Prepare a pure, branded Core profile change with complete dependency/application impact. */
export function prepareCorePluginProfileChange({
  intent,
  moduleDescriptors,
  plan,
  record,
} = {}) {
  const current = readCorePluginProfileRecord(record);
  const packages = packageMap(plan);
  requireIntent(intent, current.revision, packages);
  const baseProfile = current.pending?.profile ?? current.active;
  let rawCandidate;
  let cascaded = Object.freeze([]);
  if (intent.kind === 'toggle-package') {
    ({ candidate: rawCandidate, cascaded } = toggleCandidate(baseProfile, intent, packages));
  } else if (intent.kind === 'replace-settings') {
    rawCandidate = settingsCandidate(baseProfile, intent);
  } else {
    rawCandidate = createDefaultCorePluginProfile(plan);
  }
  const candidate = normalizeCorePluginProfile(plan, rawCandidate);
  const activeImpact = planCorePluginApplicationImpact(plan, current.active, moduleDescriptors);
  const candidateImpact = planCorePluginApplicationImpact(plan, candidate, moduleDescriptors);
  const packageIds = [...packages.keys()].sort();
  const changedPackageIds = Object.freeze(changedPackages(current.active, candidate, packageIds));
  const omittedBefore = new Set(activeImpact.omittedModuleIds);
  const omittedAfter = new Set(candidateImpact.omittedModuleIds);
  const applicationModuleIds = Object.freeze([
    ...candidateImpact.omittedApplicationModuleIds.filter((id) => !omittedBefore.has(id)),
    ...activeImpact.omittedApplicationModuleIds.filter((id) => !omittedAfter.has(id)),
  ].sort());
  const confirmationId = cascaded.length === 0
    ? null
    : `cascade:r${current.revision}:${intent.packageId}:${cascaded.join('+')}`;
  return new CorePluginChangePreparationValue(Object.freeze({
    applicationModuleIds,
    baseRevision: current.revision,
    candidate,
    changedPackageIds,
    confirmationId,
    contributionIds: Object.freeze(changedPackageIds.flatMap((packageId) => (
      packages.get(packageId).manifest.contributions.map(({ id }) => id)
    )).sort()),
    dependencyCascadePackageIds: cascaded,
    intent: Object.freeze({ ...intent }),
    noop: corePluginProfilesEqual(current.active, candidate),
    omittedModuleIds: candidateImpact.omittedModuleIds,
    restartRequired: !corePluginProfilesEqual(current.active, candidate),
    retainedData: true,
  }));
}

/** Read one branded Core Plugin preparation for owner-side CAS and UI projection. */
export function readCorePluginChangePreparation(candidate) {
  if (!(candidate instanceof CorePluginChangePreparationValue)) {
    failPluginContract('CORE_PLUGIN_PREPARATION_REQUIRED', 'A branded Core Plugin preparation is required.');
  }
  return candidate.read();
}
