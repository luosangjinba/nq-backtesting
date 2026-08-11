import { defineBuiltInPluginManifest } from '../plugin-contract/public.js';
import {
  FAIR_VALUE_GAP_TYPE_ID,
  FAIR_VALUE_GAP_VERSION,
} from './fvg-artifact.js';
import { FAIR_VALUE_GAP_PACKAGE_ID } from './fair-value-gap-package.js';

export const FAIR_VALUE_GAP_TOOL_ID = 'construct.imbalance.fvg';

/** Define the portable built-in Core Plugin identity around the existing FVG policies. */
export const FAIR_VALUE_GAP_PLUGIN_MANIFEST = defineBuiltInPluginManifest({
  capabilities: {
    extends: [],
    provides: [
      { id: `semantic.${FAIR_VALUE_GAP_TYPE_ID}`, version: FAIR_VALUE_GAP_VERSION },
      { id: FAIR_VALUE_GAP_TOOL_ID, version: FAIR_VALUE_GAP_VERSION },
    ],
    requires: [
      { id: 'annotation.evidence.bundle', range: '^1.0.0' },
      { id: 'annotation.geometry.rectangle', range: '^1.0.0' },
      { id: 'annotation.geometry.segment', range: '^1.0.0' },
    ],
  },
  conformance: { harness: 'tests/plugin-contract-substrate-harness.js' },
  contributions: [
    {
      displayName: 'Fair Value Gap',
      id: `semantic.${FAIR_VALUE_GAP_TYPE_ID}`,
      kind: 'semantic-type',
      parameters: {
        schemaVersion: 1,
        tabs: [
          { id: 'inputs', source: { groupIds: ['semantic'], kind: 'inspector-groups' } },
          { id: 'evidence', source: { groupIds: ['evidence'], kind: 'inspector-groups' } },
          { id: 'history', source: { groupIds: ['history'], kind: 'inspector-groups' } },
        ],
      },
      version: FAIR_VALUE_GAP_VERSION,
    },
    {
      displayName: 'FVG',
      id: FAIR_VALUE_GAP_TOOL_ID,
      kind: 'tool',
      parameters: null,
      version: FAIR_VALUE_GAP_VERSION,
    },
  ],
  display: {
    description: 'Strict evidence-derived three-Bar wick-gap semantics and projections.',
    name: 'Fair Value Gap',
  },
  distribution: {
    publisherId: 'first-party.replay-lab',
    source: 'built-in',
    tier: 'core',
    trust: 'first-party',
  },
  hostApiRange: '^1.0.0',
  manifestVersion: 1,
  module: { id: 'optional.semantic-fair-value-gap', version: FAIR_VALUE_GAP_VERSION },
  packageId: FAIR_VALUE_GAP_PACKAGE_ID,
  packageVersion: FAIR_VALUE_GAP_VERSION,
  permissions: [],
});
