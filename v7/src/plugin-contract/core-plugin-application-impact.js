import { normalizeModuleDescriptor } from '../module-host/public.js';
import { failPluginContract } from './plugin-contract-error.js';
import { readBuiltInPluginPlan } from './built-in-plugin-plan.js';

function descriptorIndex(values) {
  if (!Array.isArray(values)) {
    failPluginContract('CORE_PLUGIN_IMPACT_INVALID', 'Application module descriptors must be an array.');
  }
  const descriptors = values.map(normalizeModuleDescriptor);
  const byId = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  if (byId.size !== descriptors.length) {
    failPluginContract('CORE_PLUGIN_IMPACT_INVALID', 'Application module descriptors are duplicated.');
  }
  return Object.freeze({ byId, descriptors });
}

/** Plan transitive removable application omissions for one immutable Core profile. */
export function planCorePluginApplicationImpact(plan, profile, moduleDescriptors) {
  const planned = readBuiltInPluginPlan(plan);
  const { byId, descriptors } = descriptorIndex(moduleDescriptors);
  const enabled = new Set(profile.enabledPackageIds);
  const omitted = new Set(planned.packages
    .filter(({ manifest }) => !enabled.has(manifest.packageId))
    .map(({ manifest }) => manifest.module.id));
  for (const moduleId of omitted) {
    const descriptor = byId.get(moduleId);
    if (!descriptor?.removable) {
      failPluginContract(
        'CORE_PLUGIN_IMPACT_NON_REMOVABLE',
        `Core package module ${moduleId} cannot be omitted.`,
      );
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const descriptor of descriptors) {
      if (omitted.has(descriptor.id)
        || !descriptor.requiredPorts.some((moduleId) => omitted.has(moduleId))) continue;
      if (!descriptor.removable) {
        failPluginContract(
          'CORE_PLUGIN_IMPACT_NON_REMOVABLE',
          `Disabling Core packages would omit non-removable module ${descriptor.id}.`,
        );
      }
      omitted.add(descriptor.id);
      changed = true;
    }
  }
  const packageModuleIds = new Set(planned.moduleIds);
  return Object.freeze({
    omittedApplicationModuleIds: Object.freeze(
      [...omitted].filter((id) => !packageModuleIds.has(id)).sort(),
    ),
    omittedModuleIds: Object.freeze([...omitted].sort()),
    omittedPackageModuleIds: Object.freeze(
      [...omitted].filter((id) => packageModuleIds.has(id)).sort(),
    ),
  });
}
