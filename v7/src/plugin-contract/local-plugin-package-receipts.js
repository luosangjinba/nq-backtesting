import {
  canonicalLocalPluginPackageJson,
  digestLocalPluginPackageValue,
} from './local-plugin-package-digest.js';
import {
  LOCAL_PLUGIN_ARCHIVE,
  LOCAL_PLUGIN_ARCHIVE_LIMITS,
} from './local-plugin-package-archive.js';

const PROFILE = 'local-declarative-package-v1';
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const DEVELOPER_OPERATIONS = Object.freeze(['build', 'preview', 'test']);
const WORKSPACE_IDENTITIES = Object.freeze([
  'expectedDigest', 'fixtureDigest', 'manifestDigest', 'sourceDigest', 'workspaceDigest',
]);
const DETERMINISM = Object.freeze({
  clockEpochMs: 1_700_000_000_000,
  locale: 'en-US',
  seed: 7_011_337,
  timezone: 'UTC',
});
const LIMITS = Object.freeze({
  archiveEntries: LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntries,
  archiveEntryBytes: LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveEntryBytes,
  archiveUnpackedBytes: LOCAL_PLUGIN_ARCHIVE_LIMITS.archiveUnpackedBytes,
  candidateMemoryMiB: 64,
  candidateOutputBytes: 512 * 1024,
  candidateTaskCount: 1,
  candidateWallTimeMs: 2_000,
  fixtureCases: 64,
  sourceFiles: 128,
  workspaceBytes: 4 * 1024 * 1024,
  workspaceFileBytes: 1024 * 1024,
  workspaceFiles: 256,
});

export const LOCAL_PLUGIN_UNAVAILABLE_CLAIMS = Object.freeze([
  'activation', 'custom-surface', 'drawing', 'indicator', 'network',
  'semantic-type', 'tool', 'worker', 'workflow',
]);

function exactFields(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...fields].sort().join(',');
}

function same(left, right) {
  return canonicalLocalPluginPackageJson(left) === canonicalLocalPluginPackageJson(right);
}

async function hasBoundDigest(value, cryptoPort) {
  if (!value || typeof value !== 'object' || typeof value.digest !== 'string') return false;
  const { digest, ...unsigned } = value;
  return digest === await digestLocalPluginPackageValue(unsigned, cryptoPort);
}

function receiptIdentityMatches(receipt, release) {
  return exactFields(receipt.identities, [
    'catalogs', 'compiler', 'operation', 'schemas', 'sdk', 'simulator', 'toolchain',
  ])
    && exactFields(receipt.identities.catalogs, ['digest', 'version'])
    && exactFields(receipt.identities.operation, ['digest', 'version'])
    && exactFields(receipt.identities.schemas, ['digest', 'version'])
    && exactFields(receipt.identities.sdk, ['digest', 'version'])
    && exactFields(receipt.identities.simulator, ['digest', 'version'])
    && exactFields(receipt.identities.toolchain, ['digest', 'version'])
    && receipt.identities.catalogs.digest === release.catalogDigest
    && receipt.identities.catalogs.version === 1
    && same(receipt.identities.compiler, release.compiler)
    && receipt.identities.operation.digest === release.operationDigest
    && receipt.identities.operation.version === receipt.operationVersion
    && receipt.identities.schemas.digest === release.schemaDigest
    && receipt.identities.schemas.version === 1
    && receipt.identities.sdk.digest === release.sdkDigest
    && receipt.identities.sdk.version === '1.0.0'
    && receipt.identities.simulator.digest === release.simulatorDigest
    && receipt.identities.simulator.version === 1
    && receipt.identities.toolchain.digest === release.toolchainDigest
    && receipt.identities.toolchain.version === 1;
}

async function releaseGateMatches(candidate, release, cryptoPort) {
  if (!exactFields(candidate, [
    'digest', 'files', 'gate', 'harness', 'negativeControls', 'pendingGate',
    'state', 'trustedHarnesses', 'version',
  ]) || !Array.isArray(candidate.files)
    || candidate.digest !== release.conformance.digest
    || await digestLocalPluginPackageValue(candidate.files, cryptoPort) !== candidate.digest) {
    return false;
  }
  const { files: omittedFiles, ...projection } = candidate;
  return omittedFiles.length > 0 && same(projection, release.conformance);
}

