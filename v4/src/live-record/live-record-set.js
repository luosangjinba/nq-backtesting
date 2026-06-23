import { getLiveRecordById, getLiveRecords } from './live-record-store.js';

function toTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function timestampRangeFromValues(values = []) {
  const timestamps = values.map(toTimestamp).filter((value) => value !== null);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function projectElement(element = {}, options = {}) {
  const timestamp = toTimestamp(element.timestamp);
  const price = toNumberOrNull(element.price);
  const endTimestamp = toTimestamp(element.endTimestamp);
  return {
    ...element,
    timestamp,
    timeframe: element.timeframe || '',
    price,
    endTimestamp,
    endTimeframe: element.endTimeframe || '',
    lineLengthBars: toNumberOrNull(element.lineLengthBars),
    visible: element.visible !== false,
    complete: Boolean(options.completeWhen?.({ timestamp, price, endTimestamp }) ?? (timestamp !== null || price !== null)),
  };
}

function elementRangeValues(element = {}) {
  return element.complete ? [element.timestamp, element.endTimestamp] : [];
}

export function createLiveRecordSet(record = {}) {
  if (!record?.id) return null;
  const anchor = record.anchor || {};
  const execution = record.execution || {};
  const entry = execution.entry || {};
  const marketStructureShift = execution.marketStructureShift || {};
  const stopLoss = execution.stopLoss || {};
  const targets = Array.isArray(execution.targets) ? execution.targets : [];
  const result = record.result || {};
  const primaryTimestamp = (
    toTimestamp(entry.timestamp) ??
    toTimestamp(anchor.timestamp) ??
    toTimestamp(result.exitTimestamp)
  );
  const projectedEntry = projectElement(entry);
  const projectedMarketStructureShift = projectElement(marketStructureShift);
  const projectedStopLoss = projectElement(stopLoss, {
    completeWhen: ({ price }) => price !== null,
  });
  const projectedTargets = targets.map((target) => projectElement(target, {
    completeWhen: ({ price }) => price !== null,
  }));
  return {
    id: record.id,
    sourceType: 'live-record',
    sourceChartId: record.sourceChartId || 'legacy-shared',
    sourceChartLabel: record.sourceChartLabel || '',
    sourceInstrument: record.sourceInstrument || record.instrument || '',
    sourceTimeframe: record.sourceTimeframe ?? null,
    sourceTimeframeLabel: record.sourceTimeframeLabel || '',
    sourceContext: record.sourceContext || '',
    liveRecord: record,
    instrument: record.instrument,
    direction: record.direction,
    status: record.status,
    summary: record.summary || '',
    orderSetupId: record.orderSetupId || '',
    display: {
      ...(record.display || {}),
      elementVisibility: { ...(record.display?.elementVisibility || {}) },
    },
    primaryTimestamp,
    range: timestampRangeFromValues([
      anchor.timestamp,
      ...elementRangeValues(projectedEntry),
      ...elementRangeValues(projectedMarketStructureShift),
      ...elementRangeValues(projectedStopLoss),
      ...projectedTargets.flatMap(elementRangeValues),
      result.exitTimestamp,
    ]),
    anchor: {
      timestamp: toTimestamp(anchor.timestamp),
      timeframe: anchor.timeframe || '',
      price: toNumberOrNull(anchor.price),
    },
    execution: {
      entry: projectedEntry,
      marketStructureShift: projectedMarketStructureShift,
      stopLoss: projectedStopLoss,
      targets: projectedTargets,
      orders: Array.isArray(execution.orders) ? execution.orders : [],
      fills: Array.isArray(execution.fills) ? execution.fills : [],
    },
    result: {
      ...result,
      exitType: result.exitType || 'unknown',
      exitTimestamp: toTimestamp(result.exitTimestamp),
      exitTimeframe: result.exitTimeframe || '',
      exitPrice: toNumberOrNull(result.exitPrice),
    },
  };
}

export function getLiveRecordSets() {
  return getLiveRecords().map(createLiveRecordSet).filter(Boolean);
}

export function getLiveRecordSetById(id) {
  return createLiveRecordSet(getLiveRecordById(id));
}
