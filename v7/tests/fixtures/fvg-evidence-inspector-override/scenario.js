import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import * as evidenceContract from '../../../src/annotation-evidence-resolver/public.js';
import * as geometryContract from '../../../src/annotation-geometry-domain/public.js';
import {
  createAnnotationPreviewIdentity,
  createAnnotationProjection,
  createChartAnnotationPreviewPort,
  createChartAnnotationProjectionPort,
  createLightweightSeriesPrimitiveAdapter,
  createRectangleRenderPrimitive,
  createSegmentRenderPrimitive,
  readAnnotationProjection,
} from '../../../src/annotation-chart-projection/public.js';
import {
  createAnnotationProjectionFrame,
  createAnnotationProjectionSubject,
  createInitialAnchorProjectionPolicyRegistry,
  createMultiPaneAnnotationProjectionRuntime,
} from '../../../src/annotation-context-projection/public.js';
import { createSemanticArtifactInspectorController } from '../../../src/annotation-interaction/public.js';
import { createAnnotationRuntime } from '../../../src/annotation-runtime/public.js';
import { createSemanticPackageRegistry } from '../../../src/annotation-semantic-registry/public.js';
import {
  createFairValueGapSemanticPackage,
  FAIR_VALUE_GAP_PACKAGE_ID,
  FAIR_VALUE_GAP_TYPE_ID,
} from '../../../src/semantic-fair-value-gap/public.js';
import { createSessionId } from '../../../src/session-identity/public.js';

const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const OBSERVED_AT = BASE + (16 * MINUTE);
const CREATED_AT = BASE + (17 * MINUTE);
const ARTIFACT_ID = 'artifact.fixture-fvg-inspector';
const body = document.body;
const sessionId = createSessionId('session.r13-10d-fixture');
const buttons = Object.freeze(Object.fromEntries([
  'after', 'apply', 'at', 'before', 'cancel', 'disable', 'enable', 'reset',
].map((id) => [id, document.getElementById(id)])));
const groupsHost = document.getElementById('groups');
const inspectorState = document.getElementById('inspector-state');
const projectionCount = document.getElementById('projection-count');
const status = document.getElementById('status');
let currentMode = 'at';
let editorClock = CREATED_AT + MINUTE;
let inspectorError = null;
let reconciliationRevision = 0;

function marketBars() {
  const values = Array.from({ length: 16 }, (_, index) => {
    const open = 99 + (index * 0.42);
    const close = open + (index % 2 === 0 ? 0.34 : -0.27);
    return {
      close,
      high: Math.max(open, close) + 0.62,
      low: Math.min(open, close) - 0.62,
      open,
      volume: 12 + index,
    };
  });
  values[4] = { close: 100.5, high: 101, low: 99, open: 100, volume: 20 };
  values[5] = { close: 104, high: 105, low: 100, open: 100.5, volume: 28 };
  values[6] = { close: 105, high: 106, low: 103, open: 104, volume: 24 };
  return Object.freeze(values.map((value, index) => Object.freeze({
    ...value,
    endEpochMs: BASE + ((index + 1) * MINUTE),
    startEpochMs: BASE + (index * MINUTE),
  })));
}

const acceptedBars = marketBars();
const chart = createChart(document.getElementById('chart'), {
  autoSize: true,
  grid: { horzLines: { color: '#14212b' }, vertLines: { color: '#14212b' } },
  layout: { background: { color: '#05080c' }, textColor: '#8da2b3' },
  rightPriceScale: { autoScale: true, borderColor: '#263b4b' },
  timeScale: { borderColor: '#263b4b', timeVisible: true },
});
const series = chart.addSeries(CandlestickSeries, {
  downColor: '#f23645', borderVisible: false, upColor: '#089981',
  wickDownColor: '#f23645', wickUpColor: '#089981',
});
series.setData(acceptedBars.map((bar) => ({
  close: bar.close,
  high: bar.high,
  low: bar.low,
  open: bar.open,
  time: bar.startEpochMs / 1_000,
})));
const initialCandleBytes = JSON.stringify(series.data());

