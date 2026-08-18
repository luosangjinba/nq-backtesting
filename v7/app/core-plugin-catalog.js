import { createBuiltInPluginPlan } from '../src/plugin-contract/public.js';
import { FAIR_VALUE_GAP_PLUGIN_MANIFEST } from '../src/semantic-fair-value-gap/public.js';
import { MOVING_AVERAGES_PLUGIN_MANIFEST } from '../src/core-moving-averages/public.js';

export const PRODUCTION_PLUGIN_HOST_API_VERSION = '1.0.0';
export const PRODUCTION_PLUGIN_HOST_CAPABILITIES = Object.freeze([
  Object.freeze({ id: 'annotation.evidence.bundle', version: '1.0.0' }),
  Object.freeze({ id: 'annotation.geometry.rectangle', version: '1.0.0' }),
  Object.freeze({ id: 'annotation.geometry.segment', version: '1.0.0' }),
]);
export const PRODUCTION_BUILT_IN_PLUGIN_MANIFESTS = Object.freeze([
  FAIR_VALUE_GAP_PLUGIN_MANIFEST,
  MOVING_AVERAGES_PLUGIN_MANIFEST,
]);

/** Compile the exact trusted manifests embedded in this production build. */
export function createProductionBuiltInPluginPlan(moduleDescriptors) {
  return createBuiltInPluginPlan({
    hostApiVersion: PRODUCTION_PLUGIN_HOST_API_VERSION,
    hostCapabilities: PRODUCTION_PLUGIN_HOST_CAPABILITIES,
    manifests: PRODUCTION_BUILT_IN_PLUGIN_MANIFESTS,
    moduleDescriptors,
  });
}
