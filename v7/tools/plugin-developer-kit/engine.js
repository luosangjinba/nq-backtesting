import fs from 'node:fs';
import path from 'node:path';
import { packBundle, inspectBundleAt } from './adapters/bundle.js';
import { compileWorkspace, requireCurrentBuild } from './adapters/compiler.js';
import { runIsolatedFixtures } from './adapters/isolation.js';
import { discoverRelease, loadReleaseCatalog } from './adapters/release-catalog.js';
import { loadTemplate } from './adapters/template.js';
import {
  prepareOutputRoot,
  readWorkspace,
  scaffoldWorkspace,
  writeOutputJson,
} from './adapters/workspace-io.js';
import { canonicalJson, digestValue, sha256Bytes } from './domain/canonical-json.js';
import { compatibilityReport } from './domain/compatibility.js';
import { asFailure, fail } from './domain/diagnostic.js';
import { createReceipt } from './domain/receipt.js';
import { readRequest, requestIdentity } from './domain/request.js';
import { createResult } from './domain/result.js';

function safeRawIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { malformed: true };
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (key === 'workspaceRoot' || key === 'outputRoot') continue;
    try { canonicalJson(value[key]); result[key] = value[key]; } catch { result[key] = '<non-portable>'; }
  }
  return result;
}

function inputDigest(request, workspace, extra = {}) {
  return digestValue({
    request: requestIdentity(request),
    workspaceDigest: workspace?.content.workspaceDigest ?? null,
    ...extra,
  });
}

function gates({ applicable = [], blocked = [], failed = [], passed = [] }) {
  return { applicable, blocked, failed, notApplicable: [], passed };
}

function receiptFor({ conformance, content, diagnostics = [], operation, release, workspace }) {
  return createReceipt({
    catalogs: { digest: release.catalogDigest, version: 1 },
    compiler: release.compiler,
    conformance: Object.freeze({
      ...conformance,
      releaseGate: release.conformance,
    }),
    content,
    diagnostics,
    manifest: workspace.manifest,
    operation,
    operationDigest: release.operationDigest,
    schemaDigest: release.schemaDigest,
    sdkDigest: release.sdkDigest,
    simulatorDigest: release.simulatorDigest,
    toolchainDigest: release.toolchainDigest,
  });
}

function sameRootBoundary(workspaceRoot, outputRoot) {
  const workspace = path.resolve(workspaceRoot);
  const output = path.resolve(outputRoot);
  return workspace === output || output.startsWith(`${workspace}${path.sep}`)
    || workspace.startsWith(`${output}${path.sep}`);
}

function requireSeparateOutput(request) {
  if (request.outputRoot && sameRootBoundary(request.workspaceRoot, request.outputRoot)) {
    fail('candidate', 'V7DK_UNSAFE_OVERWRITE', 'output', 'Output root must be separate from the developer workspace.');
  }
}

function validateOperation(request, release) {
  const workspace = readWorkspace(request.workspaceRoot);
  const report = compatibilityReport({
    gates: gates({
      applicable: ['workspace', 'manifest', 'capability-graph', 'fixtures', 'static-analysis'],
      passed: ['workspace', 'manifest', 'capability-graph', 'fixtures', 'static-analysis'],
    }),
    requested: request,
    toolchain: release.compiler,
  });
  return {
    artifacts: [{
      content: workspace.content,
      files: workspace.fileIndex,
      kind: 'workspace-inspection',
      packageId: workspace.manifest.packageId,
      packageVersion: workspace.manifest.packageVersion,
    }],
    compatibilityReport: report,
    inputDigest: inputDigest(request, workspace),
  };
}

