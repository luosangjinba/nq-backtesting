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
import { createFoundationMarket } from './foundation-market.js';

function formatCursor(epochMs) {
  return `${new Date(epochMs).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function createReplayPort(replay) {
  return Object.freeze({
    commitVisible: (proposal) => replay.commitVisible(proposal),
    propose: ({ identity, input }) => replay.proposeAdvance({ advance: input.advance, identity }),
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
    defaultSpanBars: 96,
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
      project: ({ acquired, proposal }) => projectPaneSnapshot({
        aggregationPolicy: market.policies.aggregationPolicy,
        calendar: market.calendar,
        cursorProposal: proposal,
        displayTimeframe: market.displayTimeframe,
        instrument: market.instrument,
        paneId: 'pane-main',
        schemaVersion: 1,
        sessionHoursPolicy: market.policies.sessionHoursPolicy,
        sourceBatches: [acquired],
      }),
    }),
    replayPort: createReplayPort(replay),
    sessionId: record.sessionId,
    visibleCompletionPort: chartApplication,
  });
  let disposed = false;
  let pending = false;
  let transactionSequence = 0;

  async function execute(operation, durationMs) {
    if (disposed || pending) return;
    pending = true;
    view.setState(operation === 'chart-entry' ? 'loading' : 'stale');
    const identity = createWorkspaceTransactionIdentity({
      activationGeneration: record.activationGeneration,
      sessionId: record.sessionId,
      transactionId: createTransactionId(`workspace-${++transactionSequence}`),
    });
    const intent = createWorkspaceTransactionIntent({ identity, operation });
    const input = Object.freeze({
      advance: createReplayAdvanceInput({ durationMs, source: 'manual' }),
      request: market.request,
    });
    try {
      const terminal = describeWorkspaceTransactionEnvelope(await runtime.execute({ input, intent }));
      if (terminal.status !== 'committed') throw Object.assign(new Error(terminal.code), { code: terminal.code });
      const replaySnapshot = replay.snapshot();
      viewport.moveCursor(replaySnapshot.cursorEpochMs);
      view.setCursor(formatCursor(replaySnapshot.cursorEpochMs));
      view.setEvidence({
        replayRevision: replaySnapshot.revision,
        workspaceRevision: runtime.snapshot().acceptedRevision,
      });
      view.setWall(readViewportIntent(viewport.snapshot()).origin);
      view.setState('ready');
    } catch (error) {
      if (!disposed) view.setState('error', { message: error?.message });
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
    resetView() { adapter.resetView(8); },
    snapshot: () => Object.freeze({
      chart: adapter.snapshot(),
      replay: replay.snapshot(),
      viewportIntent: viewport.snapshot(),
      workspace: runtime.snapshot(),
    }),
    start: () => execute('chart-entry', 60 * 60_000),
  });
}
