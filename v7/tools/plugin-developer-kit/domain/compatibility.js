import { CONTRACT_PROFILE, DEVELOPER_KIT_VERSION, SDK_VERSION } from './contract.js';

const CONTRIBUTIONS = Object.freeze({
  deprecated: Object.freeze([]),
  supported: Object.freeze([
    Object.freeze({ availability: 'trusted-build', kind: 'semantic-type' }),
    Object.freeze({ availability: 'fixture', kind: 'tool' }),
  ]),
  unavailable: Object.freeze([
    Object.freeze({ kind: 'drawing', reason: 'No public executable P1a profile.' }),
    Object.freeze({ kind: 'indicator', reason: 'Sub-pane and Worker execution are not authorized.' }),
    Object.freeze({ kind: 'workflow', reason: 'No public executable P1a profile.' }),
    Object.freeze({ kind: 'community', reason: 'P1b installation and P3 execution are not authorized.' }),
  ]),
});

export function compatibilityReport({ gates = {}, requested = {}, toolchain }) {
  const normalizedGates = {
    applicable: [...(gates.applicable ?? [])].sort(),
    blocked: [...(gates.blocked ?? [])].sort(),
    failed: [...(gates.failed ?? [])].sort(),
    notApplicable: [...(gates.notApplicable ?? [])].sort(),
    passed: [...(gates.passed ?? [])].sort(),
  };
  return Object.freeze({
    capabilities: Object.freeze({
      deprecated: Object.freeze([]),
      supported: Object.freeze([
        'annotation.evidence.bundle@1.0.0',
        'annotation.geometry.rectangle@1.0.0',
        'annotation.geometry.segment@1.0.0',
      ]),
      unavailable: Object.freeze(['production.worker', 'registry.remote', 'subpane.runtime']),
    }),
    contributions: CONTRIBUTIONS,
    developerBundleOnly: true,
    gates: Object.freeze(normalizedGates),
    humanChoices: Object.freeze([]),
    laterCandidateEligible: false,
    permissions: Object.freeze({ increased: Object.freeze([]), requested: Object.freeze([]) }),
    requested: Object.freeze({
      contractProfile: requested.contractProfile ?? CONTRACT_PROFILE,
      developerKitVersion: requested.developerKitVersion ?? DEVELOPER_KIT_VERSION,
      sdkVersion: requested.sdkVersion ?? SDK_VERSION,
    }),
    resolved: Object.freeze({
      contractProfile: CONTRACT_PROFILE,
      developerKitVersion: DEVELOPER_KIT_VERSION,
      sdkVersion: SDK_VERSION,
      toolchain,
    }),
    review: Object.freeze({
      permissionReviewRequired: false,
      semanticReviewRequired: false,
      visibleReviewRequired: false,
    }),
    safeFixes: Object.freeze([]),
    schemaVersion: 1,
  });
}
