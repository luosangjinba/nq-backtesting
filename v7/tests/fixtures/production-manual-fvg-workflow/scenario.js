import { createActivationGeneration } from '../../../src/activation-generation/public.js';
import { createChartSnapshotApplication } from '../../../src/chart-snapshot-application/public.js';
import { createProductionManualAnnotationWorkflow } from '../../../src/annotation-manual-workflow/public.js';
import { projectFixedDurationBars } from '../../../src/fixed-timeframe-domain/public.js';
import { createLightweightChartAdapter } from '../../../src/lightweight-chart-adapter/public.js';
import { createReplayCursorRetentionProposal } from '../../../src/replay-contract/public.js';
import { createAnnotationWorkflowControl } from '../../../src/replay-workspace-ui/annotation-workflow-control.js';
import { createSessionId } from '../../../src/session-identity/public.js';
import { createTransactionId } from '../../../src/transaction-identity/public.js';
import { createInitialViewportIntent, createViewportController } from '../../../src/viewport-runtime/public.js';
import { createWorkspaceTransactionIdentity } from '../../../src/workspace-transaction-contract/public.js';
import { createWorkstationSettings } from '../../../src/workstation-settings/public.js';

const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const FIVE_MINUTES = 5 * MINUTE;
const FIFTEEN_MINUTES = 15 * MINUTE;
const CUTOFF = BASE + (45 * MINUTE);
const PANE_ID = 'pane-main';
const COARSE_PANE_ID = 'pane-second';
const TOOL_ID = 'construct.imbalance.fvg';
const sessionId = createSessionId('session.r13-10e-production-fixture');
const activationGeneration = createActivationGeneration(1);
let transactionSequence = 0;

function marketBars() {
  const values = Array.from({ length: 45 }, (_, index) => {
    let open = 99.4 + ((index % 5) * 0.08);
    let close = open + (index % 2 === 0 ? 0.18 : -0.12);
    let high = Math.max(open, close) + 0.45;
    let low = Math.min(open, close) - 0.45;
    if (index >= 15 && index < 20) {
      open = 99.8 + ((index - 15) * 0.05);
      close = open + 0.12;
      high = Math.max(open, close) + 0.55;
      low = Math.min(open, close) - 0.55;
    } else if (index >= 20 && index < 25) {
      open = 103.6 + ((index - 20) * 0.08);
      close = open + 0.2;
      high = Math.max(open, close) + 0.7;
      low = Math.min(open, close) - 0.6;
    } else if (index >= 25 && index < 30) {
      open = 104.1 + ((index - 25) * 0.08);
      close = open + 0.18;
      high = Math.max(open, close) + 0.65;
      low = Math.min(open, close) - 0.85;
    } else if (index >= 30) {
      open = 111.5 + ((index - 30) * 0.05);
      close = open + (index % 2 === 0 ? 0.2 : -0.1);
      high = Math.max(open, close) + 0.5;
      low = Math.min(open, close) - 0.5;
    }
    return {
      close, high, low, open,
      volume: 20 + index,
    };
  });
  values[4] = { close: 100.5, high: 101, low: 99, open: 100, volume: 31 };
  values[5] = { close: 104, high: 105, low: 100, open: 100.5, volume: 42 };
  values[6] = { close: 105, high: 106, low: 103, open: 104, volume: 36 };
  return Object.freeze(values.map((value, index) => Object.freeze({
    ...value,
    startEpochMs: BASE + (index * MINUTE),
  })));
}

const sourceBars = marketBars();
const chartBars = Object.freeze(sourceBars.map((bar) => Object.freeze({
  ...bar,
  displayEpochMs: bar.startEpochMs,
})));
const fiveMinuteBars = projectFixedDurationBars({
  bars: sourceBars,
  durationMs: FIVE_MINUTES,
  offsetMs: 0,
  sourceDurationMs: MINUTE,
});
const fifteenMinuteBars = projectFixedDurationBars({
  bars: sourceBars,
  durationMs: FIFTEEN_MINUTES,
  offsetMs: 0,
  sourceDurationMs: MINUTE,
});
const timeframeDefinitions = Object.freeze({
  'timeframe.1m': Object.freeze({ bars: chartBars, durationMs: MINUTE, label: '1m' }),
  'timeframe.5m': Object.freeze({ bars: fiveMinuteBars, durationMs: FIVE_MINUTES, label: '5m' }),
  'timeframe.15m': Object.freeze({
    bars: fifteenMinuteBars,
    durationMs: FIFTEEN_MINUTES,
    label: '15m',
  }),
});