function primitiveAdapter() {
  return createLightweightSeriesPrimitiveAdapter({
    createPrimitive(candidate) {
      const projection = readAnnotationProjection(candidate);
      if (projection.geometry.typeId === 'geometry.rectangle') {
        return createRectangleRenderPrimitive(candidate);
      }
      if (projection.geometry.typeId === 'geometry.segment') {
        return createSegmentRenderPrimitive(candidate);
      }
      throw new Error(`No fixture renderer for ${projection.geometry.typeId}`);
    },
    series,
  });
}

const acceptedPort = createChartAnnotationProjectionPort({ primitiveAdapter: primitiveAdapter() });
const previewPort = createChartAnnotationPreviewPort({ primitiveAdapter: primitiveAdapter() });
const projectionRuntime = createMultiPaneAnnotationProjectionRuntime({
  createProjection: createAnnotationProjection,
  geometryContract,
  policyRegistry: createInitialAnchorProjectionPolicyRegistry(),
});
const semanticRegistry = createSemanticPackageRegistry({
  availableCapabilities: [
    'annotation.evidence.bundle',
    'annotation.geometry.rectangle',
    'annotation.geometry.segment',
  ],
  packages: [createFairValueGapSemanticPackage({ evidenceContract, geometryContract })],
});
await semanticRegistry.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);

function fakeRepository() {
  return Object.freeze({
    prepare() {
      return Object.freeze({
        apply: async () => {},
        finalize: async () => {},
        rollback: async () => {},
        snapshot: () => Object.freeze({ phase: 'fixture' }),
      });
    },
  });
}

const annotationRuntime = createAnnotationRuntime({
  geometryContract,
  repository: fakeRepository(),
  semanticContract: semanticRegistry,
  sessionId,
});

function evidence() {
  const snapshot = evidenceContract.createAcceptedAnnotationEvidenceSnapshot({
    acceptedWorkspaceRevision: 52,
    artifacts: [],
    bars: acceptedBars,
    datasetRevision: 'dataset.r13-10d-fixture',
    displayTimeframeId: 'timeframe.1m',
    instrumentId: 'instrument.nq',
    paneId: 'pane.nq-1m',
    replayCutoffEpochMs: OBSERVED_AT,
    schemaVersion: 1,
    sessionId,
    sourceTimeframeId: 'timeframe.1m',
  });
  return evidenceContract.resolveAnnotationEvidence({
    requirement: evidenceContract.createAnnotationEvidenceRequirement({
      followingBars: 1,
      maximumArtifactReferences: 0,
      precedingBars: 1,
      schemaVersion: 1,
    }),
    selection: evidenceContract.createAnnotationEvidenceSelection({
      artifactReferences: [],
      barStartEpochMs: acceptedBars[5].startEpochMs,
      schemaVersion: 1,
    }),
    snapshot,
  });
}

const constructionDraft = semanticRegistry.constructArtifactDraft({
  artifactId: ARTIFACT_ID,
  construction: {
    createdAtEpochMs: CREATED_AT,
    evidence: evidence(),
    mode: 'evidence-derived',
    sessionId,
  },
  typeId: FAIR_VALUE_GAP_TYPE_ID,
  typeVersion: '1.0.0',
});
await annotationRuntime.createSemanticArtifact({
  draft: constructionDraft,
  expectedDocumentRevision: 0,
  sessionId,
});

function replayCutoff() {
  if (currentMode === 'before') return OBSERVED_AT - 1;
  if (currentMode === 'after') return OBSERVED_AT + MINUTE;
  return OBSERVED_AT;
}

function frame() {
  reconciliationRevision += 1;
  return createAnnotationProjectionFrame({
    annotationRevision: annotationRuntime.getDocument().revision,
    panes: [{
      acceptedBuckets: acceptedBars.map(({ endEpochMs, startEpochMs }) => ({
        endEpochMs, startEpochMs,
      })),
      instrumentId: 'instrument.nq',
      paneId: 'pane.nq-1m',
      timeframeId: 'timeframe.1m',
    }],
    reconciliationRevision,
    replayCutoffEpochMs: replayCutoff(),
    sessionId,
  });
}

function subjects() {
  return Object.freeze(annotationRuntime.listSemanticArtifacts()
    .flatMap((artifact) => semanticRegistry.projectionInputsForArtifact(artifact))
    .map(createAnnotationProjectionSubject));
}

const paintFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function updateHeader(label) {
  projectionCount.textContent = `accepted visible ${acceptedPort.snapshot().projectionCount} · preview ${previewPort.snapshot().projectionCount}`;
  for (const id of ['before', 'at', 'after']) buttons[id].dataset.active = String(currentMode === id);
  status.textContent = `${label} · doc ${annotationRuntime.getDocument().revision}`;
}