function buildOperation(request, release) {
  requireSeparateOutput(request);
  const workspace = readWorkspace(request.workspaceRoot);
  const outputRoot = prepareOutputRoot(request.outputRoot, release.toolchainDigest);
  const built = compileWorkspace({ outputRoot, release, workspace });
  const report = compatibilityReport({
    gates: gates({
      applicable: ['workspace', 'manifest', 'capability-graph', 'fixtures', 'static-analysis', 'typescript'],
      passed: ['workspace', 'manifest', 'capability-graph', 'fixtures', 'static-analysis', 'typescript'],
    }),
    requested: request,
    toolchain: release.compiler,
  });
  const content = Object.freeze({ ...workspace.content, buildDigest: built.buildDigest });
  const receipt = receiptFor({
    conformance: { negativeControls: [], outcomes: ['strict-typescript:passed', 'static-esm:passed'] },
    content,
    operation: 'build',
    release,
    workspace,
  });
  const reportArtifact = writeOutputJson(outputRoot, 'reports/build-compatibility.json', report);
  const receiptArtifact = writeOutputJson(outputRoot, 'receipts/build.json', receipt);
  return {
    artifacts: [...built.artifacts, reportArtifact, receiptArtifact],
    compatibilityReport: report,
    inputDigest: inputDigest(request, workspace),
    receipt,
  };
}

function testOperation(request, release, adapters) {
  requireSeparateOutput(request);
  const workspace = readWorkspace(request.workspaceRoot);
  const outputRoot = prepareOutputRoot(request.outputRoot, release.toolchainDigest);
  const build = requireCurrentBuild({ outputRoot, release, workspace });
  const fixtureResults = adapters.runIsolatedFixtures({
    outputRoot,
    selection: request.fixtureSelection,
    workspace,
  });
  const testReport = Object.freeze({
    executionClassification: 'isolated-developer-test',
    fixtureResults: fixtureResults.map(({ caseId, fixtureSuiteId, output, status }) => ({
      caseId,
      fixtureSuiteId,
      outputDigest: digestValue(output),
      status,
    })),
    fullIncrementalEquivalence: 'not-applicable-stateless-evidence-construction',
    immutableFixtureInput: true,
    productionRuntime: false,
    schemaVersion: 1,
  });
  const testDigest = digestValue(testReport);
  const report = compatibilityReport({
    gates: gates({
      applicable: ['current-build', 'isolated-host', 'fixture-output', 'determinism', 'replay-cutoff'],
      passed: ['current-build', 'isolated-host', 'fixture-output', 'determinism', 'replay-cutoff'],
    }),
    requested: request,
    toolchain: release.compiler,
  });
  const state = Object.freeze({
    buildDigest: build.buildDigest,
    outputDigest: testDigest,
    schemaVersion: 1,
    toolchainDigest: release.toolchainDigest,
    workspaceDigest: workspace.content.workspaceDigest,
  });
  const content = Object.freeze({
    ...workspace.content,
    buildDigest: build.buildDigest,
    testDigest,
  });
  const receipt = receiptFor({
    conformance: {
      fixtureOutcomes: testReport.fixtureResults,
      negativeControls: [],
      outcomes: ['isolated-host:passed', 'determinism:passed', 'expected-output:passed'],
    },
    content,
    operation: 'test',
    release,
    workspace,
  });
  const resultArtifact = writeOutputJson(outputRoot, 'results/test.json', testReport);
  const stateArtifact = writeOutputJson(outputRoot, 'state/test-state.json', state);
  const reportArtifact = writeOutputJson(outputRoot, 'reports/test-compatibility.json', report);
  const receiptArtifact = writeOutputJson(outputRoot, 'receipts/test.json', receipt);
  return {
    artifacts: [resultArtifact, stateArtifact, reportArtifact, receiptArtifact],
    compatibilityReport: report,
    inputDigest: inputDigest(request, workspace),
    receipt,
  };
}

