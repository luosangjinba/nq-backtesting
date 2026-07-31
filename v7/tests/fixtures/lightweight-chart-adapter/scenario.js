import { createActivationGeneration } from '../../../src/activation-generation/public.js';
import { createChartSnapshotApplication } from '../../../src/chart-snapshot-application/public.js';
import { createLightweightChartAdapter } from '../../../src/lightweight-chart-adapter/public.js';
import { createReplayAdvanceInput, createReplayCursorProposal } from '../../../src/replay-contract/public.js';
import { createSessionId } from '../../../src/session-identity/public.js';
import { createTransactionId } from '../../../src/transaction-identity/public.js';
import {
  createInitialViewportIntent,
  createViewportController,
} from '../../../src/viewport-runtime/public.js';
import { createWorkspaceTransactionIdentity } from '../../../src/workspace-transaction-contract/public.js';
import {
  createWorkstationSettings,
  readWorkstationSettings,
} from '../../../src/workstation-settings/public.js';

const host = document.querySelector('#chart');
const sessionId = createSessionId('adapter-session');
const activationGeneration = createActivationGeneration(1);
const identity = createWorkspaceTransactionIdentity({
  activationGeneration,
  sessionId,
  transactionId: createTransactionId('adapter-transaction'),
});
const advance = createReplayAdvanceInput({ durationMs: 60_000, source: 'manual' });
const proposal = createReplayCursorProposal({
  advance,
  baseRevision: 0,
  cursorEpochMs: 2_200_000,
  identity,
  range: { endEpochMs: 3_000_000, startEpochMs: 1_000_000 },
});
const bars = Object.freeze(Array.from({ length: 20 }, (_, index) => {
  const open = 100 + index;
  return Object.freeze({
    close: open + (index % 2 ? -2 : 2),
    displayEpochMs: 1_030_000 + (index * 60_000),
    high: open + 3,
    low: open - 3,
    open,
    startEpochMs: 1_000_000 + (index * 60_000),
    volume: 10 + index,
  });
}));
const snapshot = Object.freeze({
  bars,
  paneId: 'adapter-pane',
  provenance: Object.freeze({
    cursorProposal: proposal,
    displayTimeframeDurationMs: 60_000,
    instrumentId: 'NQ',
  }),
  schemaVersion: 1,
});
const viewport = createViewportController({
  defaultSpanBars: 30,
  initialIntent: createInitialViewportIntent({
    activationGeneration,
    cursorEpochMs: 2_200_000,
    latestOffsetBars: 6,
    paneId: 'adapter-pane',
    sessionId,
  }),
});
const truncationSelections = [];
const crosshairObservations = [];
const historyBoundaries = [];
const viewportIntents = [];
const adapter = createLightweightChartAdapter({
  host,
  onCrosshairMove: (observation) => crosshairObservations.push(observation),
  onHistoryBoundary: (boundary) => historyBoundaries.push(boundary),
  onTruncationSelect: (selection) => truncationSelections.push(selection),
  onViewportIntent: (intent) => viewportIntents.push(intent),
  viewportPort: viewport,
});
globalThis.__adapter = adapter;
globalThis.__applySettings = (overrides = {}) => {
  const defaults = readWorkstationSettings(createWorkstationSettings());
  const settings = createWorkstationSettings({
    candles: { ...defaults.candles, ...(overrides.candles ?? {}) },
    canvas: {
      ...defaults.canvas,
      ...(overrides.canvas ?? {}),
      gridVisible: overrides.gridVisible ?? overrides.canvas?.gridVisible ?? defaults.canvas.gridVisible,
    },
    currentPrice: { ...defaults.currentPrice, ...(overrides.currentPrice ?? {}) },
    interface: { ...defaults.interface, ...(overrides.interface ?? {}) },
    paneReadout: { ...defaults.paneReadout, ...(overrides.paneReadout ?? {}) },
    time: { ...defaults.time, ...(overrides.time ?? {}) },
  });
  adapter.applyWorkstationSettings(
    settings,
    overrides.priceIncrement ?? '0.25',
    overrides.instrumentId ?? 'NQ',
  );
};
globalThis.__crosshairObservations = crosshairObservations;
globalThis.__historyBoundaries = historyBoundaries;
globalThis.__truncationSelections = truncationSelections;
globalThis.__viewportIntents = viewportIntents;
const application = createChartSnapshotApplication({ activationGeneration, adapter, sessionId });