function nextTransactionIdentity(label) {
  transactionSequence += 1;
  return createWorkspaceTransactionIdentity({
    activationGeneration,
    sessionId,
    transactionId: createTransactionId(`r13-10e-${label}-${transactionSequence}`),
  });
}

function createPaneSnapshot(paneId, timeframeId, identity) {
  const definition = timeframeDefinitions[timeframeId];
  const proposal = createReplayCursorRetentionProposal({
    baseRevision: 0,
    cursorEpochMs: CUTOFF,
    identity,
    range: { endEpochMs: BASE + (60 * MINUTE), startEpochMs: BASE },
  });
  return Object.freeze({
    bars: definition.bars,
    paneId,
    provenance: Object.freeze({
      cursorProposal: proposal,
      datasetRevision: 'dataset.r13-10e-fixture',
      displayTimeframeDurationMs: definition.durationMs,
      displayTimeframeId: timeframeId,
      instrumentId: 'instrument.nq',
      sessionHoursMode: 'eth',
      sourceResolutionId: timeframeId,
      visibleThroughEpochMs: CUTOFF - MINUTE,
    }),
    schemaVersion: 1,
  });
}

const initialMainIdentity = nextTransactionIdentity('main-initial');
let paneSnapshot = createPaneSnapshot(PANE_ID, 'timeframe.1m', initialMainIdentity);
const coarseIdentity = nextTransactionIdentity('coarse-initial');
const coarsePaneSnapshot = createPaneSnapshot(
  COARSE_PANE_ID,
  'timeframe.15m',
  coarseIdentity,
);
let workspaceRevision = 52;

function acceptedWorkspace() {
  return Object.freeze({
    replay: Object.freeze({ cursorEpochMs: CUTOFF }),
    revision: workspaceRevision,
    workspace: Object.freeze({
      panes: Object.freeze([
        Object.freeze({ paneId: PANE_ID, snapshot: paneSnapshot, status: 'ready' }),
        Object.freeze({ paneId: COARSE_PANE_ID, snapshot: coarsePaneSnapshot, status: 'ready' }),
      ]),
      responsePlan: Object.freeze({ activePaneId: PANE_ID }),
    }),
  });
}

const chartHost = document.getElementById('chart');
const viewport = createViewportController({
  defaultSpanBars: 50,
  initialIntent: createInitialViewportIntent({
    activationGeneration,
    cursorEpochMs: CUTOFF,
    latestOffsetBars: 5,
    paneId: PANE_ID,
    sessionId,
  }),
});
const adapter = createLightweightChartAdapter({ host: chartHost, viewportPort: viewport });
adapter.applyWorkstationSettings(createWorkstationSettings(), '0.25', 'NQ');
const chartApplication = createChartSnapshotApplication({ activationGeneration, adapter, sessionId });
const prepared = await chartApplication.prepare({
  identity: initialMainIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: paneSnapshot,
});
const receipt = await prepared.apply();
prepared.finalize(receipt);
const initialChart = adapter.snapshot();
const coarseChartHost = document.getElementById('chart-coarse');
const coarseViewport = createViewportController({
  defaultSpanBars: 8,
  initialIntent: createInitialViewportIntent({
    activationGeneration,
    cursorEpochMs: CUTOFF,
    latestOffsetBars: 2,
    paneId: COARSE_PANE_ID,
    sessionId,
  }),
});
const coarseAdapter = createLightweightChartAdapter({
  host: coarseChartHost,
  viewportPort: coarseViewport,
});
coarseAdapter.applyWorkstationSettings(createWorkstationSettings(), '0.25', 'NQ');
const coarseChartApplication = createChartSnapshotApplication({
  activationGeneration,
  adapter: coarseAdapter,
  sessionId,
});
const coarsePrepared = await coarseChartApplication.prepare({
  identity: coarseIdentity,
  signal: new AbortController().signal,
  workspaceSnapshot: coarsePaneSnapshot,
});
const coarseReceipt = await coarsePrepared.apply();
coarsePrepared.finalize(coarseReceipt);
const initialCoarseChart = coarseAdapter.snapshot();
let annotationSurface = null;
let coarseAnnotationSurface = null;
const chartSurfacePort = Object.freeze({
  annotationSurfaces(projectionApi) {
    annotationSurface ??= adapter.annotationSurface(projectionApi, PANE_ID);
    coarseAnnotationSurface ??= coarseAdapter.annotationSurface(projectionApi, COARSE_PANE_ID);
    return Object.freeze([annotationSurface, coarseAnnotationSurface]);
  },
});

