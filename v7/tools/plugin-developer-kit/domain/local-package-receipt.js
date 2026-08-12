import { canonicalClone, digestValue } from './canonical-json.js';
import { LOCAL_ARCHIVE, LOCAL_CONTRACT_PROFILE } from './contract.js';
import { verifyReceipt } from './receipt.js';

const DEVELOPER_OPERATIONS = Object.freeze(['build', 'preview', 'test']);
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const WORKSPACE_IDENTITIES = Object.freeze([
  'expectedDigest', 'fixtureDigest', 'manifestDigest', 'sourceDigest', 'workspaceDigest',
]);

function exactFields(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...fields].sort().join(',');
}

function signedValue(value) {
  return Object.freeze({ ...canonicalClone(value), digest: digestValue(value) });
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
  const fixtureOutcomes = receipt.conformance?.fixtureOutcomes;
  return exactFields(receipt.content, contentFields)
    && Object.values(receipt.content).every((identity) => DIGEST.test(identity))
    && exactFields(receipt.conformance, conformanceFields)
    && exactFields(receipt.execution, ['classification', 'determinism', 'limits', 'productionRuntime'])
    && receipt.execution.classification === classification
    && receipt.execution.productionRuntime === false
    && Array.isArray(receipt.conformance.negativeControls)
    && receipt.conformance.negativeControls.length === 0
    && JSON.stringify(receipt.conformance.outcomes) === JSON.stringify(outcomes[operation])
    && (operation === 'build' || (Array.isArray(fixtureOutcomes) && fixtureOutcomes.every((outcome) => (
      exactFields(outcome, operation === 'test'
        ? ['caseId', 'fixtureSuiteId', 'outputDigest', 'status']
        : ['caseId', 'fixtureSuiteId', 'status'])
      && typeof outcome.caseId === 'string' && typeof outcome.fixtureSuiteId === 'string'
      && (operation !== 'test' || DIGEST.test(outcome.outputDigest))
      && outcome.status === 'passed'
    ))))
    && Array.isArray(receipt.diagnosticCodes) && receipt.diagnosticCodes.length === 0
    && Array.isArray(receipt.reviewRequirements) && receipt.reviewRequirements.length === 0;
}

export function createLocalDeveloperEvidenceReceipt({ receipts, release, workspace }) {
  const ordered = Object.freeze(Object.fromEntries(DEVELOPER_OPERATIONS.map((operation) => [
    operation,
    receipts[operation],
  ])));
  return signedValue({
    activated: false,
    contractProfile: LOCAL_CONTRACT_PROFILE,
    evidenceKind: 'p1b-local-developer-evidence',
    identities: Object.freeze({
      catalogs: release.catalogDigest,
      operations: release.operationDigest,
      schemas: release.schemaDigest,
      sdk: release.sdkDigest,
      toolchain: release.toolchainDigest,
    }),
    installableByItself: false,
    packageId: workspace.manifest.packageId,
    packageVersion: workspace.manifest.packageVersion,
    productionExecutionAuthorized: false,
    publisherTrusted: false,
    receipts: ordered,
    schemaVersion: 1,
    workspace: workspace.content,
  });
}

export function verifyLocalDeveloperEvidenceReceipt(receipt) {
  if (!exactFields(receipt, [
    'activated', 'contractProfile', 'digest', 'evidenceKind', 'identities',
    'installableByItself', 'packageId', 'packageVersion',
    'productionExecutionAuthorized', 'publisherTrusted', 'receipts',
    'schemaVersion', 'workspace',
  ])) return false;
  const { digest, ...unsigned } = receipt;
  return receipt.schemaVersion === 1
    && receipt.evidenceKind === 'p1b-local-developer-evidence'
    && receipt.contractProfile === LOCAL_CONTRACT_PROFILE
    && receipt.installableByItself === false
    && receipt.activated === false
    && receipt.publisherTrusted === false
    && receipt.productionExecutionAuthorized === false
    && exactFields(receipt.receipts, DEVELOPER_OPERATIONS)
    && exactFields(receipt.identities, ['catalogs', 'operations', 'schemas', 'sdk', 'toolchain'])
    && exactFields(receipt.workspace, WORKSPACE_IDENTITIES)
    && Object.values(receipt.identities).every((identity) => DIGEST.test(identity))
    && Object.values(receipt.workspace).every((identity) => DIGEST.test(identity))
    && DEVELOPER_OPERATIONS.every((operation) => {
      const developerReceipt = receipt.receipts[operation];
      return developerReceipt?.operation === operation
        && developerReceipt.operationVersion === 1
        && developerReceipt.contractProfile === LOCAL_CONTRACT_PROFILE
        && developerReceipt.packageId === receipt.packageId
        && developerReceipt.packageVersion === receipt.packageVersion
        && developerReceiptShape(developerReceipt, operation)
        && exactFields(developerReceipt.identities, [
          'catalogs', 'compiler', 'operation', 'schemas', 'sdk', 'simulator', 'toolchain',
        ])
        && exactFields(developerReceipt.identities.catalogs, ['digest', 'version'])
        && exactFields(developerReceipt.identities.operation, ['digest', 'version'])
        && exactFields(developerReceipt.identities.schemas, ['digest', 'version'])
        && exactFields(developerReceipt.identities.sdk, ['digest', 'version'])
        && exactFields(developerReceipt.identities.simulator, ['digest', 'version'])
        && exactFields(developerReceipt.identities.toolchain, ['digest', 'version'])
        && developerReceipt.identities.catalogs.version === 1
        && developerReceipt.identities.operation.version === 1
        && developerReceipt.identities.schemas.version === 1
        && developerReceipt.identities.sdk.version === '1.0.0'
        && developerReceipt.identities.simulator.version === 1
        && developerReceipt.identities.toolchain.version === 1
        && developerReceipt.identities.catalogs?.digest === receipt.identities.catalogs
        && developerReceipt.identities.operation?.digest === receipt.identities.operations
        && developerReceipt.identities.schemas?.digest === receipt.identities.schemas
        && developerReceipt.identities.sdk?.digest === receipt.identities.sdk
        && developerReceipt.identities.toolchain?.digest === receipt.identities.toolchain
        && verifyReceipt(developerReceipt);
    })
    && digest === digestValue(unsigned);
}

