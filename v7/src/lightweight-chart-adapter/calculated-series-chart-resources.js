import { LineSeries } from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { createCalculatedSeriesBandPrimitive } from './calculated-series-band-primitive.js';
import { readCalculatedSeriesPaintedPixels } from './calculated-series-paint-readback.js';
import {
  anchorData,
  fixedScaleRange,
  nativeAnchorOptions,
  nativePlotData,
  nativePlotDefinition,
  nativePlotOptions,
  nativePriceLineOptions,
  nativeScaleMode,
} from './calculated-series-native-options.js';

const mapBy = (values, key = 'resourceId') => new Map(values.map((value) => [value[key], value]));
const clonedMaps = (maps) => Object.fromEntries(
  Object.entries(maps).map(([key, value]) => [key, new Map(value)]),
);

function unprovenNativeMutation(message, cause) {
  return Object.assign(new Error(message), { cause, recoveryUnproven: true });
}

function regionIndex(chart, record) {
  return chart.panes().findIndex((pane) => pane === record.pane);
}

function sameResource(left, right, fields) {
  return left && fields.every((field) => left.plan[field] === right[field]);
}

export function createEmptyCalculatedSeriesResourceMaps() {
  return Object.freeze({
    bands: new Map(), lines: new Map(), plots: new Map(), regions: new Map(), scales: new Map(),
  });
}

function capturePriceScale(priceScale) {
  return Object.freeze({
    autoScale: priceScale.options().autoScale,
    options: structuredClone(priceScale.options()),
    priceScale,
    range: priceScale.getVisibleRange(),
  });
}

export function captureCalculatedSeriesNativeState(chart, candleSeries, maps, plan) {
  const scaleState = new Map();
  for (const record of maps.scales.values()) {
    const paneIndex = regionIndex(chart, maps.regions.get(record.plan.regionId));
    scaleState.set(`${paneIndex}:${record.nativeScaleId}`, capturePriceScale(record.priceScale));
  }
  const regionKinds = new Map(plan.regions.map(({ kind, regionId }) => [regionId, kind]));
  for (const scale of plan.scales) {
    if (!['left', 'right'].includes(scale.nativeRole)) continue;
    let paneIndex = 0;
    if (regionKinds.get(scale.regionId) !== 'main') {
      const region = maps.regions.get(scale.regionId);
      if (!region) continue;
      paneIndex = regionIndex(chart, region);
    }
    if (paneIndex < 0) continue;
    const key = `${paneIndex}:${scale.nativeRole}`;
    if (!scaleState.has(key)) {
      scaleState.set(key, capturePriceScale(chart.priceScale(scale.nativeRole, paneIndex)));
    }
  }
  return Object.freeze({
    candleData: JSON.stringify(candleSeries.data()),
    candleOptions: JSON.stringify(candleSeries.options()),
    candleOrder: candleSeries.seriesOrder(),
    panes: Object.freeze(chart.panes().map((pane, index) => Object.freeze({
      index, pane, preserve: pane.preserveEmptyPane(), stretch: pane.getStretchFactor(),
    }))),
    plans: Object.freeze(Object.fromEntries(Object.entries(maps).map(([name, entries]) => [
      name,
      new Map([...entries].map(([id, record]) => [id, record.plan])),
    ]))),
    scaleState,
    seriesOrder: new Map([
      ...[...maps.scales.values()].map(({ anchor }) => [anchor, anchor.seriesOrder()]),
      ...[...maps.plots.values()].map(({ series }) => [series, series.seriesOrder()]),
    ]),
  });
}

function assertCandleUnchanged(candleSeries, nativeState) {
  if (JSON.stringify(candleSeries.data()) !== nativeState.candleData
    || JSON.stringify(candleSeries.options()) !== nativeState.candleOptions
    || candleSeries.seriesOrder() !== nativeState.candleOrder) {
    throw new Error('Calculated-series projection mutated the candle Series.');
  }
}

function nativeScaleId(scale, counter) {
  if (scale.nativeRole === 'right' || scale.nativeRole === 'left') return scale.nativeRole;
  counter.value += 1;
  return `calculated-series-overlay-${counter.value}`;
}

function applyScale(record, plan, previousPlan, priceIncrement) {
  record.anchor.applyOptions(nativeAnchorOptions(plan, record.nativeScaleId, priceIncrement));
  record.anchor.setData(anchorData(plan));
  if (!(record.regionKind === 'main' && plan.nativeRole === 'right')) {
    record.priceScale.applyOptions({
      mode: nativeScaleMode(plan.intent),
      visible: plan.nativeRole !== 'overlay',
    });
    const fixed = fixedScaleRange(plan.intent);
    if (fixed !== null) {
      record.priceScale.setAutoScale(false);
      record.priceScale.setVisibleRange(fixed);
    } else if (previousPlan === null || fixedScaleRange(previousPlan.intent) !== null
      || previousPlan.intent.transform !== plan.intent.transform) {
      record.priceScale.setAutoScale(true);
    }
  }
  record.plan = plan;
}

