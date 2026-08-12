import {
  createLocalPluginPackageCandidatePlan,
  defineLocalPluginPackageManifest,
  readLocalPluginPackageCandidatePlan,
  readLocalPluginPackageManifest,
} from '../../../src/plugin-contract/public.js';
import { canonicalJson, compareText, digestValue, sha256Bytes } from '../domain/canonical-json.js';
import { compatibilityReport } from '../domain/compatibility.js';
import {
  DETERMINISM,
  LIMITS,
  LOCAL_ARCHIVE,
  LOCAL_CONTRACT_PROFILE,
} from '../domain/contract.js';
import { fail } from '../domain/diagnostic.js';
import {
  verifyLocalDeveloperEvidenceReceipt,
  verifyLocalPackageCandidateReceipt,
} from '../domain/local-package-receipt.js';
import { parseTar } from './tar.js';

const REQUIRED_PATHS = Object.freeze([
  'content-index.json',
  'provenance/source-disclosure.json',
  'receipts/developer-kit.json',
  'receipts/package-candidate.json',
  'v7-package.json',
]);
const NESTED_ARCHIVE = /\.(?:7z|gz|rar|tar|tgz|v7dk\.tar|v7plugin|zip)$/iu;
const AUTHORING_SOURCE = /^[a-z][a-z0-9.-]{0,159}$/u;
const UNAVAILABLE_CLAIMS = Object.freeze([
  'activation', 'custom-surface', 'drawing', 'indicator', 'network',
  'semantic-type', 'tool', 'worker', 'workflow',
]);

function jsonBytes(value) {
  return Buffer.from(`${canonicalJson(value)}\n`);
}

function parseJson(map, logicalPath) {
  const bytes = map.get(logicalPath);
  if (!bytes) fail('candidate', 'V7DK_PACKAGE_LAYOUT_INVALID', 'inspect', 'Required package metadata is missing.', { logicalPath });
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    if (!bytes.equals(jsonBytes(value))) throw new TypeError('non-canonical');
    return value;
  } catch {
    fail('candidate', 'V7DK_PACKAGE_FORMAT_MISMATCH', 'inspect', 'Package metadata is malformed or non-canonical.', { logicalPath });
  }
}

function hasArchiveMagic(bytes) {
  return [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ].some((magic) => bytes.subarray(0, 4).equals(Buffer.from(magic)))
    || bytes.subarray(0, 2).equals(Buffer.from([0x1f, 0x8b]))
    || bytes.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))
    || bytes.subarray(0, 7).equals(Buffer.from('Rar!\x1a\x07', 'binary'))
    || bytes.subarray(257, 262).equals(Buffer.from('ustar', 'ascii'));
}

function validateIndexRecords(index) {
  const indexFields = [
    'archiveFormatVersion', 'contentDigest', 'files', 'packageId',
    'packageVersion', 'payloadDigest', 'schemaVersion',
  ];
  if (!index || typeof index !== 'object' || Array.isArray(index)
    || Object.keys(index).sort().join(',') !== indexFields.sort().join(',')
    || index.schemaVersion !== 1 || index.archiveFormatVersion !== LOCAL_ARCHIVE.version
    || !Array.isArray(index.files) || index.files.length < 5
    || index.files.some((record) => (
      !record || typeof record !== 'object' || Array.isArray(record)
      || Object.keys(record).sort().join(',') !== 'path,sha256,size'
      || typeof record.path !== 'string' || typeof record.sha256 !== 'string'
      || !/^[0-9a-f]{64}$/u.test(record.sha256)
      || !Number.isSafeInteger(record.size) || record.size < 0
    ))) {
    fail('candidate', 'V7DK_PACKAGE_INDEX_INVALID', 'inspect', 'Local package content index is invalid.');
  }
}

