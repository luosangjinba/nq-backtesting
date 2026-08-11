import { normalizeModuleDescriptor } from '../module-host/public.js';
import { contractId, exactRecord } from './contract-value.js';
import { failPluginContract } from './plugin-contract-error.js';
import { readBuiltInPluginManifest } from './plugin-manifest.js';
import {
  pluginVersion,
  pluginVersionSatisfies,
} from './semantic-version.js';

const HOST_STATES = new Set(['failed', 'idle', 'running', 'starting', 'stopped', 'stopping']);
const PLUGIN_STATE = Object.freeze({
  failed: 'failed',
  idle: 'disabled',
  running: 'active',
  starting: 'activating',
  stopped: 'disabled',
  stopping: 'deactivating',
});

class BuiltInPluginPlanValue {
  #value;
  constructor(value) { this.#value = value; Object.freeze(this); }
  read() { return this.#value; }
}

function normalizeHostCapability(value) {
  exactRecord(
    value,
    ['id', 'version'],
    'PLUGIN_PLAN_INVALID',
    'Host capability',
  );
  return Object.freeze({
    id: contractId(value.id, 'Host capability id'),
    version: pluginVersion(value.version, 'Host capability version'),
  });
}

function descriptorMap(values) {
  if (!Array.isArray(values)) {
    failPluginContract('PLUGIN_PLAN_INVALID', 'Plugin module descriptors must be an array.');
  }
  let descriptors;
  try { descriptors = values.map(normalizeModuleDescriptor); } catch (cause) {
    failPluginContract(
      'PLUGIN_MODULE_DESCRIPTOR_INVALID',
      'A built-in plugin module descriptor is invalid.',
      { cause },
    );
  }
  const byId = new Map();
  for (const descriptor of descriptors) {
    if (byId.has(descriptor.id)) {
      failPluginContract('PLUGIN_MODULE_DUPLICATE', `Module ${descriptor.id} is duplicated.`);
    }
    byId.set(descriptor.id, descriptor);
  }
  const contract = byId.get('core.plugin-contract');
  if (!contract || contract.kind !== 'core' || contract.removable) {
    failPluginContract('PLUGIN_CONTRACT_MODULE_MISSING', 'The Kernel plugin contract module is missing.');
  }
  return byId;
}

function manifestRecords(values, byModuleId, hostApiVersion) {
  if (!Array.isArray(values) || values.length < 1) {
    failPluginContract('PLUGIN_PLAN_INVALID', 'Built-in plugin manifests must be a non-empty array.');
  }
  const packageIds = new Set();
  const moduleIds = new Set();
  return values.map((candidate) => {
    const manifest = readBuiltInPluginManifest(candidate);
    if (packageIds.has(manifest.packageId)) {
      failPluginContract('PLUGIN_PACKAGE_DUPLICATE', `Package ${manifest.packageId} is duplicated.`);
    }
    if (moduleIds.has(manifest.module.id)) {
      failPluginContract('PLUGIN_MODULE_DUPLICATE', `Module ${manifest.module.id} binds two packages.`);
    }
    packageIds.add(manifest.packageId);
    moduleIds.add(manifest.module.id);
    const descriptor = byModuleId.get(manifest.module.id);
    if (!descriptor || descriptor.version !== manifest.module.version
      || descriptor.kind !== 'optional' || !descriptor.removable
      || !descriptor.requiredPorts.includes('core.plugin-contract')) {
      failPluginContract(
        'PLUGIN_MODULE_MISMATCH',
        `Package ${manifest.packageId} does not match one removable plugin-aware module.`,
      );
    }
    if (!pluginVersionSatisfies(hostApiVersion, manifest.hostApiRange)) {
      failPluginContract(
        'PLUGIN_HOST_API_INCOMPATIBLE',
        `Package ${manifest.packageId} is incompatible with the host API.`,
      );
    }
    return { dependencies: new Set(), descriptor, manifest };
  });
}

function capabilityProviders(hostCapabilities, records) {
  if (!Array.isArray(hostCapabilities)) {
    failPluginContract('PLUGIN_PLAN_INVALID', 'Host capabilities must be an array.');
  }
  const providers = new Map();
  function add(capability, packageId) {
    if (providers.has(capability.id)) {
      failPluginContract('PLUGIN_CAPABILITY_COLLISION', `Capability ${capability.id} collides.`);
    }
    providers.set(capability.id, Object.freeze({ ...capability, packageId }));
  }
  hostCapabilities.map(normalizeHostCapability).forEach((capability) => add(capability, null));
  for (const { manifest } of records) {
    manifest.capabilities.provides.forEach((capability) => add(capability, manifest.packageId));
  }
  return providers;
}

function contributionProviders(records) {
  const providers = new Map();
  for (const { manifest } of records) {
    for (const contribution of manifest.contributions) {
      if (providers.has(contribution.id)) {
        failPluginContract('PLUGIN_CONTRIBUTION_COLLISION', `Contribution ${contribution.id} collides.`);
      }
      providers.set(contribution.id, Object.freeze({ ...contribution, packageId: manifest.packageId }));
    }
  }
  return providers;
}

function bindDependencies(records, providers, contributions) {
  for (const record of records) {
    const { manifest } = record;
    for (const requirement of manifest.capabilities.requires) {
      const provider = providers.get(requirement.id);
      if (!provider) {
        failPluginContract('PLUGIN_CAPABILITY_MISSING', `Capability ${requirement.id} is missing.`);
      }
      if (!pluginVersionSatisfies(provider.version, requirement.range)) {
        failPluginContract(
          'PLUGIN_CAPABILITY_INCOMPATIBLE',
          `Capability ${requirement.id} is incompatible.`,
        );
      }
      if (provider.packageId === manifest.packageId) {
        failPluginContract('PLUGIN_SELF_DEPENDENCY', `Package ${manifest.packageId} requires itself.`);
      }
      if (provider.packageId !== null) record.dependencies.add(provider.packageId);
    }
    for (const extension of manifest.capabilities.extends) {
      const provider = contributions.get(extension.id);
      if (!provider) {
        failPluginContract('PLUGIN_EXTENSION_MISSING', `Contribution ${extension.id} is missing.`);
      }
      if (!pluginVersionSatisfies(provider.version, extension.range)) {
        failPluginContract('PLUGIN_EXTENSION_INCOMPATIBLE', `Contribution ${extension.id} is incompatible.`);
      }
      if (provider.packageId === manifest.packageId) {
        failPluginContract('PLUGIN_SELF_DEPENDENCY', `Package ${manifest.packageId} extends itself.`);
      }
      record.dependencies.add(provider.packageId);
    }
  }
}

function dependencyOrder(records) {
  const byId = new Map(records.map((record) => [record.manifest.packageId, record]));
  const visiting = new Set();
  const visited = new Set();
  const order = [];
  function visit(packageId) {
    if (visiting.has(packageId)) {
      failPluginContract('PLUGIN_DEPENDENCY_CYCLE', `Plugin dependency cycle reaches ${packageId}.`);
    }
    if (visited.has(packageId)) return;
    visiting.add(packageId);
    const record = byId.get(packageId);
    [...record.dependencies].sort().forEach(visit);
    visiting.delete(packageId);
    visited.add(packageId);
    order.push(record);
  }
  [...byId.keys()].sort().forEach(visit);
  return order;
}

function validateModuleDependencies(records) {
  const packageModuleIds = new Map(records.map(({ manifest }) => [
    manifest.packageId,
    manifest.module.id,
  ]));
  const pluginModuleIds = new Set(packageModuleIds.values());
  for (const { dependencies, descriptor, manifest } of records) {
    const declared = new Set(descriptor.requiredPorts);
    const expected = new Set([...dependencies].map((packageId) => packageModuleIds.get(packageId)));
    if ([...expected].some((moduleId) => !declared.has(moduleId))) {
      failPluginContract(
        'PLUGIN_MODULE_DEPENDENCY_MISSING',
        `Package ${manifest.packageId} does not declare every plugin dependency as a required port.`,
      );
    }
    if ([...declared].some((moduleId) => pluginModuleIds.has(moduleId) && !expected.has(moduleId))) {
      failPluginContract(
        'PLUGIN_MODULE_DEPENDENCY_UNDECLARED',
        `Package ${manifest.packageId} has an undeclared plugin module dependency.`,
      );
    }
  }
}

/** Compile compatible built-in manifests into one immutable dependency-first ModuleHost plan. */
export function createBuiltInPluginPlan(input = {}) {
  exactRecord(
    input,
    ['hostApiVersion', 'hostCapabilities', 'manifests', 'moduleDescriptors'],
    'PLUGIN_PLAN_INVALID',
    'Built-in plugin plan input',
  );
  const hostApiVersion = pluginVersion(input.hostApiVersion, 'Host API version');
  const byModuleId = descriptorMap(input.moduleDescriptors);
  const records = manifestRecords(input.manifests, byModuleId, hostApiVersion);
  const providers = capabilityProviders(input.hostCapabilities, records);
  bindDependencies(records, providers, contributionProviders(records));
  const orderedRecords = dependencyOrder(records);
  validateModuleDependencies(records);
  const packages = orderedRecords.map(({ dependencies, manifest }) => Object.freeze({
    dependencyPackageIds: Object.freeze([...dependencies].sort()),
    manifest,
  }));
  return new BuiltInPluginPlanValue(Object.freeze({
    hostApiVersion,
    moduleIds: Object.freeze(packages.map(({ manifest }) => manifest.module.id)),
    packages: Object.freeze(packages),
  }));
}

/** Read one branded built-in plan without exposing lifecycle commands or owner handles. */
export function readBuiltInPluginPlan(candidate) {
  if (!(candidate instanceof BuiltInPluginPlanValue)) {
    failPluginContract('PLUGIN_PLAN_REQUIRED', 'A branded built-in plugin plan is required.');
  }
  return candidate.read();
}

/** Project package status from a public ModuleHost snapshot without retaining or controlling the host. */
export function listBuiltInPluginStatuses(plan, moduleHostSnapshot) {
  const value = readBuiltInPluginPlan(plan);
  exactRecord(
    moduleHostSnapshot,
    ['moduleIds', 'status'],
    'PLUGIN_HOST_SNAPSHOT_INVALID',
    'ModuleHost snapshot',
  );
  if (!HOST_STATES.has(moduleHostSnapshot.status) || !Array.isArray(moduleHostSnapshot.moduleIds)
    || moduleHostSnapshot.moduleIds.some((id) => typeof id !== 'string')
    || new Set(moduleHostSnapshot.moduleIds).size !== moduleHostSnapshot.moduleIds.length) {
    failPluginContract('PLUGIN_HOST_SNAPSHOT_INVALID', 'ModuleHost snapshot is invalid.');
  }
  const configured = new Set(moduleHostSnapshot.moduleIds);
  if (value.moduleIds.some((moduleId) => !configured.has(moduleId))) {
    failPluginContract('PLUGIN_HOST_SNAPSHOT_MISMATCH', 'ModuleHost snapshot omits a planned plugin module.');
  }
  return Object.freeze(value.packages.map(({ dependencyPackageIds, manifest }) => Object.freeze({
    contributionIds: Object.freeze(manifest.contributions.map(({ id }) => id)),
    dependencyPackageIds,
    moduleId: manifest.module.id,
    packageId: manifest.packageId,
    packageVersion: manifest.packageVersion,
    state: PLUGIN_STATE[moduleHostSnapshot.status],
  })));
}