function createScale(chart, region, plan, counter, priceIncrement) {
  const nativeId = nativeScaleId(plan, counter);
  const paneIndex = regionIndex(chart, region);
  let anchor;
  try {
    anchor = chart.addSeries(
      LineSeries,
      nativeAnchorOptions(plan, nativeId, priceIncrement),
      paneIndex,
    );
  } catch (cause) {
    throw unprovenNativeMutation('Native Scale anchor creation is unprovable.', cause);
  }
  try {
    const record = {
      anchor,
      nativeScaleId: nativeId,
      plan,
      priceScale: chart.priceScale(nativeId, paneIndex),
      regionKind: region.plan.kind,
    };
    applyScale(record, plan, null, priceIncrement);
    return record;
  } catch (cause) {
    try {
      chart.removeSeries(anchor);
    } catch (cleanupCause) {
      throw unprovenNativeMutation(
        'Native Scale anchor cleanup is unprovable.',
        new AggregateError([cause, cleanupCause]),
      );
    }
    throw cause;
  }
}

function updatePlot(record, plan, scale) {
  record.series.applyOptions(nativePlotOptions(plan, scale.nativeScaleId));
  record.series.setData(nativePlotData(plan));
  record.plan = plan;
}

function createPlot(chart, plan, region, scale) {
  let series;
  try {
    series = chart.addSeries(
      nativePlotDefinition(plan.kind),
      nativePlotOptions(plan, scale.nativeScaleId),
      regionIndex(chart, region),
    );
  } catch (cause) {
    throw unprovenNativeMutation('Native Plot creation is unprovable.', cause);
  }
  try {
    const record = { plan, series };
    updatePlot(record, plan, scale);
    return record;
  } catch (cause) {
    try {
      chart.removeSeries(series);
    } catch (cleanupCause) {
      throw unprovenNativeMutation(
        'Native Plot cleanup is unprovable.',
        new AggregateError([cause, cleanupCause]),
      );
    }
    throw cause;
  }
}

function updateBand(record, plan) {
  if (!record.attached) {
    record.anchor.attachPrimitive(record.handle.primitive);
    record.attached = true;
  }
  record.handle.update(plan);
  record.plan = plan;
}

function createBand(plan, scale) {
  const handle = createCalculatedSeriesBandPrimitive(plan);
  try {
    scale.anchor.attachPrimitive(handle.primitive);
    return { anchor: scale.anchor, attached: true, handle, plan };
  } catch (cause) {
    const failures = [cause];
    try { scale.anchor.detachPrimitive(handle.primitive); } catch (error) { failures.push(error); }
    try { handle.destroy(); } catch (error) { failures.push(error); }
    throw unprovenNativeMutation(
      'Native band Primitive attachment is unprovable.',
      failures.length === 1 ? cause : new AggregateError(failures),
    );
  }
}

function updateLine(record, plan) {
  record.line.applyOptions(nativePriceLineOptions(plan));
  record.plan = plan;
}

function createLine(plan, scale) {
  try {
    return {
      anchor: scale.anchor,
      line: scale.anchor.createPriceLine(nativePriceLineOptions(plan)),
      plan,
    };
  } catch (cause) {
    throw unprovenNativeMutation('Native reference-line creation is unprovable.', cause);
  }
}

function reconcileRegions(chart, plan, previous, candidate, created) {
  for (const value of plan.regions) {
    const prior = previous.regions.get(value.regionId);
    let record = prior;
    if (!prior || prior.plan.kind !== value.kind) {
      let pane;
      if (value.kind === 'main') pane = chart.panes()[0];
      else {
        try { pane = chart.addPane(true); } catch (cause) {
          throw unprovenNativeMutation('Native Chart Region creation is unprovable.', cause);
        }
      }
      record = { internal: value.kind !== 'main', pane, plan: value };
      created.regions.add(record);
    }
    record.plan = value;
    candidate.regions.set(value.regionId, record);
  }
  const ordered = [...candidate.regions.values()].sort((a, b) => a.plan.order - b.plan.order);
  ordered.forEach((record, index) => {
    record.pane.setPreserveEmptyPane(record.internal);
    record.pane.setStretchFactor(record.plan.heightWeight);
    record.pane.moveTo(index);
  });
}

function reconcileScales(chart, plan, previous, candidate, created, counter, priceIncrement) {
  for (const value of plan.scales) {
    const region = candidate.regions.get(value.regionId);
    const prior = previous.scales.get(value.scaleGroupId);
    const retained = sameResource(prior, value, ['regionId', 'nativeRole'])
      && previous.regions.get(value.regionId) === region;
    const record = retained
      ? prior : createScale(chart, region, value, counter, priceIncrement);
    if (!retained) created.scales.add(record);
    else applyScale(record, value, previous.plans.scales.get(value.scaleGroupId), priceIncrement);
    candidate.scales.set(value.scaleGroupId, record);
  }
}

