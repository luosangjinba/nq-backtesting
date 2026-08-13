import fs from 'node:fs';
import path from 'node:path';
import {
  CONTRACT_PROFILE,
  CONTRACT_PROFILES,
  DEVELOPER_KIT_VERSION,
  DETERMINISM,
  HOST_API_VERSION,
  LIMITS,
  LOCAL_ARCHIVE,
  LOCAL_CONTRACT_PROFILE,
  SDK_VERSION,
} from '../domain/contract.js';
import { canonicalJson, compareText, digestBytes, digestValue, sha256Bytes } from '../domain/canonical-json.js';
import { fail } from '../domain/diagnostic.js';
import { EXAMPLES_ROOT, SDK_ROOT, TOOL_ROOT, TYPESCRIPT_ROOT, V7_ROOT } from './layout.js';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function relativeFileIdentity(root, file, prefix = '') {
  const bytes = fs.readFileSync(file);
  return {
    path: path.posix.join(prefix, path.relative(root, file).split(path.sep).join('/')),
    sha256: sha256Bytes(bytes),
    size: bytes.length,
  };
}

function listFiles(root, predicate = () => true) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && predicate(target)) files.push(target);
    }
  }
  visit(root);
  return files.sort();
}

function loadSchemaCatalog() {
  const catalog = readJson(path.join(SDK_ROOT, 'catalogs/schema-catalog.json'));
  const seen = new Set();
  const schemas = catalog.schemas.map((entry) => {
    if (seen.has(entry.id)) fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'release', 'Schema catalog ids collide.');
    seen.add(entry.id);
    const absolute = path.resolve(V7_ROOT, entry.path);
    const v7Prefix = `${path.resolve(V7_ROOT)}${path.sep}`;
    if (!absolute.startsWith(v7Prefix) || !fs.statSync(absolute).isFile()) {
      fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'release', 'Schema catalog path is invalid.');
    }
    const value = readJson(absolute);
    return Object.freeze({
      id: entry.id,
      path: entry.path,
      schemaId: value.$id,
      sha256: sha256Bytes(fs.readFileSync(absolute)),
      value,
    });
  }).sort((a, b) => compareText(a.id, b.id));
  return Object.freeze({ catalog, schemas: Object.freeze(schemas) });
}

function verifyCompiler(toolchain) {
  const packageValue = readJson(path.join(TYPESCRIPT_ROOT, 'package.json'));
  const lock = readJson(path.join(V7_ROOT, 'package-lock.json'));
  const locked = lock.packages?.['node_modules/typescript'];
  const expected = toolchain.compiler;
  if (packageValue.version !== expected.version || packageValue.license !== expected.license
    || locked?.version !== expected.version || locked?.integrity !== expected.integrity) {
    fail('internal', 'V7DK_INTEGRITY_MISMATCH', 'release', 'Pinned TypeScript identity does not match the catalog.');
  }
  if (!Array.isArray(expected.dependencies)
    || JSON.stringify(expected.dependencies.map(({ package: packageId }) => packageId).sort())
      !== JSON.stringify(Object.keys(packageValue.optionalDependencies ?? {}).sort())) {
    fail('internal', 'V7DK_INTEGRITY_MISMATCH', 'release', 'Pinned TypeScript dependency inventory is incomplete.');
  }
  const dependencies = expected.dependencies.map((dependency) => {
    const dependencyLock = lock.packages?.[`node_modules/${dependency.package}`];
    if (dependencyLock?.version !== dependency.version
      || dependencyLock?.integrity !== dependency.integrity
      || dependencyLock?.license !== dependency.license
      || dependencyLock?.optional !== dependency.optional
      || packageValue.optionalDependencies?.[dependency.package] !== dependency.version) {
      fail('internal', 'V7DK_INTEGRITY_MISMATCH', 'release', 'Pinned TypeScript dependency identity does not match the catalog.');
    }
    return Object.freeze({ ...dependency });
  });
  return Object.freeze({
    dependencies: Object.freeze(dependencies),
    integrity: expected.integrity,
    license: expected.license,
    package: expected.package,
    version: expected.version,
  });
}

