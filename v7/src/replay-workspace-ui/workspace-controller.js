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
import { createSourceBatchLedger } from './source-batch-ledger.js';

function formatCursor(epochMs) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: '2-digit', hour: '2-digit', hour12: false, minute: '2-digit', month: '2-digit',
    timeZoneName: 'short', year: 'numeric',
  });
  return formatter.format(new Date(epochMs));
}

function createReplayPort(replay) {
  return Object.freeze({
    commitVisible: (proposal, workspaceSnapshot) => replay.commitVisible(proposal, {
      visibleThroughEpochMs: workspaceSnapshot.provenance.visibleThroughEpochMs,
    }),
    propose: ({ identity, input, operation }) => operation.endsWith('-replacement')
      || operation === 'history-extension'
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
  view.setSessionRange({ end: formatCursor(range.endEpochMs), start: formatCursor(range.startEpochMs) });
  const viewport = createViewportController({
    defaultSpanBars: 80,
    initialIntent: createInitialViewportIntent({
      activationGeneration: record.activationGeneration,
      cursorEpochMs: range.startEpochMs,
      latestOffsetBars: 12,
      paneId: 'pane-main',
      sessionId: record.sessionId,
    }),
  });
  const sourceBatches = createSourceBatchLedger();
  const adapter = createLightweightChartAdapter({
    host: view.chartHost,
    onHistoryBoundary: (range) => {
      if (range.from < 24) void requestLeftExtension();
    },
    onViewportIntent: (intent) => view.setWall(intent.origin),
    viewportPort: viewport,
  });
  const chartApplication = createChartSnapshotApplication({
    activationGeneration: record.activationGeneration,
    adapter,
    sessionId: record.sessionId,
  });
  const barData = createBarDataRuntime({
    maxCacheEntries: 16,
    maxConcurrentRequests: 1,
    resolveProvider: () => market.provider,
  });
  const runtime = createWorkspaceTransactionRuntime({
    activationGeneration: record.activationGeneration,
    acquisitionPort: Object.freeze({ acquire: ({ input }) => barData.acquire(input.request) }),
    projectionPort: Object.freeze({
      project: ({ acquired, input, operation, proposal }) => {
        const selection = input.selection ?? currentSelection();
        const projectionBatches = sourceBatches.stage(acquired, operation);
        return projectPaneSnapshot({
          aggregationPolicy: selection.aggregationPolicy,
          calendar: selection.calendar,
          cursorProposal: proposal,
          displayTimeframe: selection.displayTimeframe,
          instrument: selection.instrument,
          paneId: 'pane-main',
          schemaVersion: 1,
          sessionHoursPolicy: selection.sessionHoursPolicy,
          sourceBatches: projectionBatches,
        });
      },
    }),
    replayPort: createReplayPort(replay),
    sessionId: record.sessionId,
    visibleCompletionPort: chartApplication,
  });
  const replacement = createWorkspaceReplacementExecutor({ catalog: market.catalog, transactionRuntime: runtime });
  let disposed = false;
  let historyRequestQueued = false;
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
    const workspaceSnapshot = runtime.snapshot().acceptedSnapshot.workspace;
    viewport.moveCursor(workspaceSnapshot.provenance.visibleThroughEpochMs);
    view.setCursor(formatCursor(workspaceSnapshot.provenance.visibleThroughEpochMs));
    view.setEvidence({ replayRevision: replaySnapshot.revision, workspaceRevision: runtime.snapshot().acceptedRevision });
    view.setSelection(acceptedTarget());
    view.setVisibleThrough({
      barCount: workspaceSnapshot.bars.length,
      text: formatCursor(workspaceSnapshot.provenance.visibleThroughEpochMs),
    });
    view.setWall(readViewportIntent(viewport.snapshot()).origin);
    view.setState('ready');
  }

  async function execute(operation, { durationMs = null, request = market.request } = {}) {
    if (disposed || pending) return;
    pending = true;
    view.setState(operation === 'chart-entry' ? 'loading' : 'stale');
    const intent = identity(operation);
    const input = Object.freeze({
      ...(durationMs === null ? {} : {
        advance: createReplayAdvanceInput({ durationMs, source: 'manual' }),
      }),
      request,
    });
    try {
      const terminal = describeWorkspaceTransactionEnvelope(await runtime.execute({ input, intent }));
      if (terminal.status !== 'committed') throw Object.assign(new Error(terminal.code), { code: terminal.code });
      sourceBatches.accept();
      acceptVisibleState();
    } catch (error) {
      if (!disposed) view.setState('error', { message: error?.message });
    } finally {
      sourceBatches.reject();
      pending = false;
      const logicalFrom = adapter.snapshot().logicalRange?.from;
      const shouldExtend = historyRequestQueued
        || (operation === 'history-extension' && Number.isFinite(logicalFrom) && logicalFrom < 24);
      historyRequestQueued = false;
      if (shouldExtend && !disposed) queueMicrotask(requestLeftExtension);
    }
  }

  function requestLeftExtension() {
    if (disposed) return undefined;
    if (pending) {
      historyRequestQueued = true;
      return undefined;
    }
    const oldestEpochMs = sourceBatches.oldestEpochMs();
    if (oldestEpochMs === null || oldestEpochMs <= 0) return undefined;
    return execute('history-extension', { request: market.requestBefore(oldestEpochMs) });
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
        intent: identity(`${kind}-replacement`), request: market.requestThrough(replay.snapshot().cursorEpochMs), target,
      }));
      if (terminal.status !== 'committed') throw Object.assign(new Error(terminal.code), { code: terminal.code });
      sourceBatches.accept();
      acceptVisibleState();
    } catch (error) {
      if (!disposed) {
        view.setSelection(acceptedTarget());
        view.setState('error', { message: error?.message });
      }
    } finally {
      sourceBatches.reject();
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
    next() {
      if (disposed || pending) return;
      try {
        const plan = market.planEligibleMinutes({
          count: 1,
          cursorEpochMs: replay.snapshot().cursorEpochMs,
          selection: currentSelection(),
        });
        return execute('manual-next', { durationMs: plan.durationMs, request: plan.request });
      } catch (error) {
        view.setState('error', { message: error?.message });
        return undefined;
      }
    },
    replaceSessionHours: (mode) => replace('session-hours', mode),
    replaceTimeframe: (timeframeId) => replace('timeframe', timeframeId),
    resetView() { adapter.resetView(12); },
    snapshot: () => Object.freeze({
      chart: adapter.snapshot(),
      replay: replay.snapshot(),
      viewportIntent: viewport.snapshot(),
      workspace: runtime.snapshot(),
    }),
    start() {
      try {
        return execute('chart-entry', { durationMs: market.entryAdvanceMs, request: market.request });
      } catch (error) {
        view.setState('unavailable', { message: error?.message });
        return undefined;
      }
    },
  });
}
