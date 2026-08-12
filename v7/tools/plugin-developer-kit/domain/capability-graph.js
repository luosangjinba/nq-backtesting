import { fail } from './diagnostic.js';
import { compareText } from './canonical-json.js';

function versionParts(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

export function satisfiesVersion(version, range) {
  const actual = versionParts(version);
  const expected = versionParts(range.startsWith('^') ? range.slice(1) : range);
  if (!actual || !expected) return false;
  if (!range.startsWith('^')) return actual.every((part, index) => part === expected[index]);
  if (expected[0] > 0) return actual[0] === expected[0]
    && (actual[1] > expected[1] || (actual[1] === expected[1] && actual[2] >= expected[2]));
  if (expected[1] > 0) return actual[0] === 0 && actual[1] === expected[1] && actual[2] >= expected[2];
  return actual[0] === 0 && actual[1] === 0 && actual[2] === expected[2];
}

function detectCycle(edges) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  function visit(id) {
    if (visiting.has(id)) return [...stack.slice(stack.indexOf(id)), id];
    if (visited.has(id)) return null;
    visiting.add(id);
    stack.push(id);
    for (const next of [...(edges.get(id) ?? [])].sort()) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return null;
  }
  for (const id of [...edges.keys()].sort()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return null;
}

/** Resolve P0a provides/requires/extends without executing a package. */
export function resolveCapabilityGraph({ hostCapabilities, manifests }) {
  const packageIds = manifests.map(({ packageId }) => packageId);
  if (new Set(packageIds).size !== packageIds.length) {
    fail('candidate', 'V7DK_CAPABILITY_DUPLICATE', 'capability-graph', 'Package ids in the capability graph must be unique.');
  }
  const providers = new Map();
  for (const capability of hostCapabilities) providers.set(capability.id, {
    packageId: null,
    version: capability.version,
  });
  for (const manifest of [...manifests].sort((a, b) => compareText(a.packageId, b.packageId))) {
    const ownIds = new Set();
    for (const provided of manifest.capabilities.provides) {
      if (ownIds.has(provided.id)) {
        fail('candidate', 'V7DK_CAPABILITY_DUPLICATE', 'capability-graph', 'A package provides a duplicate capability.', {
          related: [{ capabilityId: provided.id, packageId: manifest.packageId }],
        });
      }
      ownIds.add(provided.id);
      if (providers.has(provided.id)) {
        fail('candidate', 'V7DK_CAPABILITY_COLLISION', 'capability-graph', 'Capability providers collide.', {
          related: [{ capabilityId: provided.id, packageId: manifest.packageId }],
        });
      }
      providers.set(provided.id, { packageId: manifest.packageId, version: provided.version });
    }
  }
  const edges = new Map(manifests.map(({ packageId }) => [packageId, new Set()]));
  const dependencies = [];
  for (const manifest of [...manifests].sort((a, b) => compareText(a.packageId, b.packageId))) {
    const ownProvides = new Set(manifest.capabilities.provides.map(({ id }) => id));
    const seen = new Set();
    for (const kind of ['requires', 'extends']) {
      for (const dependency of manifest.capabilities[kind]) {
        if (seen.has(dependency.id)) {
          fail('candidate', 'V7DK_CAPABILITY_DUPLICATE', 'capability-graph', 'A dependency is duplicated.', {
            related: [{ capabilityId: dependency.id, packageId: manifest.packageId }],
          });
        }
        seen.add(dependency.id);
        if (ownProvides.has(dependency.id)) {
          fail('candidate', 'V7DK_CAPABILITY_SELF_REFERENCE', 'capability-graph', 'A package depends on its own capability.', {
            related: [{ capabilityId: dependency.id, packageId: manifest.packageId }],
          });
        }
        const provider = providers.get(dependency.id);
        if (!provider) {
          fail('candidate', 'V7DK_CAPABILITY_MISSING', 'capability-graph', 'A required capability is missing.', {
            related: [{ capabilityId: dependency.id, packageId: manifest.packageId }],
          });
        }
        if (!satisfiesVersion(provider.version, dependency.range)) {
          fail('candidate', 'V7DK_CAPABILITY_INCOMPATIBLE', 'capability-graph', 'A capability version is incompatible.', {
            related: [{ capabilityId: dependency.id, packageId: manifest.packageId }],
          });
        }
        if (provider.packageId) edges.get(manifest.packageId).add(provider.packageId);
        dependencies.push({
          capabilityId: dependency.id,
          consumer: manifest.packageId,
          kind,
          provider: provider.packageId ?? 'host',
          range: dependency.range,
          version: provider.version,
        });
      }
    }
  }
  const cycle = detectCycle(edges);
  if (cycle) {
    fail('candidate', 'V7DK_CAPABILITY_CYCLE', 'capability-graph', 'The capability dependency graph is cyclic.', {
      related: [{ packages: cycle }],
    });
  }
  const ordered = [];
  const remaining = new Map([...edges].map(([id, values]) => [id, new Set(values)]));
  while (remaining.size > 0) {
    const ready = [...remaining].filter(([, values]) => values.size === 0).map(([id]) => id).sort();
    if (ready.length === 0) break;
    for (const id of ready) {
      ordered.push(id);
      remaining.delete(id);
      for (const values of remaining.values()) values.delete(id);
    }
  }
  return Object.freeze({ dependencies: Object.freeze(dependencies), packageOrder: Object.freeze(ordered) });
}
