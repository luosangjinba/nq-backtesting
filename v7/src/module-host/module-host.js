import { ModuleHostError, normalizeModuleDefinition } from './descriptor-contract.js';
import { planModuleAssembly } from './assembly-plan.js';
import { normalizeModuleInstance } from './module-instance.js';

function frozenPorts(descriptor, publicApis) {
  const requiredPorts = Object.fromEntries(
    descriptor.requiredPorts.map((id) => [id, publicApis.get(id)]),
  );
  const optionalPorts = Object.fromEntries(
    descriptor.optionalPorts.filter((id) => publicApis.has(id)).map((id) => [id, publicApis.get(id)]),
  );
  return Object.freeze({
    requiredPorts: Object.freeze(requiredPorts),
    optionalPorts: Object.freeze(optionalPorts),
  });
}

async function cleanup(records, startedIds) {
  const errors = [];
  for (const record of [...records].reverse()) {
    if (startedIds.has(record.id) && record.instance.stop) {
      try { await record.instance.stop(); } catch (error) { errors.push(error); }
    }
  }
  for (const record of [...records].reverse()) {
    if (record.instance.dispose) {
      try { await record.instance.dispose(); } catch (error) { errors.push(error); }
    }
  }
  return errors;
}

/**
 * Owner: module-lifecycle.
 * Creates one isolated composition boundary with explicit port injection.
 * No registry, active module, API, or lifecycle state is shared between hosts.
 * Start failure rolls back every created instance in reverse dependency order.
 * Factories construct state only; external resources may be acquired in start,
 * never instantiate, so every acquisition has a declared rollback path.
 */
export function createModuleHost(definitions) {
  if (!Array.isArray(definitions)) {
    throw new ModuleHostError('INVALID_HOST_INPUT', 'Module definitions must be an array.');
  }
  const normalized = definitions.map(normalizeModuleDefinition);
  const definitionsById = new Map(normalized.map((entry) => [entry.descriptor.id, entry]));
  const order = planModuleAssembly(normalized.map((entry) => entry.descriptor));
  let status = 'idle';
  let records = [];
  const publicApis = new Map();
  const startedIds = new Set();

  async function start() {
    if (status !== 'idle') {
      throw new ModuleHostError('INVALID_HOST_STATE', `Cannot start module host from ${status}.`);
    }
    status = 'starting';
    try {
      for (const id of order) {
        const definition = definitionsById.get(id);
        const instance = definition.instantiate
          ? normalizeModuleInstance(
            definition.descriptor,
            await definition.instantiate(frozenPorts(definition.descriptor, publicApis)),
          )
          : Object.freeze({ publicApi: definition.publicApi });
        records.push({ id, instance });
        publicApis.set(id, instance.publicApi);
      }
      for (const record of records) {
        // Mark before awaiting start so a partially-started failing module is
        // included in rollback and cannot strand resources it acquired first.
        startedIds.add(record.id);
        if (record.instance.start) await record.instance.start();
      }
      status = 'running';
      return snapshot();
    } catch (cause) {
      const rollbackErrors = await cleanup(records, startedIds);
      publicApis.clear();
      startedIds.clear();
      records = [];
      status = 'failed';
      if (rollbackErrors.length > 0) {
        throw new ModuleHostError(
          'MODULE_HOST_ROLLBACK_FAILED',
          'Module host start failed and rollback completed with errors.',
          { cause: new AggregateError([cause, ...rollbackErrors]) },
        );
      }
      throw new ModuleHostError('MODULE_HOST_START_FAILED', 'Module host start rolled back.', { cause });
    }
  }

  async function stop() {
    if (status === 'stopped' || status === 'failed') return snapshot();
    if (status !== 'running') {
      throw new ModuleHostError('INVALID_HOST_STATE', `Cannot stop module host from ${status}.`);
    }
    status = 'stopping';
    const errors = await cleanup(records, startedIds);
    publicApis.clear();
    startedIds.clear();
    records = [];
    status = 'stopped';
    if (errors.length > 0) {
      throw new ModuleHostError('MODULE_HOST_CLEANUP_FAILED', 'Module host cleanup completed with errors.', {
        cause: new AggregateError(errors),
      });
    }
    return snapshot();
  }

  function getPublicApi(moduleId) {
    if (status !== 'running' || !publicApis.has(moduleId)) {
      throw new ModuleHostError('MODULE_API_UNAVAILABLE', `Module API ${moduleId} is unavailable.`);
    }
    return publicApis.get(moduleId);
  }

  function snapshot() {
    return Object.freeze({ status, moduleIds: Object.freeze([...order]) });
  }

  return Object.freeze({ start, stop, getPublicApi, snapshot });
}