function verifyLocalPackageCatalog(catalogs) {
  const catalog = catalogs.find(({ path: logicalPath }) => logicalPath === 'catalogs/local-packages.json')?.value;
  const expectedArchive = {
    compression: 'none',
    format: LOCAL_ARCHIVE.format,
    limits: {
      maxEntries: LIMITS.archiveEntries,
      maxEntryBytes: LIMITS.archiveEntryBytes,
      maxUnpackedBytes: LIMITS.archiveUnpackedBytes,
    },
    mediaType: LOCAL_ARCHIVE.mediaType,
    opaqueArchiveSuffixes: [],
    suffix: LOCAL_ARCHIVE.suffix,
    version: LOCAL_ARCHIVE.version,
  };
  if (catalog?.schemaVersion !== 1 || catalog.profile !== LOCAL_CONTRACT_PROFILE
    || canonicalJson(catalog.archive) !== canonicalJson(expectedArchive)) {
    fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'release', 'Local package archive catalog is invalid.');
  }
  return catalog;
}

function conformanceIdentity() {
  const relativePaths = [
    'docs/V7_AGENT_NATIVE_PLUGIN_DEVELOPER_KIT_P1A.md',
    'docs/v7-harness-rules.json',
    'sessions/session_20260811_p1a_agent_native_developer_kit_implementation.md',
    'tests/fixtures/plugin-developer-kit/negative/cases.json',
    'tests/plugin-developer-kit-harness.js',
    'docs/V7_LOCAL_PLUGIN_PACKAGES_AUTHORING_MCP_P1B.md',
    'docs/V7_LOCAL_PLUGIN_PACKAGE_P1B3_HUMAN_REVIEW.md',
    'tests/fixtures/local-plugin-package/negative/cases.json',
    'tests/fixtures/local-plugin-package/transaction-negative/cases.json',
    'tests/fixtures/local-plugin-package/unpacked-security-negative/cases.json',
    'tests/fixtures/local-plugin-package/storage-browser/index.html',
    'tests/fixtures/local-plugin-package/storage-browser/main.js',
    'tests/fixtures/local-plugin-package/product-browser/index.html',
    'tests/fixtures/local-plugin-package/product-browser/scenario.js',
    'tests/fixtures/local-plugin-package/product-browser/styles.css',
    'tests/local-plugin-package-contract-suite.js',
    'tests/local-plugin-package-unpacked-security-suite.js',
    'tests/local-plugin-package-harness.js',
    'tests/local-plugin-package-product-browser-suite.js',
    'tests/local-plugin-package-storage-browser-suite.js',
    'tests/local-plugin-package-transaction-suite.js',
    'tests/support/local-plugin-package-fixture.js',
    'src/plugin-center-ui/public.js',
    'src/plugin-center-ui/plugin-center-workspace-control.js',
    'src/plugin-center-ui/local-package-browser-adapter.js',
    'src/plugin-center-ui/local-package-installed-control.js',
    'tools/plugin-developer-kit/adapters/unpacked-candidate-inspection.js',
    'scripts/refresh-plugin-package-browser-release.mjs',
    'scripts/review-local-plugin-package-p1b3.mjs',
    'sessions/session_20260812_p1b_2_inventory_transaction_implementation.md',
    'sessions/session_20260812_p1b_3_plugin_center_developer_mode_implementation.md',
    'sessions/session_20260812_p1b_3_developer_mode_surface_removal.md',
  ];
  const files = relativePaths.map((logicalPath) => relativeFileIdentity(
    V7_ROOT,
    path.join(V7_ROOT, ...logicalPath.split('/')),
  ));
  const negativeControls = readJson(path.join(
    V7_ROOT,
    'tests/fixtures/plugin-developer-kit/negative/cases.json',
  )).map(({ case: id, expectedDiagnostic }) => ({ expectedDiagnostic, id }));
  const harnessRules = readJson(path.join(V7_ROOT, 'docs/v7-harness-rules.json'));
  const rule = harnessRules.rules.find(({ id }) => id === 'H116');
  const pendingRule = harnessRules.rules.find(({ id }) => id === 'H117');
  if (harnessRules.currentStep !== 'P1b.3' || rule?.state !== 'accepted'
    || rule.harness !== 'tests/plugin-developer-kit-harness.js'
    || rule.acceptanceEvidence
      !== 'sessions/session_20260811_p1a_agent_native_developer_kit_implementation.md'
    || rule.humanReviewRequired !== false
    || !rule.negativeFixtures.includes('tests/fixtures/plugin-developer-kit/negative/cases.json')
    || pendingRule?.activationStep !== 'P1b.3' || pendingRule?.state !== 'executable'
    || pendingRule.harness !== 'tests/local-plugin-package-harness.js'
    || pendingRule.humanReviewRequired !== true || pendingRule.acceptanceEvidence !== null
    || !pendingRule.negativeFixtures.includes('tests/fixtures/local-plugin-package/negative/cases.json')
    || !pendingRule.negativeFixtures.includes('tests/fixtures/local-plugin-package/transaction-negative/cases.json')
    || !pendingRule.negativeFixtures.includes('tests/fixtures/local-plugin-package/unpacked-security-negative/cases.json')) {
    fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'release', 'Developer Kit conformance identity is incomplete.');
  }
  return Object.freeze({
    digest: digestValue(files),
    files: Object.freeze(files),
    gate: 'H116',
    harness: 'tests/plugin-developer-kit-harness.js',
    negativeControls: Object.freeze(negativeControls),
    pendingGate: Object.freeze({
      gate: 'H117',
      harness: pendingRule.harness,
      negativeControlCount: [
        'tests/fixtures/local-plugin-package/negative/cases.json',
        'tests/fixtures/local-plugin-package/transaction-negative/cases.json',
        'tests/fixtures/local-plugin-package/unpacked-security-negative/cases.json',
      ].reduce((total, logicalPath) => total + readJson(path.join(V7_ROOT, logicalPath)).length, 0),
      scope: 'P1b.1-contract-archive-plus-P1b.2-transactions-recovery-plus-P1b.3-two-surface-product-and-unpacked-security',
      state: pendingRule.state,
    }),
    state: rule.state,
    trustedHarnesses: Object.freeze([
      'tests/plugin-contract-substrate-harness.js',
      'tests/fair-value-gap-semantic-package-harness.js',
    ]),
    version: 1,
  });
}