async function reconcile(label, projectionSubjects = subjects()) {
  await projectionRuntime.reconcile({
    frame: frame(),
    subjects: projectionSubjects,
    surfaces: [{ paneId: 'pane.nq-1m', port: acceptedPort }],
  });
  updateHeader(label);
  await paintFrame();
}

function displayValue(value) {
  if (typeof value === 'string') return value;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function renderInspector(snapshot) {
  inspectorState.dataset.error = inspectorError?.code ?? '';
  inspectorState.textContent = inspectorError === null
    ? (snapshot.selectedArtifactId === null
      ? 'No Artifact selected'
      : `${snapshot.status} · artifact rev ${annotationRuntime.getSemanticArtifact(ARTIFACT_ID)?.revision ?? '—'}`)
    : `Rejected · ${inspectorError.code} · accepted Artifact unchanged`;
  groupsHost.replaceChildren();
  if (snapshot.groups.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = snapshot.status === 'hidden'
      ? 'Artifact hidden before its observation cutoff.'
      : 'No resolved semantic schema.';
    groupsHost.append(empty);
  }
  for (const group of snapshot.groups) {
    const section = document.createElement('section');
    section.className = 'group';
    const heading = document.createElement('h3');
    heading.textContent = group.label;
    section.append(heading);
    for (const field of group.fields) {
      const row = document.createElement('div');
      row.className = 'field';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = field.label;
      row.append(label);
      const currentValue = snapshot.fieldValues[field.id] ?? field.value;
      if (!field.readOnly && field.control?.kind === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.dataset.field = field.id;
        input.min = field.control.min;
        input.max = field.control.max;
        input.step = '0.01';
        input.value = currentValue;
        input.addEventListener('change', guarded(() => updateField(field.id, Number(input.value))));
        row.append(input);
      } else {
        const value = document.createElement('span');
        value.className = 'value';
        value.title = displayValue(currentValue);
        value.textContent = displayValue(currentValue);
        row.append(value);
      }
      const meta = document.createElement('div');
      meta.className = 'meta';
      if (Object.hasOwn(field, 'baselineValue')) {
        const baseline = document.createElement('span');
        baseline.textContent = `baseline ${field.baselineValue}`;
        meta.append(baseline);
      }
      const badge = document.createElement('span');
      badge.className = `badge ${field.source}`;
      badge.textContent = field.source;
      meta.append(badge);
      row.append(meta);
      section.append(row);
    }
    groupsHost.append(section);
  }
  buttons.apply.disabled = !snapshot.dirty;
  buttons.reset.disabled = snapshot.status !== 'selected';
  buttons.cancel.disabled = snapshot.status === 'idle';
  updateHeader(snapshot.status);
}

function previewProjection({ previewRevision, subject }) {
  return createAnnotationProjection({
    entityId: subject.entityId,
    geometry: subject.geometry,
    presentation: subject.presentation,
    projectionId: subject.projectionId,
    revision: previewRevision,
  });
}

const inspector = createSemanticArtifactInspectorController({
  artifactPort: {
    async readArtifact({ artifactId }) {
      return Object.freeze({
        artifact: annotationRuntime.getSemanticArtifact(artifactId),
        documentRevision: annotationRuntime.getDocument().revision,
      });
    },
    async reviseArtifact(input) {
      return annotationRuntime.reviseSemanticArtifact({ ...input, sessionId });
    },
  },
  createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
  editorId: 'fixture.trader',
  nowEpochMs: () => editorClock++,
  onError(error) {
    inspectorError = Object.freeze({ code: error.code, message: error.message });
    body.dataset.lastError = `${error.code}:${error.message}`;
    status.textContent = `Error · ${error.code}`;
  },
  onStateChange: renderInspector,
  previewPort,
  projectPreview: previewProjection,
  semanticRegistryPort: semanticRegistry,
});

async function selectCurrent() {
  return inspector.select({ artifactId: ARTIFACT_ID, replayCutoffEpochMs: replayCutoff() });
}

function clearInspectorError() {
  inspectorError = null;
  delete body.dataset.lastError;
}

async function setMode(mode) {
  clearInspectorError();
  currentMode = mode;
  await selectCurrent();
  await reconcile(`${mode} observation`);
  return snapshot();
}

async function updateField(field, value) {
  clearInspectorError();
  const state = inspector.snapshot();
  await inspector.updateDraft({ expectedDraftRevision: state.draftRevision, field, value });
  await reconcile('Preview override · accepted Artifact unchanged', Object.freeze([]));
  return snapshot();
}

async function updateBounds(lowerPrice, upperPrice) {
  await updateField('lowerPrice', lowerPrice);
  await updateField('upperPrice', upperPrice);
  return snapshot();
}

async function cancel() {
  clearInspectorError();
  await inspector.cancel();
  await reconcile('Accepted Artifact restored');
  return snapshot();
}

async function save() {
  clearInspectorError();
  await inspector.save();
  await reconcile('Accepted override');
  return snapshot();
}

async function resetDraft() {
  clearInspectorError();
  const state = await inspector.resetDraft();
  await reconcile(
    state.dirty ? 'Preview reset · accepted Artifact unchanged' : 'Accepted Artifact restored',
    state.dirty ? Object.freeze([]) : subjects(),
  );
  return snapshot();
}

async function disablePackage() {
  clearInspectorError();
  await inspector.cancel();
  await semanticRegistry.disablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
  buttons.disable.disabled = true;
  buttons.enable.disabled = false;
  await reconcile('Core Plugin disabled · Artifact preserved');
  await selectCurrent();
  return snapshot();
}

async function enablePackage() {
  clearInspectorError();
  await inspector.cancel();
  await semanticRegistry.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
  buttons.disable.disabled = false;
  buttons.enable.disabled = true;
  await reconcile('Core Plugin enabled · schema restored');
  await selectCurrent();
  return snapshot();
}

function snapshot() {
  return Object.freeze({
    accepted: acceptedPort.snapshot(),
    candleBytes: JSON.stringify(series.data()),
    document: annotationRuntime.getDocument(),
    inspector: inspector.snapshot(),
    package: semanticRegistry.packageSnapshot(FAIR_VALUE_GAP_PACKAGE_ID),
    preview: previewPort.snapshot(),
  });
}

function fail(error) {
  body.dataset.error = `${error.code ?? error.name}:${error.message}`;
  body.dataset.scenario = 'failed';
  status.textContent = body.dataset.error;
  throw error;
}

function reportActionFailure(error) {
  if (inspectorError === null) {
    inspectorError = Object.freeze({
      code: error.code ?? error.name ?? 'Error',
      message: error.message ?? String(error),
    });
    body.dataset.lastError = `${inspectorError.code}:${inspectorError.message}`;
    renderInspector(inspector.snapshot());
  }
}

function guarded(action) { return () => action().catch(reportActionFailure); }

buttons.before.addEventListener('click', guarded(() => setMode('before')));
buttons.at.addEventListener('click', guarded(() => setMode('at')));
buttons.after.addEventListener('click', guarded(() => setMode('after')));
buttons.apply.addEventListener('click', guarded(save));
buttons.cancel.addEventListener('click', guarded(cancel));
buttons.reset.addEventListener('click', guarded(resetDraft));
buttons.disable.addEventListener('click', guarded(disablePackage));
buttons.enable.addEventListener('click', guarded(enablePackage));

try {
  chart.timeScale().fitContent();
  await reconcile('At observation');
  await selectCurrent();
  globalThis.__fvgEvidenceInspectorFixture = Object.freeze({
    afterObservation: () => setMode('after'),
    atObservation: () => setMode('at'),
    beforeObservation: () => setMode('before'),
    cancel,
    candleBytes: () => JSON.stringify(series.data()),
    disablePackage,
    enablePackage,
    initialCandleBytes,
    logicalRange: () => chart.timeScale().getVisibleLogicalRange(),
    resetDraft,
    save,
    snapshot,
    updateBounds,
    updateField,
  });
  globalThis.__disposeFvgEvidenceInspectorFixture = async () => {
    await inspector.dispose();
    await previewPort.dispose();
    await annotationRuntime.dispose();
    await semanticRegistry.dispose();
    await projectionRuntime.dispose();
    await acceptedPort.dispose();
    chart.remove();
  };
  body.dataset.scenario = 'ready';
} catch (error) {
  fail(error);
}