const moduleDescriptors = await Promise.all([
  '../../../src/plugin-contract/module.json',
  '../../../src/semantic-fair-value-gap/module.json',
].map(async (path) => (await fetch(path)).json()));
const moduleIds = Object.freeze(moduleDescriptors.map(({ id }) => id));
const status = document.getElementById('fixture-status');
const projectionStatus = document.getElementById('projection-status');
let latestView = null;
let workflow = null;

function guarded(operation) {
  return Promise.resolve().then(operation).catch((error) => {
    document.body.dataset.actionError = `${error?.code ?? error?.name}:${error?.message}`;
  });
}

const control = createAnnotationWorkflowControl({
  onApply: () => guarded(() => workflow.applyInspector()),
  onCancel: () => guarded(() => workflow.cancelInspector()),
  onReset: () => guarded(() => workflow.resetInspector()),
  onToggleTool: (toolId) => guarded(() => workflow.toggleTool(toolId)),
  onUpdateField: (value) => guarded(() => workflow.updateInspectorField(value)),
});
document.getElementById('annotation-tools').append(control.root);
document.getElementById('annotation-inspector-slot').append(control.inspector);

function render(value) {
  latestView = value;
  control.setSnapshot(value);
  const workflowSnapshot = workflow?.snapshot() ?? null;
  const surfaceSnapshot = annotationSurface?.snapshot() ?? null;
  const coarseSurfaceSnapshot = coarseAnnotationSurface?.snapshot() ?? null;
  const accepted = surfaceSnapshot?.accepted.projectionCount ?? 0;
  const coarseAccepted = coarseSurfaceSnapshot?.accepted.projectionCount ?? 0;
  const preview = surfaceSnapshot?.preview.projectionCount ?? 0;
  const coarsePreview = coarseSurfaceSnapshot?.preview.projectionCount ?? 0;
  const mainLabel = timeframeDefinitions[paneSnapshot.provenance.displayTimeframeId].label;
  projectionStatus.textContent = `${mainLabel} ${accepted}/${preview} · 15m ${coarseAccepted}/${coarsePreview}`;
  status.textContent = `${value.status} · doc ${workflowSnapshot?.annotationDocumentRevision ?? 0}`;
  document.body.dataset.documentRevision = String(workflowSnapshot?.annotationDocumentRevision ?? 0);
  document.body.dataset.inspectorOpen = String(value.inspector.open);
  document.body.dataset.previewCount = String(preview);
  document.body.dataset.coarseAcceptedCount = String(coarseAccepted);
  document.body.dataset.coarsePreviewCount = String(coarsePreview);
  document.body.dataset.mainTimeframe = paneSnapshot.provenance.displayTimeframeId;
  document.body.dataset.workflowStatus = value.status;
}

workflow = createProductionManualAnnotationWorkflow({
  chartSurfacePort,
  idFactory: () => crypto.randomUUID(),
  moduleDescriptors,
  nowEpochMs: () => Date.now(),
  readModuleHostSnapshot: () => Object.freeze({ moduleIds, status: 'running' }),
  sessionId,
  storage: localStorage,
  view: Object.freeze({ setAnnotationWorkflow: render }),
});
await workflow.start();
await workflow.acceptWorkspace(acceptedWorkspace());
render(latestView);
document.body.dataset.scenario = 'ready';

