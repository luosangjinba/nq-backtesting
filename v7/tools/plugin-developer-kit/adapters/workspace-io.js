import fs from 'node:fs';
import path from 'node:path';
import { LIMITS } from '../domain/contract.js';
import { compareText, digestValue, sha256Bytes } from '../domain/canonical-json.js';
import { DeveloperKitFailure, diagnostic, fail } from '../domain/diagnostic.js';
import { scanTypeScriptSource } from '../domain/static-analysis.js';
import { readExpectedSuite, readFixtureSuite } from '../domain/synthetic-contract.js';
import { readProfileManifest } from './p0a-contract.js';
import { readLocalProfileManifest } from './local-contract.js';
import { LOGICAL } from './layout.js';

const WORKSPACE_FIELDS = new Set([
  'contractProfile', 'developerKitRange', 'entrypoints', 'expectedOutputs', 'fixtureSuites',
  'manifestPath', 'schemaVersion', 'sdkRange', 'sourceRoot',
]);
const ID = /^[a-z][a-z0-9.-]{0,127}$/u;
const PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[A-Za-z0-9._/-]+$/u;

function exact(value, fields, label, logicalPath) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', `${label} must be an object.`, { logicalPath });
  }
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (actual.join(',') !== expected.join(',')) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', `${label} fields are invalid.`, {
      logicalPath,
      related: [{ actual, expected }],
    });
  }
}

export function readLogicalPath(value, label = 'Workspace path') {
  if (typeof value !== 'string' || value.length === 0 || value.length > 240
    || value.includes('\\') || value.includes('\0') || !PATH.test(value)
    || path.posix.normalize(value) !== value || value === '.' || path.posix.isAbsolute(value)) {
    fail('candidate', 'V7DK_WORKSPACE_PATH_ESCAPE', 'workspace', `${label} is not a normalized workspace-relative path.`);
  }
  return value;
}

function inside(root, logicalPath) {
  const target = path.resolve(root, ...logicalPath.split('/'));
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!target.startsWith(prefix)) {
    fail('candidate', 'V7DK_WORKSPACE_PATH_ESCAPE', 'workspace', 'Workspace path escapes its explicit root.', {
      logicalPath,
    });
  }
  return target;
}

function requireRegularFile(root, logicalPath) {
  const safePath = readLogicalPath(logicalPath);
  const resolvedRoot = path.resolve(root);
  let target = resolvedRoot;
  let stats;
  for (const segment of safePath.split('/')) {
    target = path.join(target, segment);
    try { stats = fs.lstatSync(target); } catch {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'A declared workspace file is missing.', { logicalPath: safePath });
    }
    if (stats.isSymbolicLink()) {
      fail('candidate', 'V7DK_WORKSPACE_PATH_ESCAPE', 'workspace', 'Workspace symlinks are forbidden.', { logicalPath: safePath });
    }
  }
  if (!stats.isFile()) {
    fail('candidate', 'V7DK_WORKSPACE_SPECIAL_FILE', 'workspace', 'Workspace paths must name regular files.', { logicalPath: safePath });
  }
  if (stats.size > LIMITS.workspaceFileBytes) {
    fail('candidate', 'V7DK_RESOURCE_LIMIT', 'workspace', 'A workspace file exceeds the byte limit.', { logicalPath: safePath });
  }
  return target;
}

function readJson(root, logicalPath) {
  const target = requireRegularFile(root, logicalPath);
  try { return JSON.parse(fs.readFileSync(target, 'utf8')); } catch {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'Workspace JSON is malformed.', { logicalPath });
  }
}

function collectEntries(root) {
  const entries = [];
  let totalBytes = 0;
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      const logicalPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const target = path.join(directory, entry.name);
      const stats = fs.lstatSync(target);
      if (stats.isSymbolicLink()) {
        fail('candidate', 'V7DK_WORKSPACE_PATH_ESCAPE', 'workspace', 'Workspace symlinks are forbidden.', { logicalPath });
      }
      if (stats.isDirectory()) visit(target, logicalPath);
      else if (stats.isFile()) {
        if (stats.size > LIMITS.workspaceFileBytes) {
          fail('candidate', 'V7DK_RESOURCE_LIMIT', 'workspace', 'A workspace file exceeds the byte limit.', { logicalPath });
        }
        totalBytes += stats.size;
        entries.push({ logicalPath, target });
      } else {
        fail('candidate', 'V7DK_WORKSPACE_SPECIAL_FILE', 'workspace', 'Special workspace files are forbidden.', { logicalPath });
      }
    }
  }
  visit(root);
  if (entries.length > LIMITS.workspaceFiles || totalBytes > LIMITS.workspaceBytes) {
    fail('candidate', 'V7DK_RESOURCE_LIMIT', 'workspace', 'Workspace count or unpacked bytes exceed P1a limits.');
  }
  return entries;
}

