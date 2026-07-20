import { createBarDataRuntime } from '../bar-data-runtime/public.js';
import { createChartSnapshotApplication } from '../chart-snapshot-application/public.js';
import { createLightweightChartAdapter } from '../lightweight-chart-adapter/public.js';
import { projectPaneSnapshot } from '../projection-domain/public.js';
import { createReplayAdvanceInput } from '../replay-contract/public.js';
import { createReplayRuntime } from '../replay-runtime/public.js';
import { createTransactionId } from '../transaction-identity/public.js';
import {
  createInitialViewportIntent,
  createViewportController,
  readViewportIntent,
} from '../viewport-runtime/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../workspace-transaction-contract/public.js';
import { createWorkspaceTransactionRuntime } from '../workspace-transaction-runtime/public.js';
import { createWorkspaceReplacementExecutor } from '../workspace-replacement-runtime/public.js';
import { createFoundationMarket } from './foundation-market.js';

function formatCursor(epochMs) {
  return `${new Date(epochMs).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function createReplayPort(replay) {
  return Object.freeze({
    commitVisible: (proposal, workspaceSnapshot) => replay.commitVisible(proposal, {
      visibleThroughEpochMs: workspaceSnapshot.provenance.visibleThroughEpochMs,
    }),
    propose: ({ identity, input, operation }) => operation.endsWith('-replacement')
      ? replay.proposeRetention({ identity })
      : replay.proposeAdvance({ advance: input.advance, identity }),
    reject: (proposal) => replay.reject(proposal),
  });
}

/** Wire the complete R4.5 public-owner path for one visible NQ pane. */
export function createReplayWorkspaceController({ record, view }) {
  const market = createFoundationMarket(record);
  const range = record.configuration.historicalRange;
  const replay = createReplayRuntime({
    activationGeneration: record.activationGeneration,
    initialCursorEpochMs: range.startEpochMs,
    range,
    sessionId: record.sessionId,
  });
  const viewport = createViewportController({
    defaultSpanBars: 136,
    initialIntent: createInitialViewportIntent({
      activationGeneration: record.activationGeneration,
      cursorEpochMs: range.startEpochMs,
      latestOffsetBars: 8,
      paneId: 'pane-main',
      sessionId: record.sessionId,
    }),
  });
  const adapter = createLightweightChartAdapter({
    host: view.chartHost,
    onViewportIntent: (intent) => view.setWall(intent.origin),
    viewportPort: viewport,
  });
  const chartApplication = createChartSnapshotApplication({
    activationGeneration: record.activationGeneration,
    adapter,
    sessionId: record.sessionId,
  });
  const barData = createBarDataRuntime({
    maxCacheEntries: 4,
    maxConcurrentRequests: 1,
    resolveProvider: () => market.provider,
  });
  const runtime = createWorkspaceTransactionRuntime({
    activationGeneration: record.activationGeneration,
    acquisitionPort: Object.freeze({ acquire: ({ input }) => barData.acquire(input.request) }),
    projectionPort: Object.freeze({
      project: ({ acquired, input, proposal }) => {
        const selection = input.selection ?? currentSelection();
        return projectPaneSnapshot({
          aggregationPolicy: selection.aggregationPolicy,
          calendar: selection.calendar,
          cursorProposal: proposal,
          displayTimeframe: selection.displayTimeframe,
          instrument: selection.instrument,
          paneId: 'pane-main',
          schemaVersion: 1,
          sessionHoursPolicy: selection.sessionHoursPolicy,
          sourceBatches: [acquired],
        });
      },
    }),
    replayPort: createReplayPort(replay),
    sessionId: record.sessionId,
    visibleCompletionPort: chartApplication,
  });
  const replacement = createWorkspaceReplacementExecutor({ catalog: market.catalog, transactionRuntime: runtime });
  let disposed = false;
  let pending = false;
  let transactionSequence = 0;

  function acceptedTarget() {
    const provenance = runtime.snapshot().acceptedSnapshot?.workspace.provenance;
    return provenance ? Object.freeze({
      instrumentId: provenance.instrumentId,
      sessionHoursMode: provenance.sessionHoursMode,
      timeframeId: provenance.displayTimeframeId,
    }) : market.defaultTarget;
  }

  function currentSelection() { return market.catalog.get(acceptedTarget()); }

  function identity(operation) {
    const transactionIdentity = createWorkspaceTransactionIdentity({
      activationGeneration: record.activationGeneration,
      sessionId: record.sessionId,
      transactionId: createTransactionId(`workspace-${++transactionSequence}`),
    });
    return createWorkspaceTransactionIntent({ identity: transactionIdentity, operation });
  }

  function acceptVisibleState() {
    const replaySnapshot = replay.snapshot();
    viewport.moveCursor(replaySnapshot.cursorEpochMs);
    view.setCursor(formatCursor(replaySnapshot.cursorEpochMs));
    view.setEvidence({ replayRevision: replaySnapshot.revision, workspaceRevision: runtime.snapshot().acceptedRevision });
    view.setSelection(acceptedTarget());
    view.setWall(readViewportIntent(viewport.snapshot()).origin);
    view.setState('ready');
  }

  async function execute(operation, durationMs) {
    if (disposed || pending) return;
    pending = true;
    view.setState(operation === 'chart-entry' ? 'loading' : 'stale');
    const intent = identity(operation);
    const input = Object.freeze({
      advance: createReplayAdvanceInput({ durationMs, source: 'manual' }),
      request: market.request,
    });
    try {
      const terminal = describeWorkspaceTransactionEnvelope(await runtime.execute({ input, intent }));
      if (terminal.status !== 'committed') throw Object.assign(new Error(terminal.code), { code: terminal.code });
      acceptVisibleState();
    } catch (error) {
      if (!disposed) view.setState('error', { message: error?.message });
    } finally {
      pending = false;
    }
  }

  async function replace(kind, value) {
    if (disposed || pending) return;
    const current = acceptedTarget();
    const target = Object.freeze({
      ...current,
      ...(kind === 'timeframe' ? { timeframeId: value } : { sessionHoursMode: value }),
    });
    if (target.timeframeId === current.timeframeId && target.sessionHoursMode === current.sessionHoursMode) return;
    pending = true;
    view.setState('stale');
    try {
      const terminal = describeWorkspaceTransactionEnvelope(await replacement.execute({
        intent: identity(`${kind}-replacement`), request: market.request, target,
      }));
      if (terminal.status !== 'committed') throw Object.assign(new Error(terminal.code), { code: terminal.code });
      acceptVisibleState();
    } catch (error) {
      if (!disposed) {
        view.setSelection(acceptedTarget());
        view.setState('error', { message: error?.message });
      }
    } finally {
      pending = false;
    }
  }

  return Object.freeze({
    dispose() {
      if (disposed) return;
      disposed = true;
      runtime.dispose();
      chartApplication.dispose();
      adapter.dispose();
      barData.dispose();
      replay.dispose();
    },
    next: () => execute('manual-next', 60_000),
    replaceSessionHours: (mode) => replace('session-hours', mode),
    replaceTimeframe: (timeframeId) => replace('timeframe', timeframeId),
    resetView() { adapter.resetView(8); },
    snapshot: () => Object.freeze({
      chart: adapter.snapshot(),
      replay: replay.snapshot(),
      viewportIntent: viewport.snapshot(),
      workspace: runtime.snapshot(),
    }),
    start: () => execute('chart-entry', 120 * 60_000),
  });
}