function validateIndexedEntries(entries, index, map) {
  validateIndexRecords(index);
  const indexedPaths = index.files.map(({ path: logicalPath }) => logicalPath);
  if (new Set(indexedPaths).size !== indexedPaths.length
    || canonicalJson(indexedPaths) !== canonicalJson([...indexedPaths].sort())
    || !indexedPaths.some((logicalPath) => logicalPath.startsWith('payload/build/'))) {
    fail('candidate', 'V7DK_PACKAGE_INDEX_INVALID', 'inspect', 'Content index paths must be unique, sorted, and include build payload.');
  }
  const expectedPaths = [...indexedPaths, 'content-index.json', 'receipts/package-candidate.json'].sort();
  const actualPaths = entries.map(({ path: logicalPath }) => logicalPath).sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(actualPaths)
    || REQUIRED_PATHS.some((logicalPath) => !actualPaths.includes(logicalPath))) {
    fail('candidate', 'V7DK_PACKAGE_LAYOUT_INVALID', 'inspect', 'Package contains an undeclared or missing entry.');
  }
  for (const record of index.files) {
    const bytes = map.get(record.path);
    if (!bytes || record.size !== bytes.length || record.sha256 !== sha256Bytes(bytes)) {
      fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'inspect', 'Package content index detects changed bytes.', {
        logicalPath: record.path,
      });
    }
  }
  if (index.contentDigest !== digestValue(index.files)
    || index.payloadDigest !== digestValue(index.files.filter(({ path: logicalPath }) => logicalPath.startsWith('payload/')))) {
    fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'inspect', 'Package content or payload digest is stale.');
  }
  if (indexedPaths.some((logicalPath) => logicalPath.startsWith('payload/')
    && (NESTED_ARCHIVE.test(logicalPath) || hasArchiveMagic(map.get(logicalPath))))) {
    fail('candidate', 'V7DK_PACKAGE_LAYOUT_INVALID', 'inspect', 'Nested archive payloads are unavailable in this profile.');
  }
}