globalThis.__probeVisibleRollback = async () => {
  const candidateBar = Object.freeze({
    close: 122,
    displayEpochMs: 2_230_000,
    high: 124,
    low: 119,
    open: 120,
    startEpochMs: 2_200_000,
    volume: 31,
  });
  const candidate = Object.freeze({ ...snapshot, bars: Object.freeze([...bars, candidateBar]) });
  const apply = async (staged, isCurrent) => adapter.applyVisible({
    identity, isCurrent, signal: new AbortController().signal, staged, workspaceSnapshot: candidate,
  });
  const before = adapter.snapshot();
  const staleStage = await adapter.stage({
    identity, signal: new AbortController().signal, workspaceSnapshot: candidate,
  });
  let currencyChecks = 0;
  let staleCode = null;
  try {
    await apply(staleStage, () => currencyChecks++ === 0);
  } catch (error) {
    staleCode = error?.code ?? null;
  }
  const afterStale = adapter.snapshot();
  const latestAfterStale = adapter.crosshairObservation();
  const discardedStage = await adapter.stage({
    identity, signal: new AbortController().signal, workspaceSnapshot: candidate,
  });
  await apply(discardedStage, () => true);
  const beforeDiscard = adapter.snapshot();
  await adapter.rollbackVisible(discardedStage);
  const preparedIdentity = createWorkspaceTransactionIdentity({
    activationGeneration,
    sessionId,
    transactionId: createTransactionId('adapter-prepared-rollback'),
  });
  const preparedProposal = createReplayCursorProposal({
    advance,
    baseRevision: 0,
    cursorEpochMs: 2_200_000,
    identity: preparedIdentity,
    range: { endEpochMs: 3_000_000, startEpochMs: 1_000_000 },
  });
  const preparedCandidate = Object.freeze({
    ...candidate,
    provenance: Object.freeze({ ...candidate.provenance, cursorProposal: preparedProposal }),
  });
  const prepared = await application.prepare({
    identity: preparedIdentity,
    signal: new AbortController().signal,
    workspaceSnapshot: preparedCandidate,
  });
  const preparedCommit = await prepared.apply();
  const beforePreparedRollback = adapter.snapshot();
  const applicationBeforePreparedRollback = application.snapshot();
  await prepared.rollback(preparedCommit);
  return {
    afterDiscard: adapter.snapshot(),
    afterStale,
    afterPreparedRollback: adapter.snapshot(),
    applicationAfterPreparedRollback: application.snapshot(),
    applicationBeforePreparedRollback,
    before,
    beforeDiscard,
    beforePreparedRollback,
    latestAfterDiscard: adapter.crosshairObservation(),
    preparedStatus: prepared.snapshot().status,
    latestAfterStale,
    staleCode,
  };
};

globalThis.__probeEmptyTransition = async () => {
  const staged = await adapter.stageEmpty({ identity, signal: new AbortController().signal });
  await adapter.applyEmpty({
    identity, isCurrent: () => true, signal: new AbortController().signal, staged, workspaceSnapshot: null,
  });
  const empty = adapter.snapshot();
  const emptyObservation = adapter.crosshairObservation();
  const emptyDataset = {
    barCount: host.dataset.barCount,
    instrumentId: host.dataset.instrumentId ?? null,
    latestDisplayEpochMs: host.dataset.latestDisplayEpochMs ?? null,
  };
  await adapter.rollbackVisible(staged);
  return {
    empty,
    emptyDataset,
    emptyObservation,
    restored: adapter.snapshot(),
    restoredObservation: adapter.crosshairObservation(),
  };
};

try {
  const prepared = await application.prepare({
    identity,
    signal: new AbortController().signal,
    workspaceSnapshot: snapshot,
  });
  const receipt = await prepared.apply();
  prepared.finalize(receipt);
  host.dataset.applicationRevision = String(application.snapshot().revision);
  host.dataset.scenario = 'ready';
} catch (error) {
  host.dataset.error = `${error?.code ?? 'error'}:${error?.message}`;
  host.dataset.scenario = 'error';
}

addEventListener('pagehide', () => {
  application.dispose();
  adapter.dispose();
}, { once: true });