function reconcilePlots(chart, plan, previous, candidate, created) {
  for (const value of plan.plots) {
    const scale = candidate.scales.get(value.scaleGroupId);
    const region = candidate.regions.get(value.regionId);
    const prior = previous.plots.get(value.resourceId);
    const retained = sameResource(prior, value, ['kind', 'regionId', 'scaleGroupId'])
      && previous.scales.get(value.scaleGroupId) === scale;
    const record = retained ? prior : createPlot(chart, value, region, scale);
    if (!retained) created.plots.add(record);
    else updatePlot(record, value, scale);
    candidate.plots.set(value.resourceId, record);
  }
}

function reconcileBands(plan, previous, candidate, created) {
  for (const value of plan.bands) {
    const scale = candidate.scales.get(value.scaleGroupId);
    const prior = previous.bands.get(value.resourceId);
    const retained = sameResource(prior, value, ['regionId', 'scaleGroupId'])
      && previous.scales.get(value.scaleGroupId) === scale;
    const record = retained ? prior : createBand(value, scale);
    if (!retained) created.bands.add(record);
    else updateBand(record, value);
    candidate.bands.set(value.resourceId, record);
  }
}

function reconcileLines(plan, previous, candidate, created) {
  for (const value of plan.referenceLines) {
    const scale = candidate.scales.get(value.scaleGroupId);
    const prior = previous.lines.get(value.resourceId);
    const retained = sameResource(prior, value, ['regionId', 'scaleGroupId'])
      && previous.scales.get(value.scaleGroupId) === scale;
    const record = retained ? prior : createLine(value, scale);
    if (!retained) created.lines.add(record);
    else updateLine(record, value);
    candidate.lines.set(value.resourceId, record);
  }
}

function hideObsolete(previous, candidate) {
  for (const record of previous.plots.values()) {
    if (![...candidate.plots.values()].includes(record)) record.series.applyOptions({ visible: false });
  }
  for (const record of previous.bands.values()) {
    if (![...candidate.bands.values()].includes(record) && record.attached) {
      try {
        record.anchor.detachPrimitive(record.handle.primitive);
      } catch (cause) {
        throw unprovenNativeMutation('Native band Primitive detachment is unprovable.', cause);
      }
      record.attached = false;
    }
  }
  for (const record of previous.lines.values()) {
    if (![...candidate.lines.values()].includes(record)) record.line.applyOptions({ lineVisible: false });
  }
  for (const record of previous.scales.values()) {
    if (![...candidate.scales.values()].includes(record)) record.anchor.applyOptions({ visible: false });
  }
}

function orderSeries(chart, previous, candidate) {
  const owned = new Set([
    ...previous.scales.values(), ...candidate.scales.values(),
    ...previous.plots.values(), ...candidate.plots.values(),
  ].map((record) => record.anchor ?? record.series));
  for (const region of candidate.regions.values()) {
    const fixed = region.pane.getSeries().filter((series) => !owned.has(series)).length;
    const ordered = [
      ...[...candidate.scales.values()].filter(({ plan }) => plan.regionId === region.plan.regionId)
        .sort((a, b) => a.plan.order - b.plan.order).map(({ anchor }) => anchor),
      ...[...candidate.plots.values()].filter(({ plan }) => plan.regionId === region.plan.regionId)
        .sort((a, b) => a.plan.order - b.plan.order || a.plan.resourceId.localeCompare(b.plan.resourceId))
        .map(({ series }) => series),
    ];
    ordered.forEach((series, index) => series.setSeriesOrder(fixed + index));
  }
}

function retainedCounts(previous, candidate) {
  const count = (kind) => {
    const prior = new Set(previous[kind].values());
    return [...candidate[kind].values()].filter((record) => prior.has(record)).length;
  };
  return Object.freeze({
    bands: count('bands'),
    plots: count('plots'),
    referenceLines: count('lines'),
    regions: count('regions'),
    scales: count('scales'),
  });
}