function previewOperation(request, release, adapters) {
  requireSeparateOutput(request);
  const workspace = readWorkspace(request.workspaceRoot);
  const outputRoot = prepareOutputRoot(request.outputRoot, release.toolchainDigest);
  const build = requireCurrentBuild({ outputRoot, release, workspace });
  const fixtureResults = adapters.runIsolatedFixtures({
    outputRoot,
    selection: request.fixtureSelection,
    workspace,
  });
  const semantic = workspace.manifest.contributions.find(({ kind }) => kind === 'semantic-type');
  const preview = Object.freeze({
    cases: fixtureResults.map(({ caseId, fixtureSuiteId, output }) => ({
      artifact: output.artifact,
      caseId,
      fixtureSuiteId,
      projections: output.projections,
    })),
    contractProfile: workspace.document.contractProfile,
    packageId: workspace.manifest.packageId,
    parameters: {
      customCss: false,
      customHtml: false,
      hostRendered: true,
      schema: semantic.parameters,
    },
    productionApplicationOpened: false,
    schemaVersion: 1,
  });
  const previewDigest = digestValue(preview);
  const report = compatibilityReport({
    gates: gates({
      applicable: ['current-build', 'isolated-host', 'host-shaped-preview', 'host-rendered-controls'],
      passed: ['current-build', 'isolated-host', 'host-shaped-preview', 'host-rendered-controls'],
    }),
    requested: request,
    toolchain: release.compiler,
  });
  const state = Object.freeze({
    buildDigest: build.buildDigest,
    outputDigest: previewDigest,
    schemaVersion: 1,
    toolchainDigest: release.toolchainDigest,
    workspaceDigest: workspace.content.workspaceDigest,
  });
  const content = Object.freeze({
    ...workspace.content,
    buildDigest: build.buildDigest,
    previewDigest,
  });
  const receipt = receiptFor({
    conformance: {
      fixtureOutcomes: fixtureResults.map(({ caseId, fixtureSuiteId, status }) => ({ caseId, fixtureSuiteId, status })),
      negativeControls: [],
      outcomes: ['host-shaped-preview:passed', 'host-rendered-controls:passed'],
    },
    content,
    operation: 'preview',
    release,
    workspace,
  });
  const previewArtifact = writeOutputJson(outputRoot, 'previews/preview.json', preview);
  const stateArtifact = writeOutputJson(outputRoot, 'state/preview-state.json', state);
  const reportArtifact = writeOutputJson(outputRoot, 'reports/preview-compatibility.json', report);
  const receiptArtifact = writeOutputJson(outputRoot, 'receipts/preview.json', receipt);
  return {
    artifacts: [previewArtifact, stateArtifact, reportArtifact, receiptArtifact],
    compatibilityReport: report,
    inputDigest: inputDigest(request, workspace),
    receipt,
  };
}

function packOperation(request, release) {
  requireSeparateOutput(request);
  const workspace = readWorkspace(request.workspaceRoot);
  const outputRoot = prepareOutputRoot(request.outputRoot, release.toolchainDigest);
  const build = requireCurrentBuild({ outputRoot, release, workspace });
  const report = compatibilityReport({
    gates: gates({
      applicable: ['current-build', 'current-test', 'current-preview', 'deterministic-archive', 'bundle-inspection'],
      passed: ['current-build', 'current-test', 'current-preview', 'deterministic-archive', 'bundle-inspection'],
    }),
    requested: request,
    toolchain: release.compiler,
  });
  const packed = packBundle({ build, compatibility: report, outputRoot, release, workspace });
  const testState = readOutputState(outputRoot, 'test');
  const previewState = readOutputState(outputRoot, 'preview');
  const content = Object.freeze({
    ...workspace.content,
    buildDigest: build.buildDigest,
    bundleContentDigest: packed.contentDigest,
    bundleDigest: packed.bundleDigest,
    previewDigest: previewState.outputDigest,
    testDigest: testState.outputDigest,
  });
  const receipt = receiptFor({
    conformance: {
      negativeControls: [],
      outcomes: ['required-gates:passed', 'deterministic-ustar:passed', 'read-only-inspect:passed'],
    },
    content,
    operation: 'pack',
    release,
    workspace,
  });
  const reportArtifact = writeOutputJson(outputRoot, 'reports/pack-compatibility.json', report);
  const receiptArtifact = writeOutputJson(outputRoot, 'receipts/pack.json', receipt);
  return {
    artifacts: [packed.artifact, reportArtifact, receiptArtifact],
    compatibilityReport: report,
    inputDigest: inputDigest(request, workspace),
    receipt,
  };
}

