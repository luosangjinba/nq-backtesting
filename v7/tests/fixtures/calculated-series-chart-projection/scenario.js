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
import {
  createChart,
  LineSeries,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import {
  readCalculatedSeriesWhitespaceEvidence,
} from '../../../src/lightweight-chart-adapter/calculated-series-whitespace-evidence.js';

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
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function nativeWhitespaceBridgeControl() {
  const element = document.createElement('div');
  Object.assign(element.style, {
    height: '180px', left: '-10000px', position: 'fixed', top: '0', width: '360px',
  });
  document.body.append(element);
  const controlChart = createChart(element, {
    height: 180,
    layout: { background: { color: '#07090d', type: 'solid' }, textColor: '#d8dde8' },
    width: 360,
  });
  const controlSeries = controlChart.addSeries(LineSeries, {
    color: '#33AABBFF', lineWidth: 2,
  });
  const plan = Object.freeze({
    kind: 'line',
    points: Object.freeze([
      Object.freeze({ displayEpochMs: 1_000, state: 'value', value: 99 }),
      Object.freeze({ displayEpochMs: 2_000, state: 'whitespace' }),
      Object.freeze({ displayEpochMs: 3_000, state: 'value', value: 101 }),
    ]),
    style: Object.freeze({
      stroke: Object.freeze({ color: '#33AABBFF', pattern: 'solid', width: 2 }),
    }),
  });
  controlSeries.setData(plan.points.map((point) => (
    point.state === 'whitespace'
      ? { time: point.displayEpochMs / 1_000 }
      : { time: point.displayEpochMs / 1_000, value: point.value }
  )));
  controlChart.timeScale().fitContent();
  await frame();
  await frame();
  const evidence = readCalculatedSeriesWhitespaceEvidence(
    controlChart,
    { plots: new Map([['native-control', { plan, series: controlSeries }]]) },
    controlChart.takeScreenshot(true, false),
  );
  controlChart.remove();
  element.remove();
  return evidence;
}

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
  const nativeWhitespaceControl = await nativeWhitespaceBridgeControl();
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
    nativeWhitespaceControl,
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
