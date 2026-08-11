import { createActivationGeneration } from '../../../src/activation-generation/public.js';
import { createChartSnapshotApplication } from '../../../src/chart-snapshot-application/public.js';
import { createProductionManualAnnotationWorkflow } from '../../../src/annotation-manual-workflow/public.js';
import { createLightweightChartAdapter } from '../../../src/lightweight-chart-adapter/public.js';
import { createReplayAdvanceInput, createReplayCursorProposal } from '../../../src/replay-contract/public.js';
import { createAnnotationWorkflowControl } from '../../../src/replay-workspace-ui/annotation-workflow-control.js';
import { createSessionId } from '../../../src/session-identity/public.js';
import { createTransactionId } from '../../../src/transaction-identity/public.js';
import { createInitialViewportIntent, createViewportController } from '../../../src/viewport-runtime/public.js';
import { createWorkspaceTransactionIdentity } from '../../../src/workspace-transaction-contract/public.js';
import { createWorkstationSettings } from '../../../src/workstation-settings/public.js';

const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const CUTOFF = BASE + (16 * MINUTE);
const PANE_ID = 'pane-main';
const sessionId = createSessionId('session.r13-10e-production-fixture');
const activationGeneration = createActivationGeneration(1);
const identity = createWorkspaceTransactionIdentity({
  activationGeneration,
  sessionId,
  transactionId: createTransactionId('r13-10e-production-fixture'),
});
const proposal = createReplayCursorProposal({
  advance: createReplayAdvanceInput({ durationMs: MINUTE, source: 'manual' }),
  baseRevision: 0,
  cursorEpochMs: CUTOFF,
  identity,
  range: { endEpochMs: BASE + (30 * MINUTE), startEpochMs: BASE },
});

function marketBars() {
  const values = Array.from({ length: 16 }, (_, index) => {
    const open = 99 + (index * 0.32);
    const close = open + (index % 2 === 0 ? 0.24 : -0.18);
    return {
      close,
      high: Math.max(open, close) + 0.7,
      low: Math.min(open, close) - 0.7,
      open,
      volume: 20 + index,
    };
  });
  values[4] = { close: 100.5, high: 101, low: 99, open: 100, volume: 31 };
  values[5] = { close: 104, high: 105, low: 100, open: 100.5, volume: 42 };
  values[6] = { close: 105, high: 106, low: 103, open: 104, volume: 36 };
  return Object.freeze(values.map((value, index) => Object.freeze({
    ...value,
    displayEpochMs: BASE + (index * MINUTE),
    endEpochMs: BASE + ((index + 1) * MINUTE),
    startEpochMs: BASE + (index * MINUTE),
  })));
}

const bars = marketBars();
const chartBars = Object.freeze(bars.map(({ endEpochMs: _endEpochMs, ...bar }) => Object.freeze(bar)));
const provenance = Object.freeze({
  cursorProposal: proposal,
  datasetRevision: 'dataset.r13-10e-fixture',
  displayTimeframeDurationMs: MINUTE,
  displayTimeframeId: 'timeframe.1m',
  instrumentId: 'instrument.nq',
  sessionHoursMode: 'eth',
  sourceResolutionId: 'timeframe.1m',
  visibleThroughEpochMs: CUTOFF,
});
const paneSnapshot = Object.freeze({ bars: chartBars, paneId: PANE_ID, provenance, schemaVersion: 1 });
const acceptedWorkspace = Object.freeze({
  replay: Object.freeze({ cursorEpochMs: CUTOFF }),
  revision: 52,
  workspace: Object.freeze({
    panes: Object.freeze([{ paneId: PANE_ID, snapshot: paneSnapshot, status: 'ready' }]),
    responsePlan: Object.freeze({ activePaneId: PANE_ID }),
  }),
});

const chartHost = document.getElementById('chart');
const viewport = createViewportController({
  defaultSpanBars: 24,
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
  identity,
  signal: new AbortController().signal,
  workspaceSnapshot: paneSnapshot,
});
const receipt = await prepared.apply();
prepared.finalize(receipt);
const initialChart = adapter.snapshot();
let annotationSurface = null;
const chartSurfacePort = Object.freeze({
  annotationSurfaces(projectionApi) {
    annotationSurface ??= adapter.annotationSurface(projectionApi, PANE_ID);
    return Object.freeze([annotationSurface]);
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
  const accepted = surfaceSnapshot?.accepted.projectionCount ?? 0;
  const preview = surfaceSnapshot?.preview.projectionCount ?? 0;
  projectionStatus.textContent = `accepted ${accepted} · preview ${preview}`;
  status.textContent = `${value.status} · doc ${workflowSnapshot?.annotationDocumentRevision ?? 0}`;
  document.body.dataset.documentRevision = String(workflowSnapshot?.annotationDocumentRevision ?? 0);
  document.body.dataset.inspectorOpen = String(value.inspector.open);
  document.body.dataset.previewCount = String(preview);
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
await workflow.acceptWorkspace(acceptedWorkspace);
render(latestView);
document.body.dataset.scenario = 'ready';

function barTarget(index) {
  const snapshot = adapter.snapshot();
  const rect = chartHost.getBoundingClientRect();
  const latestIndex = bars.length - 1;
  const spacing = snapshot.latestCandleCoordinate / (latestIndex - snapshot.logicalRange.from);
  return Object.freeze({
    x: rect.left + snapshot.latestCandleCoordinate + ((index - latestIndex) * spacing),
    y: rect.top + Math.min(rect.height - 50, Math.max(80, rect.height * 0.52)),
  });
}

function artifactTarget() {
  if (annotationSurface === null) return null;
  const rect = chartHost.getBoundingClientRect();
  for (let y = 20; y < rect.height - 30; y += 3) {
    for (let x = 8; x < rect.width - 70; x += 3) {
      if (annotationSurface.acceptedPort.hitTest({ tolerancePx: 2, x, y }) !== null) {
        return Object.freeze({ x: rect.left + x, y: rect.top + y });
      }
    }
  }
  return null;
}

globalThis.__h114 = Object.freeze({
  artifactTarget,
  barTarget,
  state() {
    const chart = adapter.snapshot();
    return Object.freeze({
      artifactTarget: artifactTarget(),
      chart: Object.freeze({
        barCount: chart.barCount,
        logicalRange: chart.logicalRange,
        seriesDataRevision: chart.seriesDataRevision,
      }),
      initialChart: Object.freeze({
        barCount: initialChart.barCount,
        seriesDataRevision: initialChart.seriesDataRevision,
      }),
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
    control.dispose();
  });
}, { once: true });
