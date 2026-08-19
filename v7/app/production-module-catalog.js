import { createCorePluginBootSelection } from '../src/plugin-contract/public.js';
import { CORE_PLUGIN_PROFILE_STORAGE_KEY } from '../src/core-plugin-profile/public.js';
import { createProductionBuiltInPluginPlan } from './core-plugin-catalog.js';

const DEFAULT_MANIFEST_URL = new URL('../docs/v7-architecture-manifest.json', import.meta.url);
const VALIDATION_CAMPAIGN_CLOSURE = Object.freeze([
  'adapter.validation-campaign-audit-export',
  'adapter.validation-campaign-persistence',
  'adapter.validation-campaign-ui',
  'adapter.validation-fvg-evidence',
  'adapter.validation-outcome-window',
  'adapter.validation-sma-evidence',
  'optional.validation-campaign-runtime',
  'optional.validation-study-domain',
]);

async function readJson(url) {
  const response = await fetch(String(url));
  if (!response.ok) throw new Error(`Could not load production module metadata: ${response.status}.`);
  return response.json();
}

export function selectApplicationDescriptors(descriptors, rootModuleId, omittedModuleIds) {
  const byId = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  if (!byId.has(rootModuleId)) throw new TypeError(`Unknown production application ${rootModuleId}.`);
  const omitted = new Set(omittedModuleIds);
  if (omitted.has(rootModuleId)) throw new TypeError('The production application root cannot be omitted.');
  let changed = true;
  while (changed) {
    changed = false;
    if (omitted.has('adapter.validation-campaign-ui')) {
      for (const moduleId of VALIDATION_CAMPAIGN_CLOSURE) {
        if (!omitted.has(moduleId)) {
          omitted.add(moduleId);
          changed = true;
        }
      }
    }
    for (const descriptor of descriptors) {
      if (descriptor.id === rootModuleId || omitted.has(descriptor.id)) continue;
      if (descriptor.requiredPorts.some((moduleId) => omitted.has(moduleId))) {
        omitted.add(descriptor.id);
        changed = true;
      }
    }
  }
  const selected = new Map();
  function visit(moduleId) {
    if (omitted.has(moduleId) || selected.has(moduleId)) return;
    const descriptor = byId.get(moduleId);
    if (!descriptor) throw new TypeError(`Production descriptor ${moduleId} is missing.`);
    selected.set(moduleId, descriptor);
    descriptor.requiredPorts.forEach(visit);
    descriptor.optionalPorts.forEach(visit);
  }
  visit(rootModuleId);
  return [...selected.values()];
}

/** Load and freeze the complete deployed browser module catalog once per page boot. */
export async function loadProductionModuleCatalog({ manifestUrl = DEFAULT_MANIFEST_URL } = {}) {
  const manifest = await readJson(manifestUrl);
  const descriptorBaseUrl = new URL('../', manifestUrl);
  const descriptors = await Promise.all(manifest.activeProductionModules.map((descriptorPath) => (
    readJson(new URL(descriptorPath, descriptorBaseUrl))
  )));
  return Object.freeze({
    descriptorBaseUrl,
    descriptors: Object.freeze(descriptors),
    manifest: Object.freeze(manifest),
    manifestUrl,
  });
}

function publicPortDefinition(descriptor, publicApi, lifecycleObserver) {
  if (descriptor.lifecycle.length === 0) return Object.freeze({ descriptor, publicApi });
  return Object.freeze({
    descriptor,
    instantiate({ optionalPorts, requiredPorts }) {
      lifecycleObserver('instantiate', descriptor.id, Object.freeze({
        optionalPortIds: Object.freeze(Object.keys(optionalPorts).sort()),
        requiredPortIds: Object.freeze(Object.keys(requiredPorts).sort()),
      }));
      const instance = { publicApi };
      for (const method of descriptor.lifecycle) {
        instance[method] = async () => { lifecycleObserver(method, descriptor.id); };
      }
      return Object.freeze(instance);
    },
  });
}

function withDefaultCorePluginBoot(environment, descriptors, rootModuleId) {
  if (rootModuleId !== 'adapter.session-application' || environment.corePluginBoot) return environment;
  const plan = createProductionBuiltInPluginPlan(descriptors);
  let rawRecord = null;
  let recoveryCode = null;
  try { rawRecord = environment.readStorage?.().getItem(CORE_PLUGIN_PROFILE_STORAGE_KEY) ?? null; } catch {
    recoveryCode = 'persistence-unavailable';
  }
  const selection = createCorePluginBootSelection({ plan, rawRecord });
  return Object.freeze({
    ...environment,
    corePluginBoot: Object.freeze({
      candidate: selection.candidates[0],
      failures: Object.freeze([]),
      plan,
      selection: Object.freeze({
        ...selection,
        recoveryCode: selection.recoveryCode ?? recoveryCode,
      }),
    }),
  });
}

/**
 * Load the exact production descriptor closure for one application and adapt
 * its real public entries into ModuleHost definitions. Only the selected root
 * constructs browser resources; dependency definitions register public ports
 * and own no hidden application-global state.
 */
export async function loadProductionApplicationDefinitions({
  catalog = null,
  environment,
  lifecycleObserver = () => {},
  manifestUrl = DEFAULT_MANIFEST_URL,
  omittedModuleIds = [],
  rootModuleId,
}) {
  const loaded = catalog ?? await loadProductionModuleCatalog({ manifestUrl });
  const { descriptorBaseUrl, descriptors } = loaded;
  const selected = selectApplicationDescriptors(descriptors, rootModuleId, omittedModuleIds);
  const effectiveEnvironment = withDefaultCorePluginBoot(environment, descriptors, rootModuleId);
  const rootEnvironment = Object.freeze({
    ...effectiveEnvironment,
    productionModuleCatalogDescriptors: Object.freeze([...descriptors]),
    productionModuleDescriptors: Object.freeze([...selected]),
    readModuleHostSnapshot: effectiveEnvironment.readModuleHostSnapshot ?? (() => Object.freeze({
      moduleIds: Object.freeze(selected.map(({ id }) => id)),
      status: 'running',
    })),
  });
  const definitions = await Promise.all(selected.map(async (descriptor) => {
    const publicApi = await import(new URL(descriptor.publicEntry, descriptorBaseUrl));
    if (descriptor.id === rootModuleId) {
      if (typeof publicApi.createProductionModuleDefinition !== 'function') {
        throw new TypeError(`${rootModuleId} does not export createProductionModuleDefinition().`);
      }
      return publicApi.createProductionModuleDefinition({
        descriptor,
        environment: rootEnvironment,
        lifecycleObserver,
      });
    }
    return publicPortDefinition(descriptor, publicApi, lifecycleObserver);
  }));
  return Object.freeze(definitions);
}
