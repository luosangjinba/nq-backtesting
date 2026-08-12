import {
  defineBuiltInPluginManifest,
  readBuiltInPluginManifest,
} from '../../../src/plugin-contract/public.js';
import { FAIR_VALUE_GAP_PLUGIN_MANIFEST } from '../../../src/semantic-fair-value-gap/plugin-manifest.js';
import { canonicalJson } from '../domain/canonical-json.js';
import { fail } from '../domain/diagnostic.js';
import { resolveCapabilityGraph } from '../domain/capability-graph.js';

export const TRUSTED_FVG_MANIFEST = readBuiltInPluginManifest(FAIR_VALUE_GAP_PLUGIN_MANIFEST);

export const HOST_CAPABILITIES = Object.freeze([
  Object.freeze({ id: 'annotation.evidence.bundle', version: '1.0.0' }),
  Object.freeze({ id: 'annotation.geometry.rectangle', version: '1.0.0' }),
  Object.freeze({ id: 'annotation.geometry.segment', version: '1.0.0' }),
]);

/** Reuse P0a's public reader, then bind the only P1a trusted-build identity. */
export function readProfileManifest(value, logicalPath = 'plugin.manifest.json') {
  let manifest;
  try {
    manifest = readBuiltInPluginManifest(defineBuiltInPluginManifest(value));
  } catch (error) {
    const sourceCode = error?.code ?? '';
    const code = sourceCode.includes('PERMISSION')
      ? 'V7DK_PERMISSION_UNSUPPORTED'
      : sourceCode.includes('DISTRIBUTION') ? 'V7DK_DISTRIBUTION_UNAUTHORIZED' : 'V7DK_MANIFEST_INVALID';
    fail('candidate', code, 'manifest', 'Plugin manifest does not satisfy the P0a Built-In Manifest V1 contract.', {
      logicalPath,
      related: sourceCode ? [{ sourceCode }] : [],
    });
  }
  if (canonicalJson(manifest) !== canonicalJson(TRUSTED_FVG_MANIFEST)) {
    const unsupported = manifest.contributions.find(({ kind }) => !['semantic-type', 'tool'].includes(kind));
    fail(
      'candidate',
      unsupported ? 'V7DK_CONTRIBUTION_UNAVAILABLE' : 'V7DK_DISTRIBUTION_UNAUTHORIZED',
      'profile',
      unsupported
        ? 'The contribution kind has no executable P1a contract profile.'
        : 'Only the repository FVG trusted-build manifest is authorized by this profile.',
      { logicalPath },
    );
  }
  const graph = resolveCapabilityGraph({ hostCapabilities: HOST_CAPABILITIES, manifests: [manifest] });
  return Object.freeze({ graph, manifest });
}