function pathRecords(values, fields, label) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 32) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', `${label} must be a bounded non-empty array.`);
  }
  const ids = new Set();
  const paths = new Set();
  const idField = fields.includes('id') ? 'id' : 'fixtureSuiteId';
  return values.map((value) => {
    exact(value, fields, label, LOGICAL.workspace);
    if (!ID.test(value[idField]) || ids.has(value[idField])) {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', `${label} ids must be unique.`, {
        logicalPath: LOGICAL.workspace,
      });
    }
    const logicalPath = readLogicalPath(value.path, `${label} path`);
    if (paths.has(logicalPath)) {
      fail('candidate', 'V7DK_WORKSPACE_PATH_ESCAPE', 'workspace', `${label} paths must be unique.`, {
        logicalPath,
      });
    }
    ids.add(value[idField]);
    paths.add(logicalPath);
    return Object.freeze({ ...value, path: logicalPath });
  }).sort((a, b) => compareText(a[idField], b[idField]));
}

function readWorkspaceDocument(value) {
  exact(value, WORKSPACE_FIELDS, 'Developer Workspace', LOGICAL.workspace);
  const trusted = value.schemaVersion === 1 && value.contractProfile === 'trusted-built-in-core-v1';
  const local = value.schemaVersion === 2 && value.contractProfile === 'local-declarative-package-v1';
  if ((!trusted && !local) || value.developerKitRange !== '^1.0.0' || value.sdkRange !== '^1.0.0') {
    fail('candidate', 'V7DK_PROFILE_UNSUPPORTED', 'workspace', 'Workspace versions or contract profile are unsupported.', {
      logicalPath: LOGICAL.workspace,
    });
  }
  if (!Array.isArray(value.entrypoints) || value.entrypoints.length < 1 || value.entrypoints.length > 16) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'Workspace entrypoints are invalid.', {
      logicalPath: LOGICAL.workspace,
    });
  }
  const entrypoints = pathRecords(value.entrypoints, ['id', 'kind', 'path'], 'Entrypoint');
  const entrypointKind = local ? 'fixture-probe' : 'semantic-construction';
  if (entrypoints.some(({ kind, path: logicalPath }) => kind !== entrypointKind || !logicalPath.endsWith('.ts'))) {
    fail('candidate', 'V7DK_CONTRIBUTION_UNAVAILABLE', 'workspace', `Only TypeScript ${entrypointKind} entrypoints are available.`);
  }
  return Object.freeze({
    contractProfile: value.contractProfile,
    developerKitRange: value.developerKitRange,
    entrypoints: Object.freeze(entrypoints),
    expectedOutputs: Object.freeze(pathRecords(
      value.expectedOutputs,
      ['fixtureSuiteId', 'path'],
      'Expected output',
    )),
    fixtureSuites: Object.freeze(pathRecords(value.fixtureSuites, ['id', 'path'], 'Fixture suite')),
    manifestPath: readLogicalPath(value.manifestPath, 'Manifest path'),
    schemaVersion: value.schemaVersion,
    sdkRange: value.sdkRange,
    sourceRoot: readLogicalPath(value.sourceRoot, 'Source root'),
  });
}

