import { createActivationGeneration } from '../../../src/activation-generation/public.js';
import {
  createChartCalculatedSeriesProjectionOwner,
  createChartSnapshotApplication,
} from '../../../src/chart-snapshot-application/public.js';
import * as calculatedSeriesProjectionApi from '../../../src/calculated-series-chart-projection/public.js';
import { createLightweightChartAdapter } from '../../../src/lightweight-chart-adapter/public.js';
import { createReplayAdvanceInput, createReplayCursorProposal } from '../../../src/replay-contract/public.js';
import { createSessionId } from '../../../src/session-identity/public.js';
import { createTransactionId } from '../../../src/transaction-identity/public.js';
import { createInitialViewportIntent, createViewportController } from '../../../src/viewport-runtime/public.js';
import { createWorkspaceTransactionIdentity } from '../../../src/workspace-transaction-contract/public.js';
import { createCalculatedSeriesProjectionFixture } from '../../support/calculated-series-projection-fixture.js';

const host = document.querySelector('#chart');
const activationGeneration = createActivationGeneration(7);
const sessionId = createSessionId('session-contract-fixture');
const identity = createWorkspaceTransactionIdentity({
  activationGeneration,
  sessionId,
  transactionId: createTransactionId('transaction-contract-fixture'),
});
const proposal = createReplayCursorProposal({
  advance: createReplayAdvanceInput({ durationMs: 1_000, source: 'manual' }),
  baseRevision: 0,
  cursorEpochMs: 3_000,
  identity,
  range: { endEpochMs: 10_000, startEpochMs: 0 },
});
const bars = Object.freeze([1, 2, 3].map((time, index) => Object.freeze({
  close: 100 + index,
  displayEpochMs: time * 1_000,
  high: 104 + index,
  low: 96 + index,
  open: 99 + index,
  startEpochMs: (time - 1) * 1_000,
  volume: 10 + index,
})));
const workspaceSnapshot = Object.freeze({
  bars,
  paneId: 'pane-contract-fixture',
  provenance: Object.freeze({
    cursorProposal: proposal,
    displayTimeframeDurationMs: 1_000,
    instrumentId: 'SYNTHETIC',
  }),
  schemaVersion: 1,
});
const viewport = createViewportController({
  defaultSpanBars: 12,
  initialIntent: createInitialViewportIntent({
    activationGeneration,
    cursorEpochMs: 3_000,
    latestOffsetBars: 2,
    paneId: 'pane-contract-fixture',
    sessionId,
  }),
});
const viewportIntents = [];
const crosshair = [];
const adapter = createLightweightChartAdapter({
  host,
  onCrosshairMove: (value) => crosshair.push(value),
  onViewportIntent: (value) => viewportIntents.push(value),
  viewportPort: viewport,
});
const application = createChartSnapshotApplication({ activationGeneration, adapter, sessionId });

async function acceptCandleSnapshot() {
  const prepared = await application.prepare({
    identity,
    signal: new AbortController().signal,
    workspaceSnapshot,
  });
  const receipt = await prepared.apply();
  prepared.finalize(receipt);
}

async function acceptProjection(owner, fixture) {
  const prepared = await owner.prepare(fixture.candidate);
  const receipt = await prepared.apply();
  await prepared.finalize(receipt);
  return calculatedSeriesProjectionApi.readCalculatedSeriesChartProjectionReceipt(receipt);
}

function errorChain(error) {
  const messages = [];
  let current = error;
  while (current && messages.length < 6) {
    messages.push(`${current.code ?? current.name}:${current.message}`);
    current = current.cause;
  }
  return messages.join(' <- ');
}

try {
  await acceptCandleSnapshot();
  const before = adapter.snapshot();
  const [definitionWire, documentWire] = await Promise.all([
    fetch('../calculated-series-pure-contract/positive/synthetic-definition.json').then((value) => value.json()),
    fetch('../calculated-series-pure-contract/positive/workspace-document.json').then((value) => value.json()),
  ]);
  const initial = createCalculatedSeriesProjectionFixture({ definitionWire, documentWire });
  const currentBinding = calculatedSeriesProjectionApi.readCalculatedSeriesChartBinding(initial.binding);
  const owner = createChartCalculatedSeriesProjectionOwner({
    currentBinding: () => currentBinding,
    projectionFactory: await adapter.calculatedSeriesProjectionFactory(),
  });
  const ready = await acceptProjection(owner, initial);
  const readySurface = owner.snapshot().child.nativeSurface;

  const pendingFixture = createCalculatedSeriesProjectionFixture({
    baseSurfaceRevision: 1,
    definitionWire,
    documentWire,
    mode: 'same-snapshot-settlement',
    state: 'pending',
  });
  await acceptProjection(owner, pendingFixture);
  const pendingSurface = owner.snapshot().child.nativeSurface;

  const settledFixture = createCalculatedSeriesProjectionFixture({
    baseSurfaceRevision: 2,
    definitionWire,
    documentWire,
    mode: 'same-snapshot-settlement',
  });
  await acceptProjection(owner, settledFixture);

  const retainedFixture = createCalculatedSeriesProjectionFixture({
    baseSurfaceRevision: 3,
    definitionWire,
    documentWire,
    mode: 'same-snapshot-settlement',
  });
  const retained = await acceptProjection(owner, retainedFixture);

  const movedFixture = createCalculatedSeriesProjectionFixture({
    baseSurfaceRevision: 4,
    definitionWire,
    documentWire,
    movePriceToInternal: true,
  });
  const movedPrepared = await owner.prepare(movedFixture.candidate);
  const movedReceipt = await movedPrepared.apply();
  const moved = calculatedSeriesProjectionApi.readCalculatedSeriesChartProjectionReceipt(movedReceipt);
  await movedPrepared.rollback(movedReceipt);

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const after = adapter.snapshot();
  globalThis.__calculatedSeriesProjectionResult = Object.freeze({
    after: Object.freeze({
      barCount: after.barCount,
      seriesDataRevision: after.seriesDataRevision,
      visibleRevision: after.visibleRevision,
    }),
    before: Object.freeze({
      barCount: before.barCount,
      seriesDataRevision: before.seriesDataRevision,
      visibleRevision: before.visibleRevision,
    }),
    crosshair,
    moved: moved.paintedReadback,
    owner: owner.snapshot(),
    pendingSurface,
    ready: ready.paintedReadback,
    readySurface,
    retained: retained.paintedReadback,
    surface: owner.snapshot().child.nativeSurface,
    viewportIntents,
  });
  globalThis.__disposeCalculatedSeriesProjectionFixture = async () => {
    await owner.dispose();
    await application.dispose();
    await adapter.dispose();
  };
  host.dataset.scenario = 'ready';
} catch (error) {
  host.dataset.error = errorChain(error);
  host.dataset.scenario = 'failed';
  throw error;
}