function barTarget(index) {
  const snapshot = adapter.snapshot();
  const rect = chartHost.getBoundingClientRect();
  const latestIndex = paneSnapshot.bars.length - 1;
  const spacing = snapshot.latestCandleCoordinate / (latestIndex - snapshot.logicalRange.from);
  return Object.freeze({
    x: rect.left + snapshot.latestCandleCoordinate + ((index - latestIndex) * spacing),
    y: rect.top + Math.min(rect.height - 50, Math.max(80, rect.height * 0.52)),
  });
}

function findArtifactTarget(surface, host, entityId = null) {
  if (surface === null) return null;
  const rect = host.getBoundingClientRect();
  for (let y = 20; y < rect.height - 30; y += 3) {
    for (let x = 8; x < rect.width - 70; x += 3) {
      const hit = surface.acceptedPort.hitTest({ tolerancePx: 2, x, y });
      if (hit !== null && (entityId === null || hit.entityId === entityId)) {
        return Object.freeze({ x: rect.left + x, y: rect.top + y });
      }
    }
  }
  return null;
}

function artifactTarget(entityId = null) {
  return findArtifactTarget(annotationSurface, chartHost, entityId);
}

function coarseArtifactTarget(entityId = null) {
  return findArtifactTarget(coarseAnnotationSurface, coarseChartHost, entityId);
}

async function switchMainTimeframe(timeframeId) {
  if (!Object.hasOwn(timeframeDefinitions, timeframeId)) {
    throw new TypeError(`Unknown fixture timeframe ${timeframeId}.`);
  }
  const identity = nextTransactionIdentity(`main-${timeframeDefinitions[timeframeId].label}`);
  const nextSnapshot = createPaneSnapshot(PANE_ID, timeframeId, identity);
  const nextPrepared = await chartApplication.prepare({
    identity,
    signal: new AbortController().signal,
    workspaceSnapshot: nextSnapshot,
  });
  const nextReceipt = await nextPrepared.apply();
  nextPrepared.finalize(nextReceipt);
  paneSnapshot = nextSnapshot;
  workspaceRevision += 1;
  await workflow.acceptWorkspace(acceptedWorkspace());
  render(latestView);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function armMainTool() {
  return workflow.toggleTool(TOOL_ID, PANE_ID);
}

globalThis.__h114 = Object.freeze({
  armMainTool,
  artifactTarget,
  barTarget,
  coarseArtifactTarget,
  switchMainTimeframe,
  state() {
    const chart = adapter.snapshot();
    const coarseChart = coarseAdapter.snapshot();
    return Object.freeze({
      artifactTarget: artifactTarget(),
      chart: Object.freeze({
        barCount: chart.barCount,
        displayEpochMs: Object.freeze(paneSnapshot.bars.map((bar) => bar.displayEpochMs)),
        logicalRange: chart.logicalRange,
        seriesDataRevision: chart.seriesDataRevision,
        timeframeId: paneSnapshot.provenance.displayTimeframeId,
      }),
      initialChart: Object.freeze({
        barCount: initialChart.barCount,
        seriesDataRevision: initialChart.seriesDataRevision,
      }),
      coarseArtifactTarget: coarseArtifactTarget(),
      coarseChart: Object.freeze({
        barCount: coarseChart.barCount,
        logicalRange: coarseChart.logicalRange,
        seriesDataRevision: coarseChart.seriesDataRevision,
      }),
      initialCoarseChart: Object.freeze({
        barCount: initialCoarseChart.barCount,
        seriesDataRevision: initialCoarseChart.seriesDataRevision,
      }),
      coarseSurface: coarseAnnotationSurface?.snapshot() ?? null,
      surface: annotationSurface?.snapshot() ?? null,
      view: latestView,
      workflow: workflow.snapshot(),
    });
  },
});

addEventListener('pagehide', () => {
  void workflow.dispose().finally(() => {
    chartApplication.dispose();
    adapter.dispose();
    coarseChartApplication.dispose();
    coarseAdapter.dispose();
    control.dispose();
  });
}, { once: true });