function verifyRelativeImports(sourceFiles, sourceRoot) {
  const available = new Set(sourceFiles.map(({ logicalPath }) => logicalPath));
  const diagnostics = [];
  for (const source of sourceFiles) {
    diagnostics.push(...scanTypeScriptSource(source.text, source.logicalPath));
    const imports = source.text.matchAll(/\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/gu);
    for (const match of imports) {
      let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source.logicalPath), match[1]));
      if (resolved.endsWith('.js')) resolved = `${resolved.slice(0, -3)}.ts`;
      else if (!path.posix.extname(resolved)) resolved = `${resolved}.ts`;
      if (!resolved.startsWith(`${sourceRoot}/`) || !available.has(resolved)) {
        diagnostics.push(diagnostic('V7DK_IMPORT_FORBIDDEN', 'static-analysis', 'Relative import escapes or names an undeclared source file.', {
          logicalPath: source.logicalPath,
          related: [{ specifier: match[1] }],
        }));
      }
    }
  }
  if (diagnostics.length > 0) throw new DeveloperKitFailure('candidate', diagnostics);
}

/** Read one complete workspace with a closed, regular-file-only surface. */
export function readWorkspace(workspaceRoot, release) {
  const root = path.resolve(workspaceRoot);
  let stats;
  try { stats = fs.lstatSync(root); } catch {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'Workspace root does not exist.');
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail('candidate', 'V7DK_WORKSPACE_PATH_ESCAPE', 'workspace', 'Workspace root must be a real directory.');
  }
  const document = readWorkspaceDocument(readJson(root, LOGICAL.workspace));
  const manifestValue = readJson(root, document.manifestPath);
  const { graph, manifest } = document.contractProfile === 'local-declarative-package-v1'
    ? readLocalProfileManifest(manifestValue, document.manifestPath)
    : readProfileManifest(manifestValue, document.manifestPath);
  if (release && document.contractProfile === 'local-declarative-package-v1') {
    if (manifest.conformance.sdkVersion !== release.toolchain.sdkVersion) {
      fail('candidate', 'V7DK_SDK_UNSUPPORTED', 'manifest', 'Local manifest targets an unsupported Plugin SDK version.', {
        logicalPath: document.manifestPath,
      });
    }
    if (manifest.conformance.toolchainDigest !== release.toolchainDigest) {
      fail('candidate', 'V7DK_STALE_OUTPUT', 'manifest', 'Local manifest targets a different Developer Kit toolchain.', {
        logicalPath: document.manifestPath,
      });
    }
  }
  const sourceDirectory = inside(root, document.sourceRoot);
  let sourceStats;
  try { sourceStats = fs.lstatSync(sourceDirectory); } catch {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'Source root is missing.', { logicalPath: document.sourceRoot });
  }
  if (!sourceStats.isDirectory() || sourceStats.isSymbolicLink()) {
    fail('candidate', 'V7DK_WORKSPACE_PATH_ESCAPE', 'workspace', 'Source root must be a real directory.', {
      logicalPath: document.sourceRoot,
    });
  }
  const allEntries = collectEntries(root);
  const sourceFiles = allEntries.filter(({ logicalPath }) => logicalPath.startsWith(`${document.sourceRoot}/`));
  if (sourceFiles.length < 1 || sourceFiles.length > LIMITS.sourceFiles
    || sourceFiles.some(({ logicalPath }) => !logicalPath.endsWith('.ts'))) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'Source root may contain only bounded TypeScript source files.');
  }
  const sources = sourceFiles.map(({ logicalPath, target }) => Object.freeze({
    logicalPath,
    text: fs.readFileSync(target, 'utf8'),
  }));
  verifyRelativeImports(sources, document.sourceRoot);
  const sourcePaths = new Set(sources.map(({ logicalPath }) => logicalPath));
  if (document.entrypoints.some(({ path: logicalPath }) => !sourcePaths.has(logicalPath))) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'Every entrypoint must name one source file.');
  }
  const fixtures = document.fixtureSuites.map((record) => {
    const fixture = readFixtureSuite(readJson(root, record.path), record.path);
    if (fixture.id !== record.id || !document.entrypoints.some(({ id }) => id === fixture.entrypointId)) {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Fixture suite does not match the Workspace declarations.', {
        logicalPath: record.path,
      });
    }
    const expectedRecord = document.expectedOutputs.find(({ fixtureSuiteId }) => fixture.id === fixtureSuiteId);
    if (!expectedRecord) {
      fail('candidate', 'V7DK_WORKSPACE_INVALID', 'fixture', 'Fixture suite has no declared expected output.', {
        logicalPath: record.path,
      });
    }
    return Object.freeze({
      expected: readExpectedSuite(readJson(root, expectedRecord.path), fixture, expectedRecord.path),
      expectedPath: expectedRecord.path,
      fixture,
      fixturePath: record.path,
    });
  });
  const declared = new Set([
    LOGICAL.workspace,
    document.manifestPath,
    'README.md',
    ...sources.map(({ logicalPath }) => logicalPath),
    ...document.fixtureSuites.map(({ path: logicalPath }) => logicalPath),
    ...document.expectedOutputs.map(({ path: logicalPath }) => logicalPath),
  ]);
  if (document.contractProfile === 'local-declarative-package-v1') {
    declared.add(manifest.license.noticePath);
  }
  for (const optional of ['LICENSE', 'NOTICE', 'provenance.json']) {
    if (allEntries.some(({ logicalPath }) => logicalPath === optional)) declared.add(optional);
  }
  const undeclared = allEntries.map(({ logicalPath }) => logicalPath).filter((logicalPath) => !declared.has(logicalPath));
  if (undeclared.length > 0) {
    const config = undeclared.find((logicalPath) => /(?:^|\/)(?:package|tsconfig).*\.json$/u.test(logicalPath));
    fail(
      'candidate',
      config ? 'V7DK_COMPILER_CONFIGURATION_FORBIDDEN' : 'V7DK_WORKSPACE_INVALID',
      'workspace',
      config ? 'Candidate compiler configuration, plugins, or lifecycle metadata are forbidden.' : 'Workspace contains an undeclared file.',
      { logicalPath: config ?? undeclared[0], related: undeclared.map((logicalPath) => ({ logicalPath })) },
    );
  }
  if (!declared.has('README.md') || !allEntries.some(({ logicalPath }) => logicalPath === 'README.md')) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'workspace', 'Workspace README.md is required.', { logicalPath: 'README.md' });
  }
  const fileIndex = allEntries.map(({ logicalPath, target }) => {
    const bytes = fs.readFileSync(target);
    return Object.freeze({ logicalPath, sha256: sha256Bytes(bytes), size: bytes.length });
  });
  const content = Object.freeze({
    expectedDigest: digestValue(fileIndex.filter(({ logicalPath }) => logicalPath.startsWith('expected/'))),
    fixtureDigest: digestValue(fileIndex.filter(({ logicalPath }) => logicalPath.startsWith('fixtures/'))),
    manifestDigest: digestValue(fileIndex.filter(({ logicalPath }) => logicalPath === document.manifestPath)),
    sourceDigest: digestValue(fileIndex.filter(({ logicalPath }) => logicalPath.startsWith(`${document.sourceRoot}/`))),
    workspaceDigest: digestValue(fileIndex),
  });
  return Object.freeze({
    content,
    document,
    fileIndex: Object.freeze(fileIndex),
    fixtures: Object.freeze(fixtures),
    graph,
    manifest,
    root,
    sources: Object.freeze(sources),
  });
}