export async function applyCalculatedSeriesResourcePlan({
  candleSeries, chart, current, overlayCounter, plan, priceIncrement, requestFrame,
}) {
  const nativeState = captureCalculatedSeriesNativeState(chart, candleSeries, current, plan);
  const previous = { ...clonedMaps(current), plans: nativeState.plans };
  const candidate = createEmptyCalculatedSeriesResourceMaps();
  const created = Object.freeze({
    bands: new Set(), lines: new Set(), plots: new Set(), regions: new Set(), scales: new Set(),
  });
  const stage = { candidate, created, nativeState, plan, previous, state: 'applying' };
  try {
    reconcileRegions(chart, plan, previous, candidate, created);
    reconcileScales(chart, plan, previous, candidate, created, overlayCounter, priceIncrement);
    reconcilePlots(chart, plan, previous, candidate, created);
    reconcileBands(plan, previous, candidate, created);
    reconcileLines(plan, previous, candidate, created);
    hideObsolete(previous, candidate);
    orderSeries(chart, previous, candidate);
    const matchedColorPixels = await readCalculatedSeriesPaintedPixels(chart, plan, requestFrame);
    assertCandleUnchanged(candleSeries, nativeState);
    stage.state = 'applied';
    return Object.freeze({
      readback: Object.freeze({
        candleInvariant: true,
        logicalResourceCount: plan.resourceCount,
        matchedColorPixels,
        paneCount: chart.panes().length,
        regions: Object.freeze(plan.regions.map(({ regionId }) => regionId)),
        retainedHandles: retainedCounts(previous, candidate),
        resourceIds: Object.freeze([
          ...plan.plots, ...plan.bands, ...plan.referenceLines,
        ].map(({ resourceId }) => resourceId).sort()),
      }),
      stage,
    });
  } catch (cause) {
    stage.cause = cause;
    throw Object.assign(new Error('Native calculated-series apply failed.'), {
      cause,
      nativeStage: stage,
      recoveryUnproven: cause?.recoveryUnproven === true,
    });
  }
}

function restorePaneState(chart, nativeState) {
  [...nativeState.panes].sort((a, b) => a.index - b.index).forEach((state) => {
    state.pane.setPreserveEmptyPane(state.preserve);
    state.pane.setStretchFactor(state.stretch);
    state.pane.moveTo(state.index);
  });
  return chart;
}

function removeRecord(chart, kind, record) {
  if (kind === 'lines') record.anchor.removePriceLine(record.line);
  else if (kind === 'bands') {
    if (record.attached) record.anchor.detachPrimitive(record.handle.primitive);
    record.attached = false;
    record.handle.destroy();
  } else if (kind === 'plots') chart.removeSeries(record.series);
  else if (kind === 'scales') chart.removeSeries(record.anchor);
  else if (kind === 'regions' && record.internal) chart.removePane(record.pane.paneIndex());
}

export function rollbackCalculatedSeriesResourceStage(chart, candleSeries, stage, priceIncrement) {
  const { candidate, created, nativeState, previous } = stage;
  for (const kind of ['lines', 'bands', 'plots', 'scales']) {
    [...created[kind]].reverse().forEach((record) => removeRecord(chart, kind, record));
  }
  [...created.regions].reverse().forEach((record) => removeRecord(chart, 'regions', record));
  restorePaneState(chart, nativeState);
  for (const [id, record] of previous.regions) record.plan = nativeState.plans.regions.get(id);
  for (const [id, record] of previous.scales) {
    applyScale(record, nativeState.plans.scales.get(id), record.plan, priceIncrement);
  }
  for (const [id, record] of previous.plots) {
    const priorPlan = nativeState.plans.plots.get(id);
    updatePlot(record, priorPlan, previous.scales.get(priorPlan.scaleGroupId));
  }
  for (const [id, record] of previous.bands) updateBand(record, nativeState.plans.bands.get(id));
  for (const [id, record] of previous.lines) updateLine(record, nativeState.plans.lines.get(id));
  for (const [series, order] of nativeState.seriesOrder) series.setSeriesOrder(order);
  for (const saved of nativeState.scaleState.values()) {
    saved.priceScale.applyOptions(saved.options);
    saved.priceScale.setAutoScale(saved.autoScale);
    if (!saved.autoScale && saved.range !== null) saved.priceScale.setVisibleRange(saved.range);
  }
  assertCandleUnchanged(candleSeries, nativeState);
  stage.state = 'rolled-back';
  return previous;
}

export function finalizeCalculatedSeriesResourceStage(chart, stage) {
  const { candidate, previous } = stage;
  for (const kind of ['lines', 'bands', 'plots', 'scales']) {
    const retained = new Set(candidate[kind].values());
    [...previous[kind].values()].reverse().forEach((record) => {
      if (!retained.has(record)) removeRecord(chart, kind, record);
    });
  }
  const retainedRegions = new Set(candidate.regions.values());
  [...previous.regions.values()].reverse().forEach((record) => {
    if (!retainedRegions.has(record)) removeRecord(chart, 'regions', record);
  });
  stage.state = 'finalized';
  return candidate;
}

export function disposeCalculatedSeriesResources(chart, maps) {
  for (const kind of ['lines', 'bands', 'plots', 'scales', 'regions']) {
    [...maps[kind].values()].reverse().forEach((record) => removeRecord(chart, kind, record));
  }
}
