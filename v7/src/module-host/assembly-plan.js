import { ModuleHostError, normalizeModuleDescriptor } from './descriptor-contract.js';

function fail(code, message) {
  throw new ModuleHostError(code, message);
}

/**
 * Owner: module-lifecycle.
 * Produces a deterministic dependency-first order from normalized descriptors.
 * Required ports must exist; absent optional ports are deliberately ignored.
 */
export function planModuleAssembly(descriptors) {
  if (!Array.isArray(descriptors)) fail('INVALID_ASSEMBLY_INPUT', 'Descriptors must be an array.');
  const normalized = descriptors.map(normalizeModuleDescriptor);
  const byId = new Map();
  for (const descriptor of normalized) {
    if (byId.has(descriptor.id)) fail('DUPLICATE_MODULE_ID', `Duplicate module ${descriptor.id}.`);
    byId.set(descriptor.id, descriptor);
  }
  for (const descriptor of normalized) {
    for (const dependency of descriptor.requiredPorts) {
      if (!byId.has(dependency)) {
        fail('MISSING_REQUIRED_MODULE', `${descriptor.id} requires missing module ${dependency}.`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const order = [];
  function visit(moduleId) {
    if (visiting.has(moduleId)) fail('MODULE_DEPENDENCY_CYCLE', `Cycle reaches ${moduleId}.`);
    if (visited.has(moduleId)) return;
    visiting.add(moduleId);
    const descriptor = byId.get(moduleId);
    for (const dependency of [...descriptor.requiredPorts, ...descriptor.optionalPorts]) {
      if (byId.has(dependency)) visit(dependency);
    }
    visiting.delete(moduleId);
    visited.add(moduleId);
    order.push(moduleId);
  }
  for (const moduleId of [...byId.keys()].sort()) visit(moduleId);
  return Object.freeze(order);
}