export function createLocalPackageCandidateReceipt({
  compatibility,
  contentIndex,
  developerEvidence,
  manifest,
  release,
  workspace,
}) {
  return signedValue({
    activated: false,
    archive: Object.freeze({ ...LOCAL_ARCHIVE }),
    compatibility,
    contractProfile: LOCAL_CONTRACT_PROFILE,
    developerReceiptDigests: Object.freeze(DEVELOPER_OPERATIONS.map((operation) => (
      developerEvidence.receipts[operation].digest
    )).sort()),
    identities: Object.freeze({
      archiveCatalog: release.catalogDigest,
      contentIndex: digestValue(contentIndex),
      manifest: digestValue(manifest),
      operations: release.operationDigest,
      payload: contentIndex.payloadDigest,
      schemas: release.schemaDigest,
      sdk: release.sdkDigest,
      toolchain: release.toolchainDigest,
      workspace: workspace.content,
    }),
    installCandidateEligible: true,
    installed: false,
    migrations: manifest.persistence.migrations,
    packageId: manifest.packageId,
    packageVersion: manifest.packageVersion,
    permissions: Object.freeze([]),
    productionExecutionAuthorized: false,
    publisherTrusted: false,
    receiptVersion: 1,
    schemaVersion: 1,
    settings: manifest.settings,
    unavailableClaims: Object.freeze([
      'activation', 'custom-surface', 'drawing', 'indicator', 'network',
      'semantic-type', 'tool', 'worker', 'workflow',
    ]),
  });
}

export function verifyLocalPackageCandidateReceipt(receipt) {
  if (!exactFields(receipt, [
    'activated', 'archive', 'compatibility', 'contractProfile',
    'developerReceiptDigests', 'digest', 'identities', 'installCandidateEligible',
    'installed', 'migrations', 'packageId', 'packageVersion', 'permissions',
    'productionExecutionAuthorized', 'publisherTrusted', 'receiptVersion',
    'schemaVersion', 'settings', 'unavailableClaims',
  ])) return false;
  const { digest, ...unsigned } = receipt;
  return receipt.schemaVersion === 1 && receipt.receiptVersion === 1
    && receipt.contractProfile === LOCAL_CONTRACT_PROFILE
    && receipt.installCandidateEligible === true
    && receipt.installed === false && receipt.activated === false
    && receipt.publisherTrusted === false && receipt.productionExecutionAuthorized === false
    && Array.isArray(receipt.permissions) && receipt.permissions.length === 0
    && Array.isArray(receipt.developerReceiptDigests) && receipt.developerReceiptDigests.length === 3
    && new Set(receipt.developerReceiptDigests).size === 3
    && receipt.developerReceiptDigests.every((identity) => DIGEST.test(identity))
    && exactFields(receipt.archive, ['format', 'mediaType', 'suffix', 'version'])
    && exactFields(receipt.identities, [
      'archiveCatalog', 'contentIndex', 'manifest', 'operations', 'payload',
      'schemas', 'sdk', 'toolchain', 'workspace',
    ])
    && exactFields(receipt.identities.workspace, WORKSPACE_IDENTITIES)
    && [
      receipt.identities.archiveCatalog,
      receipt.identities.contentIndex,
      receipt.identities.manifest,
      receipt.identities.operations,
      receipt.identities.payload,
      receipt.identities.schemas,
      receipt.identities.sdk,
      receipt.identities.toolchain,
      ...Object.values(receipt.identities.workspace),
    ].every((identity) => DIGEST.test(identity))
    && receipt.archive?.format === LOCAL_ARCHIVE.format
    && receipt.archive?.mediaType === LOCAL_ARCHIVE.mediaType
    && receipt.archive?.suffix === LOCAL_ARCHIVE.suffix
    && receipt.archive?.version === LOCAL_ARCHIVE.version
    && digest === digestValue(unsigned);
}
