import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalJson } from '../domain/canonical-json.js';
import { LIMITS } from '../domain/contract.js';
import { DeveloperKitFailure, diagnostic, fail } from '../domain/diagnostic.js';
import { readSyntheticOutput } from '../domain/synthetic-contract.js';
import { TOOL_ROOT } from './layout.js';

const BWRAP = '/usr/bin/bwrap';

function bindSystem(args, target) {
  if (fs.existsSync(target)) args.push('--ro-bind', target, target);
}

function sandboxArgs(workRoot) {
  const args = [
    '--die-with-parent',
    '--new-session',
    '--unshare-user',
    '--unshare-net',
    '--unshare-pid',
    '--unshare-ipc',
    '--unshare-uts',
    '--clearenv',
  ];
  for (const target of ['/usr', '/lib', '/lib64']) bindSystem(args, target);
  args.push(
    '--proc', '/proc',
    '--dev', '/dev',
    '--tmpfs', '/tmp',
    '--ro-bind', workRoot, '/work',
    '--chdir', '/work',
    process.execPath,
    '--permission',
    '--allow-fs-read=/work',
    '--experimental-vm-modules',
    '--disallow-code-generation-from-strings',
    '--disable-proto=throw',
    '--frozen-intrinsics',
    '--no-experimental-fetch',
    '--no-experimental-websocket',
    `--max-old-space-size=${LIMITS.candidateMemoryMiB}`,
    '/work/runner.mjs',
  );
  return args;
}

function verifyIsolation() {
  if (process.platform !== 'linux' || !fs.existsSync(BWRAP)) {
    fail('blocked', 'V7DK_ISOLATION_UNAVAILABLE', 'isolation', 'Linux bubblewrap isolation is unavailable.');
  }
}

function copyBuild(buildRoot, targetRoot) {
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const logicalPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(source, logicalPath);
      else if (entry.isFile() && logicalPath.endsWith('.js')) {
        const target = path.join(targetRoot, ...logicalPath.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
        fs.copyFileSync(source, target);
        fs.chmodSync(target, 0o444);
      }
    }
  }
  visit(buildRoot);
}

function oneRun({ entrypoint, input, outputRoot }) {
  verifyIsolation();
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v7dk-isolate-'));
  try {
    const buildTarget = path.join(workRoot, 'build');
    fs.mkdirSync(buildTarget, { mode: 0o755 });
    copyBuild(path.join(outputRoot, 'build'), buildTarget);
    fs.copyFileSync(path.join(TOOL_ROOT, 'adapters/isolated-child.mjs'), path.join(workRoot, 'runner.mjs'));
    fs.chmodSync(path.join(workRoot, 'runner.mjs'), 0o444);
    fs.writeFileSync(path.join(workRoot, 'request.json'), `${canonicalJson({
      entrypoint,
      input,
      timeoutMs: Math.floor(LIMITS.candidateWallTimeMs / 2),
    })}\n`, { mode: 0o444 });
    const run = spawnSync(BWRAP, sandboxArgs(workRoot), {
      encoding: 'utf8',
      env: {},
      maxBuffer: LIMITS.candidateOutputBytes,
      timeout: LIMITS.candidateWallTimeMs,
    });
    if (run.error?.code === 'ETIMEDOUT' || run.signal) {
      fail('candidate', 'V7DK_RESOURCE_LIMIT', 'isolation', 'Candidate execution exceeded its wall-time or process limit.');
    }
    if (run.error) {
      fail('blocked', 'V7DK_ISOLATION_UNAVAILABLE', 'isolation', 'The isolated developer test process could not start.', {
        related: [{ errorCode: run.error.code ?? null, signal: run.signal ?? null }],
      });
    }
    let envelope;
    try { envelope = JSON.parse(run.stdout); } catch {
      if (run.stderr.includes('bwrap:')) {
        fail('blocked', 'V7DK_ISOLATION_UNAVAILABLE', 'isolation', 'The platform could not enforce the developer sandbox.', {
          related: [{ errorCode: run.error?.code ?? null, signal: run.signal ?? null, status: run.status }],
        });
      }
      fail('candidate', 'V7DK_ARTIFACT_INVALID', 'isolation', 'Candidate process returned a malformed result.', {
        related: [{
          errorCode: run.error?.code ?? null,
          signal: run.signal ?? null,
          status: run.status,
          stderr: (run.stderr ?? '').slice(0, 240),
          stdout: (run.stdout ?? '').slice(0, 240),
        }],
      });
    }
    if (run.status !== 0 || envelope.ok !== true) {
      throw new DeveloperKitFailure('candidate', diagnostic(
        envelope.code === 'V7DK_RESOURCE_LIMIT' ? envelope.code : 'V7DK_ARTIFACT_INVALID',
        'isolation',
        'Candidate execution failed inside the disposable synthetic host.',
        { related: [{ candidateError: envelope.message ?? 'CandidateError' }] },
      ));
    }
    return envelope.output;
  } finally {
    fs.rmSync(workRoot, { force: true, recursive: true });
  }
}

/** Execute selected fixtures twice in separate disposable sandboxes. */
export function runIsolatedFixtures({ outputRoot, selection, workspace }) {
  const results = [];
  for (const suite of workspace.fixtures) {
    const cases = suite.fixture.cases.filter(({ id }) => selection.length === 0 || selection.includes(id));
    for (const fixtureCase of cases) {
      const entrypoint = workspace.document.entrypoints.find(({ id }) => id === suite.fixture.entrypointId);
      const builtEntrypoint = path.posix.relative(workspace.document.sourceRoot, entrypoint.path).replace(/\.ts$/u, '.js');
      const first = readSyntheticOutput(
        oneRun({ entrypoint: builtEntrypoint, input: fixtureCase.input, outputRoot }),
        fixtureCase.input,
      );
      const second = readSyntheticOutput(
        oneRun({ entrypoint: builtEntrypoint, input: fixtureCase.input, outputRoot }),
        fixtureCase.input,
      );
      if (canonicalJson(first) !== canonicalJson(second)) {
        fail('candidate', 'V7DK_NON_DETERMINISTIC', 'test', 'Candidate output changed across clean isolated executions.', {
          related: [{ caseId: fixtureCase.id, fixtureSuiteId: suite.fixture.id }],
        });
      }
      const expected = suite.expected.cases.find(({ id }) => id === fixtureCase.id).output;
      if (canonicalJson(first) !== canonicalJson(expected)) {
        fail('candidate', 'V7DK_FIXTURE_MISMATCH', 'test', 'Candidate output does not match the exact expected fixture.', {
          related: [{ caseId: fixtureCase.id, fixtureSuiteId: suite.fixture.id }],
        });
      }
      results.push(Object.freeze({
        caseId: fixtureCase.id,
        fixtureSuiteId: suite.fixture.id,
        output: first,
        status: 'passed',
      }));
    }
  }
  if (results.length === 0) {
    fail('candidate', 'V7DK_WORKSPACE_INVALID', 'test', 'Fixture selection matched no cases.');
  }
  return Object.freeze(results);
}