function developerReceiptShape(receipt, operation) {
  const contentFields = [...WORKSPACE_IDENTITIES, 'buildDigest'];
  if (operation !== 'build') contentFields.push(`${operation}Digest`);
  const conformanceFields = operation === 'build'
    ? ['negativeControls', 'outcomes', 'releaseGate']
    : ['fixtureOutcomes', 'negativeControls', 'outcomes', 'releaseGate'];
  const outcomes = Object.freeze({
    build: ['strict-typescript:passed', 'static-esm:passed'],
    preview: ['host-shaped-preview:passed', 'host-rendered-controls:passed'],
    test: ['isolated-host:passed', 'determinism:passed', 'expected-output:passed'],
  });
  const classification = operation === 'build' ? 'compiler-only' : 'isolated-developer-test';
  return exactFields(receipt.content, contentFields)
    && Object.values(receipt.content).every((identity) => DIGEST.test(identity))
    && exactFields(receipt.conformance, conformanceFields)
    && Array.isArray(receipt.conformance.negativeControls)
    && receipt.conformance.negativeControls.length === 0
    && same(receipt.conformance.outcomes, outcomes[operation])
    && (operation === 'build' || (Array.isArray(receipt.conformance.fixtureOutcomes)
      && receipt.conformance.fixtureOutcomes.every((outcome) => (
        exactFields(outcome, operation === 'test'
          ? ['caseId', 'fixtureSuiteId', 'outputDigest', 'status']
          : ['caseId', 'fixtureSuiteId', 'status'])
        && typeof outcome.caseId === 'string' && typeof outcome.fixtureSuiteId === 'string'
        && (operation !== 'test' || DIGEST.test(outcome.outputDigest))
        && outcome.status === 'passed'
      ))))
    && exactFields(receipt.execution, [
      'classification', 'determinism', 'limits', 'productionRuntime',
    ])
    && receipt.execution.classification === classification
    && same(receipt.execution.determinism, DETERMINISM)
    && same(receipt.execution.limits, LIMITS)
    && receipt.execution.productionRuntime === false
    && Array.isArray(receipt.diagnosticCodes) && receipt.diagnosticCodes.length === 0
    && Array.isArray(receipt.reviewRequirements) && receipt.reviewRequirements.length === 0;
}

async function verifyDeveloperReceipt(receipt, operation, release, cryptoPort) {
  const fields = [
    'activated', 'conformance', 'content', 'contractProfile', 'diagnosticCodes',
    'digest', 'execution', 'identities', 'installable', 'operation',
    'operationVersion', 'packageId', 'packageVersion',
    'productionExecutionAuthorized', 'publisherTrusted', 'receiptVersion',
    'reviewRequirements', 'schemaVersion',
  ];
  return exactFields(receipt, fields)
    && receipt.schemaVersion === 2 && receipt.receiptVersion === 2
    && receipt.operationVersion === 1 && receipt.operation === operation
    && receipt.contractProfile === PROFILE
    && receipt.installable === false && receipt.activated === false
    && receipt.publisherTrusted === false && receipt.productionExecutionAuthorized === false
    && receiptIdentityMatches(receipt, release)
    && developerReceiptShape(receipt, operation)
    && await releaseGateMatches(receipt.conformance.releaseGate, release, cryptoPort)
    && await hasBoundDigest(receipt, cryptoPort);
}

/** Verify the exact current build/test/preview evidence envelope without executing payload. */
export async function verifyLocalDeveloperEvidenceReceipt(
  receipt,
  release,
  cryptoPort = globalThis.crypto,
) {
  if (!exactFields(receipt, [
    'activated', 'contractProfile', 'digest', 'evidenceKind', 'identities',
    'installableByItself', 'packageId', 'packageVersion',
    'productionExecutionAuthorized', 'publisherTrusted', 'receipts',
    'schemaVersion', 'workspace',
  ])) return false;
  return receipt.schemaVersion === 1 && receipt.evidenceKind === 'p1b-local-developer-evidence'
    && receipt.contractProfile === PROFILE && receipt.installableByItself === false
    && receipt.activated === false && receipt.publisherTrusted === false
    && receipt.productionExecutionAuthorized === false
    && exactFields(receipt.receipts, DEVELOPER_OPERATIONS)
    && exactFields(receipt.identities, ['catalogs', 'operations', 'schemas', 'sdk', 'toolchain'])
    && receipt.identities.catalogs === release.catalogDigest
    && receipt.identities.operations === release.operationDigest
    && receipt.identities.schemas === release.schemaDigest
    && receipt.identities.sdk === release.sdkDigest
    && receipt.identities.toolchain === release.toolchainDigest
    && exactFields(receipt.workspace, WORKSPACE_IDENTITIES)
    && Object.values(receipt.workspace).every((identity) => DIGEST.test(identity))
    && (await Promise.all(DEVELOPER_OPERATIONS.map(async (operation) => {
      const developerReceipt = receipt.receipts[operation];
      return developerReceipt?.packageId === receipt.packageId
        && developerReceipt?.packageVersion === receipt.packageVersion
        && await verifyDeveloperReceipt(developerReceipt, operation, release, cryptoPort);
    }))).every(Boolean)
    && await hasBoundDigest(receipt, cryptoPort);
}

