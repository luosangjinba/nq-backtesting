const REQUIRED_IDENTITIES = ['sessionId', 'activationGeneration', 'transactionId'];
const TERMINAL_STATES = ['committed', 'rejected', 'stale', 'failed', 'cancelled'];

function findCycle(modules) {
  const dependencies = new Map(modules.map((module) => [module.id, module.dependencies ?? []]));
  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return [...dependencies.keys()].some(visit);
}

export function validateArchitectureModel(model) {
  const violations = [];
  const modules = model.modules ?? [];

  const writerOwners = new Map();
  for (const module of modules) {
    for (const writer of module.writers ?? []) {
      if (writerOwners.has(writer)) {
        violations.push({ code: 'duplicate-writer', writer, modules: [writerOwners.get(writer), module.id] });
      } else {
        writerOwners.set(writer, module.id);
      }
    }
    if ((module.internalImports ?? []).length > 0) {
      violations.push({ code: 'cross-module-internal-import', module: module.id });
    }
  }

  if (findCycle(modules)) violations.push({ code: 'dependency-cycle' });
  if (model.events?.orchestrateBusinessFlow === true) {
    violations.push({ code: 'event-business-orchestration' });
  }

  for (const field of REQUIRED_IDENTITIES) {
    if (!model.transaction?.identityFields?.includes(field)) {
      violations.push({ code: 'missing-transaction-identity', field });
    }
  }

  if (model.transaction?.exactlyOneTerminal !== true) {
    violations.push({ code: 'transaction-not-exactly-one-terminal' });
  }
  if (model.transaction?.everyAcceptedIntentHasTerminalPath !== true) {
    violations.push({ code: 'transaction-missing-terminal-path' });
  }
  if (JSON.stringify(model.transaction?.terminalStates) !== JSON.stringify(TERMINAL_STATES)) {
    violations.push({ code: 'transaction-terminal-state-contract-drift' });
  }
  if ((model.transaction?.staleAllowedSideEffects ?? []).length > 0) {
    violations.push({ code: 'stale-completion-side-effect' });
  }

  if (model.minimalCore?.headless !== true) violations.push({ code: 'minimal-core-not-headless' });
  if (model.minimalCore?.bootsWithoutOptionalModules !== true) {
    violations.push({ code: 'optional-module-required' });
  }
  if (model.minimalCore?.globalMutableState === true) {
    violations.push({ code: 'minimal-core-global-state' });
  }

  return violations;
}

export const ARCHITECTURE_MODEL_CONSTANTS = Object.freeze({
  requiredIdentities: REQUIRED_IDENTITIES,
  terminalStates: TERMINAL_STATES,
});