let cached;

/** Read and integrity-check the one content-addressed P1a SDK/tool release. */
export function loadReleaseCatalog({ refresh = false } = {}) {
  if (cached && !refresh) return cached;
  const catalogFiles = listFiles(path.join(SDK_ROOT, 'catalogs'), (file) => file.endsWith('.json'));
  const catalogs = catalogFiles.map((file) => ({
    ...relativeFileIdentity(SDK_ROOT, file),
    value: readJson(file),
  }));
  const toolchain = catalogs.find(({ path: logicalPath }) => logicalPath === 'catalogs/toolchain.json')?.value;
  if (!toolchain || toolchain.developerKitVersion !== DEVELOPER_KIT_VERSION
    || toolchain.sdkVersion !== SDK_VERSION || toolchain.hostApiVersion !== HOST_API_VERSION) {
    fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'release', 'Toolchain catalog identity is invalid.');
  }
  const compiler = verifyCompiler(toolchain);
  const localPackageCatalog = verifyLocalPackageCatalog(catalogs);
  const schemaCatalog = loadSchemaCatalog();
  const sdkFiles = listFiles(SDK_ROOT, (file) => (
    !file.includes(`${path.sep}examples${path.sep}`)
  )).map((file) => relativeFileIdentity(SDK_ROOT, file));
  const operationFiles = [
    ...listFiles(TOOL_ROOT, (file) => file.endsWith('.js'))
      .map((file) => relativeFileIdentity(TOOL_ROOT, file, 'tools')),
    ...listFiles(path.join(V7_ROOT, 'src/plugin-contract'), (file) => file.endsWith('.js'))
      .map((file) => relativeFileIdentity(V7_ROOT, file)),
  ].sort((left, right) => compareText(left.path, right.path));
  const exampleFiles = fs.existsSync(path.join(SDK_ROOT, 'examples'))
    ? listFiles(path.join(SDK_ROOT, 'examples')).map((file) => (
      relativeFileIdentity(path.join(SDK_ROOT, 'examples'), file, 'examples')
    )) : [];
  const catalogIdentity = catalogs.map(({ path: logicalPath, sha256, size }) => ({
    path: logicalPath, sha256, size,
  }));
  const schemaIdentity = schemaCatalog.schemas.map(({ id, path: logicalPath, schemaId, sha256 }) => ({
    id, path: logicalPath, schemaId, sha256,
  }));
  const sdkDigest = digestValue(sdkFiles);
  const schemaDigest = digestValue(schemaIdentity);
  const catalogDigest = digestValue(catalogIdentity);
  const operationDigest = digestValue(operationFiles);
  const conformance = conformanceIdentity();
  const simulatorFiles = operationFiles.filter(({ path: logicalPath }) => (
    logicalPath.includes('isolated') || logicalPath.includes('synthetic')
  ));
  const simulatorDigest = digestValue({
    determinism: DETERMINISM,
    files: simulatorFiles,
    limits: LIMITS,
  });
  const toolchainDigest = digestValue({
    catalogDigest,
    compiler,
    conformanceDigest: conformance.digest,
    operationDigest,
    schemaDigest,
    sdkDigest,
    toolchain,
  });
  cached = Object.freeze({
    catalogDigest,
    catalogs: Object.freeze(catalogs),
    compiler,
    conformance,
    contractProfile: CONTRACT_PROFILE,
    exampleFiles: Object.freeze(exampleFiles),
    operationDigest,
    operationFiles: Object.freeze(operationFiles),
    localPackageCatalog,
    schemaCatalog: schemaCatalog.catalog,
    schemaDigest,
    schemas: schemaCatalog.schemas,
    sdkDigest,
    sdkFiles: Object.freeze(sdkFiles),
    simulatorDigest,
    toolchain,
    toolchainDigest,
  });
  return cached;
}