/** Verify one candidate receipt's exact shape, current identities, and explicit denials. */
export async function verifyLocalPackageCandidateReceipt(
  receipt,
  release,
  cryptoPort = globalThis.crypto,
) {
  if (!exactFields(receipt, [
    'activated', 'archive', 'compatibility', 'contractProfile',
    'developerReceiptDigests', 'digest', 'identities', 'installCandidateEligible',
    'installed', 'migrations', 'packageId', 'packageVersion', 'permissions',
    'productionExecutionAuthorized', 'publisherTrusted', 'receiptVersion',
    'schemaVersion', 'settings', 'unavailableClaims',
  ])) return false;
  const identities = receipt.identities;
  return receipt.schemaVersion === 1 && receipt.receiptVersion === 1
    && receipt.contractProfile === PROFILE && receipt.installCandidateEligible === true
    && receipt.installed === false && receipt.activated === false
    && receipt.publisherTrusted === false && receipt.productionExecutionAuthorized === false
    && Array.isArray(receipt.permissions) && receipt.permissions.length === 0
    && Array.isArray(receipt.developerReceiptDigests)
    && receipt.developerReceiptDigests.length === 3
    && new Set(receipt.developerReceiptDigests).size === 3
    && receipt.developerReceiptDigests.every((identity) => DIGEST.test(identity))
    && same(receipt.archive, LOCAL_PLUGIN_ARCHIVE)
    && exactFields(identities, [
      'archiveCatalog', 'contentIndex', 'manifest', 'operations', 'payload',
      'schemas', 'sdk', 'toolchain', 'workspace',
    ])
    && identities.archiveCatalog === release.catalogDigest
    && identities.operations === release.operationDigest
    && identities.schemas === release.schemaDigest
    && identities.sdk === release.sdkDigest
    && identities.toolchain === release.toolchainDigest
    && [identities.contentIndex, identities.manifest, identities.payload]
      .every((identity) => DIGEST.test(identity))
    && exactFields(identities.workspace, WORKSPACE_IDENTITIES)
    && Object.values(identities.workspace).every((identity) => DIGEST.test(identity))
    && same(receipt.unavailableClaims, LOCAL_PLUGIN_UNAVAILABLE_CLAIMS)
    && await hasBoundDigest(receipt, cryptoPort);
}

/** Project the one exact compatibility decision encoded by the local declarative profile. */
export function localPluginPackageCompatibility(release) {
  const unavailableContributions = Object.freeze([
    Object.freeze({ kind: 'drawing', reason: 'No public executable P1a profile.' }),
    Object.freeze({ kind: 'indicator', reason: 'Sub-pane and Worker execution are not authorized.' }),
    Object.freeze({ kind: 'workflow', reason: 'No public executable P1a profile.' }),
    Object.freeze({ kind: 'community', reason: 'P1b installation and P3 execution are not authorized.' }),
  ]);
  return Object.freeze({
    capabilities: Object.freeze({
      deprecated: Object.freeze([]), supported: Object.freeze([]),
      unavailable: LOCAL_PLUGIN_UNAVAILABLE_CLAIMS,
    }),
    contributions: Object.freeze({
      deprecated: Object.freeze([]), supported: Object.freeze([]), unavailable: unavailableContributions,
    }),
    developerBundleOnly: false,
    gates: Object.freeze({
      applicable: Object.freeze([
        'bundle-inspection', 'current-build', 'current-preview', 'current-test',
        'deterministic-archive', 'host-api',
      ]),
      blocked: Object.freeze([]), failed: Object.freeze([]), notApplicable: Object.freeze([]),
      passed: Object.freeze([
        'bundle-inspection', 'current-build', 'current-preview', 'current-test',
        'deterministic-archive', 'host-api',
      ]),
    }),
    humanChoices: Object.freeze([]),
    laterCandidateEligible: true,
    permissions: Object.freeze({ increased: Object.freeze([]), requested: Object.freeze([]) }),
    requested: Object.freeze({
      contractProfile: PROFILE, developerKitVersion: '1.0.0', sdkVersion: '1.0.0',
    }),
    resolved: Object.freeze({
      contractProfile: PROFILE,
      developerKitVersion: '1.0.0',
      productionExecutionTarget: null,
      sdkVersion: '1.0.0',
      toolchain: release.compiler,
    }),
    review: Object.freeze({
      permissionReviewRequired: false, semanticReviewRequired: false, visibleReviewRequired: true,
    }),
    safeFixes: Object.freeze([]),
    schemaVersion: 1,
  });
}
