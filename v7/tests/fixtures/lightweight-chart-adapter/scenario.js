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

const host = document.querySelector('#chart');
const sessionId = createSessionId('adapter-session');
const activationGeneration = createActivationGeneration(1);
const identity = createWorkspaceTransactionIdentity({
  activationGeneration,
  sessionId,
  transactionId: createTransactionId('adapter-transaction'),
});
const proposal = createReplayCursorProposal({
  advance: createReplayAdvanceInput({ durationMs: 60_000, source: 'manual' }),
  baseRevision: 0,
  cursorEpochMs: 2_200_000,
  identity,
  range: { endEpochMs: 3_000_000, startEpochMs: 1_000_000 },
});
const bars = Object.freeze(Array.from({ length: 20 }, (_, index) => {
  const open = 100 + index;
  return Object.freeze({
    close: open + (index % 2 ? -2 : 2),
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
  provenance: Object.freeze({ cursorProposal: proposal }),
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
const adapter = createLightweightChartAdapter({ host, viewportPort: viewport });
const application = createChartSnapshotApplication({ activationGeneration, adapter, sessionId });

try {
  await application.present({
    identity,
    signal: new AbortController().signal,
    workspaceSnapshot: snapshot,
  });
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
