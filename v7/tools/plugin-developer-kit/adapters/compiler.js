import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalJson, compareText, digestValue, sha256Bytes } from '../domain/canonical-json.js';
import { DeveloperKitFailure, diagnostic, fail } from '../domain/diagnostic.js';
import { analyzeEmittedModule } from '../domain/static-analysis.js';
import { TYPESCRIPT_CLI, SDK_ROOT } from './layout.js';
import {
  replaceOwnedDirectory,
  requireOutputRegularFile,
  writeOutputJson,
} from './output-io.js';

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true, mode: 0o755 });
  fs.copyFileSync(from, to);
  fs.chmodSync(to, 0o644);
}

function listBuildFiles(outputRoot) {
  const root = path.join(outputRoot, 'build');
  let rootStats;
  try { rootStats = fs.lstatSync(root); } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'build', 'Build directory is missing.');
  }
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'build', 'Build root must be a real directory.');
  }
  const values = [];
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name))) {
      const logicalPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const target = path.join(directory, entry.name);
      const stats = fs.lstatSync(target);
      if (stats.isSymbolicLink()) {
        fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'build', 'Build output cannot contain symlinks.');
      } else if (stats.isDirectory()) visit(target, logicalPath);
      else if (stats.isFile()) values.push({ logicalPath: `build/${logicalPath}`, target });
      else fail('internal', 'V7DK_ARTIFACT_INVALID', 'build', 'Compiler emitted a special file.');
    }
  }
  visit(root);
  return values;
}

function normalizeCompilerOutput(value, stageRoot, outputRoot) {
  return value
    .split(stageRoot).join('<workspace>')
    .split(outputRoot).join('<output>')
    .split('\\').join('/')
    .split('\n')
    .filter(Boolean)
    .slice(0, 50);
}

function generatedConfig(workspace, buildRoot) {
  return {
    compilerOptions: {
      declaration: true,
      declarationMap: false,
      exactOptionalPropertyTypes: true,
      forceConsistentCasingInFileNames: true,
      isolatedModules: true,
      lib: ['ES2022'],
      module: 'ES2022',
      moduleDetection: 'force',
      moduleResolution: 'bundler',
      noEmitOnError: true,
      noUncheckedIndexedAccess: true,
      outDir: buildRoot,
      rootDir: workspace.document.sourceRoot,
      sourceMap: false,
      strict: true,
      target: 'ES2022',
      types: [],
      useUnknownInCatchVariables: true,
      verbatimModuleSyntax: true,
    },
    files: workspace.sources.map(({ logicalPath }) => logicalPath).sort(),
  };
}