function evidenceMatchesIndex(developerEvidence, index) {
  const payloadBuildDigest = digestValue(index.files
    .filter(({ path: logicalPath }) => logicalPath.startsWith('payload/build/'))
    .map(({ path: logicalPath, sha256, size }) => ({
      logicalPath: logicalPath.replace(/^payload\//u, ''), sha256, size,
    })));
  const workspaceFields = [
    'expectedDigest', 'fixtureDigest', 'manifestDigest', 'sourceDigest', 'workspaceDigest',
  ];
  return Object.values(developerEvidence.receipts ?? {}).every((receipt) => (
    workspaceFields.every((field) => receipt.content?.[field] === developerEvidence.workspace?.[field])
    && receipt.content?.buildDigest === payloadBuildDigest
  ));
}

function requireReceiptBindings({ candidateReceipt, developerEvidence, index, manifest, release }) {
  if (!verifyLocalDeveloperEvidenceReceipt(developerEvidence)
    || !evidenceMatchesIndex(developerEvidence, index)
    || !verifyLocalPackageCandidateReceipt(candidateReceipt)
    || manifest.packageId !== index.packageId || manifest.packageVersion !== index.packageVersion
    || candidateReceipt.packageId !== manifest.packageId || candidateReceipt.packageVersion !== manifest.packageVersion
    || candidateReceipt.identities.manifest !== digestValue(manifest)
    || candidateReceipt.identities.contentIndex !== digestValue(index)
    || candidateReceipt.identities.payload !== index.payloadDigest
    || developerEvidence.packageId !== manifest.packageId
    || developerEvidence.packageVersion !== manifest.packageVersion
    || canonicalJson(candidateReceipt.identities.workspace) !== canonicalJson(developerEvidence.workspace)
    || canonicalJson(candidateReceipt.developerReceiptDigests)
      !== canonicalJson(Object.values(developerEvidence.receipts).map(({ digest }) => digest).sort())
    || canonicalJson(manifest.conformance.requiredReceiptDigests)
      !== canonicalJson(candidateReceipt.developerReceiptDigests)) {
    fail('candidate', 'V7DK_PACKAGE_RECEIPT_STALE', 'inspect', 'Package receipts are forged, stale, or bound to different content.');
  }
  const nestedReceipts = Object.values(developerEvidence.receipts ?? {});
  if (release && (candidateReceipt.identities.toolchain !== release.toolchainDigest
    || candidateReceipt.identities.archiveCatalog !== release.catalogDigest
    || candidateReceipt.identities.operations !== release.operationDigest
    || candidateReceipt.identities.schemas !== release.schemaDigest
    || candidateReceipt.identities.sdk !== release.sdkDigest
    || developerEvidence.identities.catalogs !== release.catalogDigest
    || developerEvidence.identities.operations !== release.operationDigest
    || developerEvidence.identities.schemas !== release.schemaDigest
    || developerEvidence.identities.sdk !== release.sdkDigest
    || developerEvidence.identities.toolchain !== release.toolchainDigest
    || nestedReceipts.some((receipt) => (
      canonicalJson(receipt.identities.compiler) !== canonicalJson(release.compiler)
      || receipt.identities.simulator.digest !== release.simulatorDigest
      || canonicalJson(receipt.conformance.releaseGate) !== canonicalJson(release.conformance)
      || canonicalJson(receipt.execution.determinism) !== canonicalJson(DETERMINISM)
      || canonicalJson(receipt.execution.limits) !== canonicalJson(LIMITS)
    )))) {
    fail('candidate', 'V7DK_PACKAGE_RECEIPT_STALE', 'inspect', 'Package receipts target a different Developer Kit release.');
  }
  if (manifest.conformance.toolchainDigest !== candidateReceipt.identities.toolchain) {
    fail('candidate', 'V7DK_PACKAGE_RECEIPT_STALE', 'inspect', 'Manifest and candidate receipt toolchain identities differ.');
  }
}

function requireDecisionBindings(candidateReceipt, manifest, release) {
  const expectedCompatibility = compatibilityReport({
    gates: {
      applicable: ['current-build', 'current-preview', 'current-test', 'host-api', 'deterministic-archive', 'bundle-inspection'],
      passed: ['current-build', 'current-preview', 'current-test', 'host-api', 'deterministic-archive', 'bundle-inspection'],
    },
    requested: { contractProfile: LOCAL_CONTRACT_PROFILE },
    toolchain: release?.compiler,
  });
  if (canonicalJson(candidateReceipt.settings) !== canonicalJson(manifest.settings)
    || canonicalJson(candidateReceipt.migrations) !== canonicalJson(manifest.persistence.migrations)
    || candidateReceipt.permissions.length !== 0
    || canonicalJson(candidateReceipt.unavailableClaims) !== canonicalJson(UNAVAILABLE_CLAIMS)
    || canonicalJson(candidateReceipt.compatibility) !== canonicalJson(expectedCompatibility)) {
    fail('candidate', 'V7DK_PACKAGE_RECEIPT_STALE', 'inspect', 'Candidate receipt decisions do not match the validated package.');
  }
}

function requireDisclosure(map, manifest, index) {
  if (!map.has(manifest.license.noticePath)
    || index.files.filter(({ path: logicalPath }) => !logicalPath.startsWith('payload/')).some(({ path: logicalPath }) => (
      !['v7-package.json', 'provenance/source-disclosure.json', 'receipts/developer-kit.json', manifest.license.noticePath]
        .includes(logicalPath)
    ))) {
    fail('candidate', 'V7DK_PACKAGE_LAYOUT_INVALID', 'inspect', 'Package notice or metadata layout is invalid.');
  }
  const disclosure = parseJson(map, 'provenance/source-disclosure.json');
  const fields = [
    'absolutePathsIncluded', 'authoringSource', 'credentialsIncluded', 'license',
    'networkDerived', 'packageId', 'payloadExecutionAuthorized',
    'publisherVerification', 'schemaVersion', 'sourceIncluded',
  ];
  if (!disclosure || typeof disclosure !== 'object' || Array.isArray(disclosure)
    || Object.keys(disclosure).sort().join(',') !== fields.sort().join(',')
    || disclosure.schemaVersion !== 1 || disclosure.packageId !== manifest.packageId
    || disclosure.license !== manifest.license.expression
    || disclosure.credentialsIncluded !== false || disclosure.sourceIncluded !== false
    || disclosure.absolutePathsIncluded !== false || disclosure.payloadExecutionAuthorized !== false
    || disclosure.publisherVerification !== 'self-asserted'
    || typeof disclosure.networkDerived !== 'boolean' || typeof disclosure.authoringSource !== 'string'
    || !AUTHORING_SOURCE.test(disclosure.authoringSource)) {
    fail('candidate', 'V7DK_PACKAGE_PROVENANCE_INVALID', 'inspect', 'Package source disclosure increases authority or mismatches the manifest.');
  }
}

function preparedCandidate(entries, manifest, candidateReceipt, index, release) {
  if (!release?.toolchain?.hostApiVersion) {
    fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'inspect', 'Local package inspection requires a host API identity.');
  }
  if (manifest.conformance.sdkVersion !== release.toolchain.sdkVersion) {
    fail('candidate', 'V7DK_SDK_UNSUPPORTED', 'inspect', 'Local package targets an unsupported Plugin SDK version.');
  }
  const snapshotDigest = digestValue([...entries]
    .sort((left, right) => compareText(left.path, right.path))
    .map(({ bytes, path: logicalPath }) => ({
      path: logicalPath,
      sha256: sha256Bytes(bytes),
      size: bytes.length,
    })));
  try {
    const packageCandidate = readLocalPluginPackageCandidatePlan(createLocalPluginPackageCandidatePlan(
      defineLocalPluginPackageManifest(manifest),
      {
        candidateDigest: candidateReceipt.digest,
        contentDigest: index.contentDigest,
        hostApiVersion: release.toolchain.hostApiVersion,
        manifestDigest: candidateReceipt.identities.manifest,
        source: { digest: snapshotDigest, kind: 'developer-unpacked' },
      },
    ));
    return Object.freeze({ packageCandidate, snapshotDigest });
  } catch (error) {
    const sourceCode = error?.code ?? '';
    fail(
      'candidate',
      sourceCode === 'PLUGIN_LOCAL_PACKAGE_HOST_INCOMPATIBLE'
        ? 'V7DK_HOST_INCOMPATIBLE' : 'V7DK_PACKAGE_RECEIPT_STALE',
      'inspect',
      'Local package cannot form a compatible inactive candidate.',
      { related: sourceCode ? [{ sourceCode }] : [] },
    );
  }
}

