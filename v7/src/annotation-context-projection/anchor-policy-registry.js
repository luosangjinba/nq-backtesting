import {
  invokeAnchorProjectionPolicy,
  readAnchorProjectionPolicy,
  requireAnchorProjectionPolicy,
} from './anchor-policy-definition.js';
import { failContextProjection } from './context-projection-error.js';

/** Compose one immutable, plugin-friendly anchor policy registry. */
export function createAnchorProjectionPolicyRegistry({ definitions } = {}) {
  if (!Array.isArray(definitions)) {
    failContextProjection('ANCHOR_POLICY_REGISTRY_INVALID', 'Policy definitions must be an array.');
  }
  const byId = new Map();
  for (const candidate of definitions) {
    const definition = requireAnchorProjectionPolicy(candidate);
    const metadata = readAnchorProjectionPolicy(definition);
    if (byId.has(metadata.policyId)) {
      failContextProjection('ANCHOR_POLICY_DUPLICATE', `Policy ${metadata.policyId} is duplicated.`);
    }
    byId.set(metadata.policyId, definition);
  }
  const list = Object.freeze([...byId.values()].map(readAnchorProjectionPolicy)
    .sort((left, right) => left.policyId.localeCompare(right.policyId)));
  return Object.freeze({
    list: () => list,
    project(reference, input) {
      if (!reference || typeof reference !== 'object' || Array.isArray(reference)
        || Object.keys(reference).sort().join(',') !== 'policyId,version') {
        failContextProjection('ANCHOR_POLICY_REFERENCE_INVALID', 'Policy reference is invalid.');
      }
      const definition = byId.get(reference.policyId);
      if (!definition) {
        failContextProjection('ANCHOR_POLICY_UNKNOWN', `Policy ${reference.policyId} is not registered.`);
      }
      const metadata = readAnchorProjectionPolicy(definition);
      if (metadata.version !== reference.version) {
        failContextProjection('ANCHOR_POLICY_VERSION_UNSUPPORTED', 'Policy version is unsupported.');
      }
      return invokeAnchorProjectionPolicy(definition, input);
    },
  });
}