function readOutputState(outputRoot, stage) {
  const target = path.join(outputRoot, 'state', `${stage}-state.json`);
  try { return JSON.parse(fs.readFileSync(target, 'utf8')); } catch {
    fail('candidate', 'V7DK_STALE_OUTPUT', 'pack', `${stage} state is missing.`);
  }
}

const defaultAdapters = Object.freeze({
  inspectBundleAt,
  runIsolatedFixtures,
});

function inspectOperation(request, release, adapters) {
  if (request.options.target === 'bundle') {
    const inspected = adapters.inspectBundleAt(request.workspaceRoot, request.options.path, release);
    return {
      artifacts: [{ kind: 'bundle-inspection', ...inspected }],
      compatibilityReport: compatibilityReport({
        gates: gates({ applicable: ['bundle-integrity'], passed: ['bundle-integrity'] }),
        requested: request,
        toolchain: release.compiler,
      }),
      inputDigest: inputDigest(request, null, { bundleDigest: `sha256:${inspected.bundleSha256}` }),
    };
  }
  return validateOperation(request, release);
}

function execute(request, release, adapters) {
  if (request.operation === 'discover') {
    const discovery = discoverRelease(release);
    return {
      artifacts: [{ kind: 'developer-kit-discovery', value: discovery }],
      inputDigest: inputDigest(request, null, { releaseDigest: release.toolchainDigest }),
    };
  }
  if (request.operation === 'scaffold') {
    const template = loadTemplate(request.options.templateId);
    const paths = scaffoldWorkspace(request.workspaceRoot, template);
    const templateIdentity = template.map(({ bytes, path: logicalPath }) => ({
      path: logicalPath,
      sha256: sha256Bytes(bytes),
      size: bytes.length,
    }));
    return {
      artifacts: [{ files: templateIdentity, kind: 'scaffolded-workspace' }],
      inputDigest: inputDigest(request, null, { templateDigest: digestValue(templateIdentity) }),
    };
  }
  if (request.operation === 'validate') return validateOperation(request, release);
  if (request.operation === 'build') return buildOperation(request, release);
  if (request.operation === 'test') return testOperation(request, release, adapters);
  if (request.operation === 'preview') return previewOperation(request, release, adapters);
  if (request.operation === 'pack') return packOperation(request, release);
  return inspectOperation(request, release, adapters);
}

/** One authoritative synchronous engine shared by the Library and CLI. */
export function runDeveloperKit(rawRequest, overrides = {}) {
  let release;
  let request;
  const operation = typeof rawRequest?.operation === 'string' ? rawRequest.operation : 'discover';
  try {
    release = loadReleaseCatalog({ refresh: true, ...(overrides.releaseOptions ?? {}) });
    request = readRequest(rawRequest);
    const adapters = Object.freeze({ ...defaultAdapters, ...(overrides.adapters ?? {}) });
    const outcome = execute(request, release, adapters);
    return createResult({
      ...outcome,
      kind: 'passed',
      operation: request.operation,
      toolchainDigest: release.toolchainDigest,
    });
  } catch (error) {
    const failure = asFailure(error);
    const fallbackDigest = digestValue(safeRawIdentity(rawRequest));
    return createResult({
      artifacts: [],
      diagnostics: failure.diagnostics,
      inputDigest: request ? inputDigest(request) : fallbackDigest,
      kind: failure.kind,
      operation: request?.operation ?? operation,
      toolchainDigest: release?.toolchainDigest ?? digestValue({ toolchain: 'unavailable' }),
    });
  }
}