/** Inspect one canonical local-package entry set without extracting or evaluating payload. */
export function inspectLocalPackageEntries(entries, release) {
  if (!Array.isArray(entries) || entries.some((entry) => (
    !entry || typeof entry.path !== 'string' || !Buffer.isBuffer(entry.bytes)
  ))) {
    fail('candidate', 'V7DK_PACKAGE_LAYOUT_INVALID', 'inspect', 'Local package entries are malformed.');
  }
  if (entries.length > LIMITS.archiveEntries
    || entries.some(({ bytes }) => bytes.length > LIMITS.archiveEntryBytes)
    || entries.reduce((total, { bytes }) => total + bytes.length, 0) > LIMITS.archiveUnpackedBytes) {
    fail('candidate', 'V7DK_RESOURCE_LIMIT', 'inspect', 'Local package entries exceed the bounded candidate limits.');
  }
  const map = new Map(entries.map(({ bytes, path: logicalPath }) => [logicalPath, bytes]));
  if (map.has('v7dk.bundle.json') || map.has('v7dk.index.json')) {
    fail('candidate', 'V7DK_PACKAGE_FORMAT_MISMATCH', 'inspect', 'A P1a developer evidence bundle is not a local install archive.');
  }
  const index = parseJson(map, 'content-index.json');
  validateIndexedEntries(entries, index, map);
  const manifestWire = parseJson(map, 'v7-package.json');
  let manifest;
  try {
    manifest = readLocalPluginPackageManifest(defineLocalPluginPackageManifest(manifestWire));
    if (canonicalJson(manifestWire) !== canonicalJson(manifest)) throw new TypeError('non-canonical manifest');
  } catch (error) {
    fail('candidate', 'V7DK_MANIFEST_INVALID', 'inspect', 'Package Manifest V2 is invalid.', {
      related: error?.code ? [{ sourceCode: error.code }] : [],
    });
  }
  const developerEvidence = parseJson(map, 'receipts/developer-kit.json');
  const candidateReceipt = parseJson(map, 'receipts/package-candidate.json');
  requireReceiptBindings({ candidateReceipt, developerEvidence, index, manifest, release });
  requireDecisionBindings(candidateReceipt, manifest, release);
  requireDisclosure(map, manifest, index);
  return Object.freeze({
    candidateReceipt,
    developerEvidence,
    index,
    manifest,
    ...preparedCandidate(entries, manifest, candidateReceipt, index, release),
  });
}

/** Parse and inspect bounded local archive bytes entirely in memory. */
export function inspectLocalPackageBytes(bytes, release) {
  const entries = parseTar(bytes);
  const inspected = inspectLocalPackageEntries(entries, release);
  const archiveDigest = `sha256:${sha256Bytes(bytes)}`;
  const plan = readLocalPluginPackageCandidatePlan(createLocalPluginPackageCandidatePlan(
    defineLocalPluginPackageManifest(inspected.manifest),
    {
      candidateDigest: inspected.candidateReceipt.digest,
      contentDigest: inspected.index.contentDigest,
      hostApiVersion: release.toolchain.hostApiVersion,
      manifestDigest: inspected.candidateReceipt.identities.manifest,
      source: { digest: archiveDigest, kind: 'local-archive' },
    },
  ));
  return Object.freeze({
    archiveDigest,
    entryCount: entries.length,
    installCandidateEligible: true,
    mediaType: LOCAL_ARCHIVE.mediaType,
    packageCandidate: plan,
  });
}
