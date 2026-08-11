import {
  createCorePluginBootFailure,
  createCorePluginBootSelection,
  planCorePluginApplicationImpact,
} from '../src/plugin-contract/public.js';
import { CORE_PLUGIN_PROFILE_STORAGE_KEY } from '../src/core-plugin-profile/public.js';
import { createProductionBuiltInPluginPlan } from './core-plugin-catalog.js';
import { loadProductionApplicationDefinitions } from './production-module-catalog.js';

/** Read the device-local profile without repair; storage denial falls back to build defaults. */
export function readProductionCorePluginBootSelection({ catalog, storage }) {
  const plan = createProductionBuiltInPluginPlan(catalog.descriptors);
  let rawRecord = null;
  let storageRecoveryCode = null;
  try { rawRecord = storage.getItem(CORE_PLUGIN_PROFILE_STORAGE_KEY); } catch {
    storageRecoveryCode = 'persistence-unavailable';
  }
  const selection = createCorePluginBootSelection({ plan, rawRecord });
  return Object.freeze({ plan, selection, storageRecoveryCode });
}

async function attemptGeneration({
  candidate,
  catalog,
  createEnvironment,
  createHost,
  failures,
  plan,
  rootModuleId,
  selection,
  storageRecoveryCode,
}) {
  let host = null;
  try {
    const impact = planCorePluginApplicationImpact(plan, candidate.profile, catalog.descriptors);
    const boot = Object.freeze({
      candidate,
      failures: Object.freeze([...failures]),
      plan,
      selection: Object.freeze({
        ...selection,
        recoveryCode: selection.recoveryCode ?? storageRecoveryCode,
      }),
    });
    const environment = createEnvironment({
      boot,
      readModuleHostSnapshot: () => host?.snapshot()
        ?? Object.freeze({ moduleIds: [], status: 'idle' }),
    });
    const definitions = await loadProductionApplicationDefinitions({
      catalog,
      environment: Object.freeze({ ...environment, corePluginBoot: boot }),
      omittedModuleIds: impact.omittedModuleIds,
      rootModuleId,
    });
    host = createHost(definitions);
    await host.start();
    return Object.freeze({ host });
  } catch (error) {
    return Object.freeze({
      failure: createCorePluginBootFailure({
        attemptId: candidate.attemptId,
        error,
        phase: host === null ? 'plan' : 'start',
        plan,
      }),
    });
  }
}

/** Try one candidate, last-known-good, then Kernel-safe generation with no overlap. */
export async function startProductionCorePluginGeneration({
  catalog,
  createEnvironment,
  createHost,
  rootModuleId = 'adapter.session-application',
  storage,
} = {}) {
  if (!catalog?.descriptors || typeof createEnvironment !== 'function'
    || typeof createHost !== 'function' || !storage) {
    throw new TypeError('Core Plugin boot supervisor requires catalog, storage, host, and environment factories.');
  }
  const { plan, selection, storageRecoveryCode } = readProductionCorePluginBootSelection({
    catalog,
    storage,
  });
  const failures = [];
  for (const candidate of selection.candidates) {
    const attempt = await attemptGeneration({
      candidate, catalog, createEnvironment, createHost, failures, plan,
      rootModuleId, selection, storageRecoveryCode,
    });
    if (attempt.host) {
      return Object.freeze({
        candidate,
        failures: Object.freeze([...failures]),
        host: attempt.host,
        plan,
        selection,
      });
    }
    failures.push(attempt.failure);
  }
  const error = new AggregateError(
    failures,
    'Pending, last-known-good, and Kernel-safe Core Plugin generations all failed.',
  );
  error.code = 'CORE_PLUGIN_KERNEL_BOOT_FAILED';
  error.failures = Object.freeze([...failures]);
  throw error;
}