export function readWorkspaceFile(workspace, logicalPath) {
  return fs.readFileSync(requireRegularFile(workspace.root, logicalPath));
}

export function scaffoldWorkspace(targetRoot, files) {
  const root = path.resolve(targetRoot);
  let stats;
  try { stats = fs.lstatSync(root); } catch { stats = null; }
  if (stats) {
    if (!stats.isDirectory() || stats.isSymbolicLink() || fs.readdirSync(root).length > 0) {
      fail('candidate', 'V7DK_SCAFFOLD_TARGET_NOT_EMPTY', 'scaffold', 'Scaffold target must be a new empty directory.');
    }
  } else {
    try { fs.mkdirSync(root, { recursive: true, mode: 0o755 }); } catch {
      fail('candidate', 'V7DK_SCAFFOLD_TARGET_NOT_EMPTY', 'scaffold', 'Scaffold target cannot be created safely.');
    }
  }
  const paths = new Set();
  for (const file of [...files].sort((a, b) => compareText(a.path, b.path))) {
    const logicalPath = readLogicalPath(file.path, 'Scaffold file path');
    if (paths.has(logicalPath)) fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'scaffold', 'Template paths collide.');
    paths.add(logicalPath);
    const target = inside(root, logicalPath);
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
    fs.writeFileSync(target, file.bytes, { flag: 'wx', mode: 0o644 });
  }
  return Object.freeze([...paths].sort());
}