export function discoverRelease(release = loadReleaseCatalog()) {
  return Object.freeze({
    catalogs: release.catalogs.map(({ path: logicalPath, sha256, size, value }) => ({
      path: logicalPath, sha256, size, value,
    })),
    contractProfiles: CONTRACT_PROFILES,
    developerKitVersion: DEVELOPER_KIT_VERSION,
    examples: release.exampleFiles.map((identity) => ({
      ...identity,
      content: fs.readFileSync(path.join(EXAMPLES_ROOT, ...identity.path.replace(/^examples\//u, '').split('/')), 'utf8'),
    })),
    identities: {
      catalogs: release.catalogDigest,
      conformance: release.conformance.digest,
      operations: release.operationDigest,
      schemas: release.schemaDigest,
      sdk: release.sdkDigest,
      simulator: release.simulatorDigest,
      toolchain: release.toolchainDigest,
    },
    limits: LIMITS,
    conformance: release.conformance,
    schemas: release.schemas.map(({ id, path: logicalPath, schemaId, sha256, value }) => ({
      id, path: logicalPath, schemaId, sha256, value,
    })),
    sdkFiles: release.sdkFiles.map((identity) => ({
      ...identity,
      content: fs.readFileSync(path.join(SDK_ROOT, ...identity.path.split('/')), 'utf8'),
    })),
    sdkVersion: SDK_VERSION,
    toolchain: release.toolchain,
  });
}

export function canonicalReleaseJson(release = loadReleaseCatalog()) {
  return canonicalJson(discoverRelease(release));
}

export function releaseBytesDigest(release = loadReleaseCatalog()) {
  return digestBytes(canonicalReleaseJson(release));
}
