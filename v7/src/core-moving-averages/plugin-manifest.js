import { defineBuiltInPluginManifest } from '../plugin-contract/public.js';
import {
  MOVING_AVERAGES_CONTRIBUTION_ID,
  MOVING_AVERAGES_MODULE_ID,
  MOVING_AVERAGES_PACKAGE_ID,
  MOVING_AVERAGES_VERSION,
} from './identities.js';
import { MOVING_AVERAGES_PARAMETER_SCHEMA_WIRE } from './parameter-schema.js';

/** Exact P0a Manifest V1 for the single-definition Moving Averages package. */
export const MOVING_AVERAGES_PLUGIN_MANIFEST = defineBuiltInPluginManifest({
  capabilities: {
    extends: [],
    provides: [{ id: MOVING_AVERAGES_CONTRIBUTION_ID, version: MOVING_AVERAGES_VERSION }],
    requires: [],
  },
  conformance: { harness: 'tests/core-moving-averages-harness.js' },
  contributions: [{
    displayName: 'Moving Averages',
    id: MOVING_AVERAGES_CONTRIBUTION_ID,
    kind: 'indicator',
    parameters: MOVING_AVERAGES_PARAMETER_SCHEMA_WIRE,
    version: MOVING_AVERAGES_VERSION,
  }],
  display: {
    description: 'Deterministic price-based moving averages for Replay validation.',
    name: 'Moving Averages',
  },
  distribution: {
    publisherId: 'first-party.replay-lab',
    source: 'built-in',
    tier: 'core',
    trust: 'first-party',
  },
  hostApiRange: '^1.0.0',
  manifestVersion: 1,
  module: { id: MOVING_AVERAGES_MODULE_ID, version: MOVING_AVERAGES_VERSION },
  packageId: MOVING_AVERAGES_PACKAGE_ID,
  packageVersion: MOVING_AVERAGES_VERSION,
  permissions: [],
});