/** Invoke only the exact installed compiler against a disposable mirror. */
export function compileWorkspace({ outputRoot, release, workspace }) {
  const buildRoot = replaceOwnedDirectory(outputRoot, 'build');
  const stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v7dk-compile-'));
  try {
    for (const source of workspace.sources) {
      const target = path.join(stageRoot, ...source.logicalPath.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
      fs.writeFileSync(target, source.text, { mode: 0o644 });
    }
    const sdkTarget = path.join(stageRoot, 'node_modules/@replay-lab/v7-plugin-sdk');
    for (const logicalPath of ['index.d.ts', 'package.json', 'runtime.js']) {
      copyFile(path.join(SDK_ROOT, logicalPath), path.join(sdkTarget, logicalPath));
    }
    const config = generatedConfig(workspace, buildRoot);
    const configPath = path.join(stageRoot, 'tsconfig.v7dk.json');
    fs.writeFileSync(configPath, `${canonicalJson(config)}\n`, { mode: 0o600 });
    const run = spawnSync(process.execPath, [TYPESCRIPT_CLI, '--project', configPath, '--pretty', 'false'], {
      cwd: stageRoot,
      encoding: 'utf8',
      env: { LANG: 'C', LC_ALL: 'C', TZ: 'UTC' },
      maxBuffer: 1024 * 1024,
      timeout: 15_000,
    });
    if (run.error?.code === 'ETIMEDOUT') {
      fail('internal', 'V7DK_RESOURCE_LIMIT', 'compiler', 'Pinned TypeScript compiler exceeded its internal wall-time limit.');
    }
    if (run.error) {
      fail('internal', 'V7DK_INTERNAL_TOOLCHAIN', 'compiler', 'Pinned TypeScript compiler process did not complete cleanly.', {
        related: [{ errorCode: run.error.code ?? null, signal: run.signal ?? null, status: run.status }],
      });
    }
    if (run.status !== 0) {
      const lines = normalizeCompilerOutput(`${run.stdout ?? ''}${run.stderr ?? ''}`, stageRoot, outputRoot);
      throw new DeveloperKitFailure('candidate', diagnostic(
        'V7DK_TYPESCRIPT_ERROR',
        'compiler',
        'Strict pinned TypeScript compilation failed.',
        {
          related: [
            { signal: run.signal ?? null, status: run.status },
            ...lines.map((message) => ({ message })),
          ],
        },
      ));
    }
    const files = listBuildFiles(outputRoot);
    const expectedJavaScript = new Set(workspace.sources.map(({ logicalPath }) => (
      `build/${path.posix.relative(workspace.document.sourceRoot, logicalPath).replace(/\.ts$/u, '.js')}`
    )));
    const expectedDeclarations = new Set([...expectedJavaScript].map((logicalPath) => logicalPath.replace(/\.js$/u, '.d.ts')));
    const actual = new Set(files.map(({ logicalPath }) => logicalPath));
    if ([...expectedJavaScript, ...expectedDeclarations].some((logicalPath) => !actual.has(logicalPath))
      || files.some(({ logicalPath }) => !logicalPath.endsWith('.js') && !logicalPath.endsWith('.d.ts'))) {
      fail('internal', 'V7DK_ARTIFACT_INVALID', 'compiler', 'Pinned compiler output set is incomplete or undeclared.');
    }
    const diagnostics = [];
    const availableModules = new Set(files
      .filter(({ logicalPath }) => logicalPath.endsWith('.js'))
      .map(({ logicalPath }) => logicalPath));
    for (const file of files.filter(({ logicalPath }) => logicalPath.endsWith('.js'))) {
      diagnostics.push(...analyzeEmittedModule(
        fs.readFileSync(file.target, 'utf8'),
        file.logicalPath,
        availableModules,
      ));
    }
    if (diagnostics.length > 0) throw new DeveloperKitFailure('candidate', diagnostics);
    const artifacts = files.map(({ logicalPath, target }) => {
      const bytes = fs.readFileSync(target);
      if (bytes.includes(Buffer.from(stageRoot)) || bytes.includes(Buffer.from(workspace.root))
        || bytes.includes(Buffer.from(outputRoot))) {
        fail('internal', 'V7DK_ARTIFACT_INVALID', 'compiler', 'Compiler artifact leaked an adapter path.', {
          logicalPath,
        });
      }
      return Object.freeze({ logicalPath, sha256: sha256Bytes(bytes), size: bytes.length });
    });
    const buildDigest = digestValue(artifacts);
    const state = Object.freeze({
      artifactDigest: buildDigest,
      contractProfile: workspace.document.contractProfile,
      schemaVersion: 1,
      toolchainDigest: release.toolchainDigest,
      workspaceDigest: workspace.content.workspaceDigest,
    });
    const stateArtifact = writeOutputJson(outputRoot, 'state/build-state.json', state);
    return Object.freeze({ artifacts: Object.freeze([...artifacts, stateArtifact]), buildDigest, state });
  } finally {
    fs.rmSync(stageRoot, { force: true, recursive: true });
  }
}

export function requireCurrentBuild({ outputRoot, release, workspace }) {
  let state;
  try {
    state = JSON.parse(fs.readFileSync(requireOutputRegularFile(outputRoot, 'state/build-state.json'), 'utf8'));
  } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'build', 'A current successful build is required.');
  }
  if (state.schemaVersion !== 1 || state.workspaceDigest !== workspace.content.workspaceDigest
    || state.contractProfile !== workspace.document.contractProfile
    || state.toolchainDigest !== release.toolchainDigest || typeof state.artifactDigest !== 'string') {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'build', 'Build output is stale for the current workspace or toolchain.');
  }
  const files = listBuildFiles(outputRoot);
  const artifacts = files.map(({ logicalPath, target }) => {
    const bytes = fs.readFileSync(target);
    return { logicalPath, sha256: sha256Bytes(bytes), size: bytes.length };
  });
  if (digestValue(artifacts) !== state.artifactDigest) {
    fail('candidate', 'V7DK_INTEGRITY_MISMATCH', 'build', 'Build artifacts no longer match the build state.');
  }
  return Object.freeze({ artifacts: Object.freeze(artifacts), buildDigest: state.artifactDigest, state });
}
