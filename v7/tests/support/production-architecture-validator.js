function sorted(values) {
  return [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function violation(code, subject, detail) {
  return Object.freeze({ code, detail, subject });
}

/**
 * Owner: Test Governance.
 * Inputs/outputs: validates a production-derived architecture snapshot against
 * explicit analyzer policy and returns stable violations.
 * Side effects/lifecycle: none.
 * Errors: malformed analyzer policy throws before any rule can be reported.
 * Protected invariant: descriptor, boot, lifecycle, and writer truth comes
 * from production source evidence rather than declared fixture models.
 */
export function validateProductionArchitectureSnapshot(snapshot, policy) {
  const violations = [];
  const lifecycleExemptions = new Set(policy.lifecycleFactoryExemptions.map(({ moduleId }) => moduleId));
  const policySurfaceCounts = new Map();
  for (const entry of policy.writerPolicies) {
    policySurfaceCounts.set(entry.surface, (policySurfaceCounts.get(entry.surface) ?? 0) + 1);
  }
  for (const [surface, count] of policySurfaceCounts) {
    if (count > 1) {
      violations.push(violation(
        'writer-policy-duplicate',
        surface,
        `writer surface has ${count} executable detection policies`,
      ));
    }
  }
  const writerPolicies = new Map(policy.writerPolicies.map((entry) => [entry.surface, entry]));
  const inventorySurfaceCounts = new Map();
  for (const entry of snapshot.declaredWriterSurfaces) {
    inventorySurfaceCounts.set(entry.surface, (inventorySurfaceCounts.get(entry.surface) ?? 0) + 1);
  }
  for (const [surface, count] of inventorySurfaceCounts) {
    if (count > 1) {
      violations.push(violation(
        'writer-inventory-duplicate',
        surface,
        `writer surface has ${count} inventory declarations`,
      ));
    }
  }
  const writerInventories = new Map(snapshot.declaredWriterSurfaces.map((entry) => [entry.surface, entry]));
  const modulesById = new Map(snapshot.modules.map((module) => [module.id, module]));

  for (const [surface, inventory] of writerInventories) {
    const writerPolicy = writerPolicies.get(surface);
    if (!writerPolicy) {
      violations.push(violation(
        'writer-policy-missing',
        surface,
        'declared writer inventory has no executable detection policy',
      ));
      continue;
    }
    const inventoryOwners = [...inventory.moduleIds].sort();
    const policyOwners = [...writerPolicy.allowedModuleIds].sort();
    if (JSON.stringify(inventoryOwners) !== JSON.stringify(policyOwners)) {
      violations.push(violation(
        'writer-policy-owner-mismatch',
        surface,
        `inventory owners ${inventoryOwners.join(', ')} differ from policy owners ${policyOwners.join(', ')}`,
      ));
    }
  }
  for (const surface of writerPolicies.keys()) {
    if (!writerInventories.has(surface)) {
      violations.push(violation(
        'writer-inventory-missing',
        surface,
        'executable writer policy has no declared writer inventory',
      ));
    }
  }

  for (const module of snapshot.modules) {
    const declaredPorts = new Set([...module.declaredRequiredPorts, ...module.declaredOptionalPorts]);
    for (const site of module.importSites) {
      if (!site.throughPublicEntry) {
        violations.push(violation(
          'cross-module-internal-import',
          `${module.id}:${site.sourceFile}->${site.targetFile}`,
          'cross-module production imports must resolve through the target public entry',
        ));
      }
    }
    for (const dependency of module.actualDependencies) {
      if (!declaredPorts.has(dependency)) {
        violations.push(violation(
          'descriptor-undeclared-import',
          `${module.id}->${dependency}`,
          'production imports a module absent from requiredPorts and optionalPorts',
        ));
      }
    }
    const declaresDispose = module.declaredLifecycle.includes('dispose');
    const observesDispose = module.observedDisposeSites.length > 0;
    if (observesDispose && !declaresDispose && !lifecycleExemptions.has(module.id)) {
      violations.push(violation(
        'descriptor-lifecycle-missing',
        module.id,
        `production exposes dispose() in ${module.observedDisposeSites.join(', ')}`,
      ));
    }
    if (module.independentHarnessMode === 'app-shell') {
      violations.push(violation(
        'independent-harness-app-shell',
        module.id,
        `${module.independentHarness} boots /v7/app instead of the module public entry`,
      ));
    } else if (module.independentHarnessMode === 'missing-public-entry') {
      violations.push(violation(
        'independent-harness-public-entry-missing',
        module.id,
        `${module.independentHarness} does not reach the module public entry`,
      ));
    }
  }

  const completed = new Set();
  const active = [];
  const reportedCycles = new Set();
  function visit(moduleId) {
    if (completed.has(moduleId)) return;
    const activeIndex = active.indexOf(moduleId);
    if (activeIndex >= 0) {
      const cycle = [...active.slice(activeIndex), moduleId];
      const subject = cycle.join('->');
      if (!reportedCycles.has(subject)) {
        reportedCycles.add(subject);
        violations.push(violation(
          'actual-dependency-cycle',
          subject,
          'production import dependencies must remain acyclic',
        ));
      }
      return;
    }
    active.push(moduleId);
    for (const dependency of modulesById.get(moduleId)?.actualDependencies ?? []) {
      if (modulesById.has(dependency)) visit(dependency);
    }
    active.pop();
    completed.add(moduleId);
  }
  for (const moduleId of modulesById.keys()) visit(moduleId);

  for (const root of snapshot.compositionRoots) {
    if (!root.usesModuleHost) {
      violations.push(violation(
        'production-composition-bypasses-module-host',
        root.path,
        `${root.htmlFile} boots production without core.module-host`,
      ));
    }
  }

  for (const site of snapshot.writerSites) {
    const writerPolicy = writerPolicies.get(site.surface);
    const writerInventory = writerInventories.get(site.surface);
    if (!writerPolicy || !writerInventory) {
      violations.push(violation(
        'writer-evidence-undeclared-surface',
        `${site.surface}:${site.sourceFile}`,
        'observed writer evidence must belong to both policy and inventory',
      ));
      continue;
    }
    if (site.detectorId !== writerPolicy.detectorId) {
      violations.push(violation(
        'writer-evidence-detector-mismatch',
        `${site.surface}:${site.sourceFile}`,
        `observed ${site.detectorId}; policy requires ${writerPolicy.detectorId}`,
      ));
    }
    if (!writerPolicy.allowedModuleIds.includes(site.sourceModuleId)) {
      violations.push(violation(
        'writer-outside-declared-owner',
        `${site.surface}:${site.sourceFile}`,
        `${site.sourceModuleId} writes ${site.surface}; allowed: ${writerPolicy.allowedModuleIds.join(', ')}`,
      ));
    }
  }
  for (const surface of writerInventories.keys()) {
    if (!snapshot.writerSites.some((site) => site.surface === surface)) {
      violations.push(violation(
        'writer-evidence-missing',
        surface,
        'declared sole-writer surface has no observed production write evidence',
      ));
    }
  }
  return Object.freeze(sorted(violations));
}

/** Return one stable violation when any production-derived snapshot field drifts. */
export function compareProductionArchitectureSnapshots(expected, actual) {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return Object.freeze([]);
  return Object.freeze([violation(
    'production-snapshot-drift',
    'production-architecture-baseline',
    'module, dependency, construction, lifecycle, harness, composition, or writer evidence changed',
  )]);
}
