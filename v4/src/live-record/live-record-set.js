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

export function createLiveRecordSet(record = {}) {
  if (!record?.id) return null;
  const anchor = record.anchor || {};
  const execution = record.execution || {};
  const entry = execution.entry || {};
  const stopLoss = execution.stopLoss || {};
  const targets = Array.isArray(execution.targets) ? execution.targets : [];
  const result = record.result || {};
  const primaryTimestamp = (
    toTimestamp(entry.timestamp) ??
    toTimestamp(anchor.timestamp) ??
    toTimestamp(result.exitTimestamp)
  );
  return {
    id: record.id,
    sourceType: 'live-record',
    liveRecord: record,
    instrument: record.instrument,
    direction: record.direction,
    status: record.status,
    summary: record.summary || '',
    orderSetupId: record.orderSetupId || '',
    primaryTimestamp,
    range: timestampRangeFromValues([
      anchor.timestamp,
      entry.timestamp,
      stopLoss.timestamp,
      ...targets.map((target) => target.timestamp),
      result.exitTimestamp,
    ]),
    anchor: {
      timestamp: toTimestamp(anchor.timestamp),
      timeframe: anchor.timeframe || '',
      price: toNumberOrNull(anchor.price),
    },
    execution: {
      entry: {
        timestamp: toTimestamp(entry.timestamp),
        timeframe: entry.timeframe || '',
        price: toNumberOrNull(entry.price),
        complete: toTimestamp(entry.timestamp) !== null || toNumberOrNull(entry.price) !== null,
      },
      stopLoss: {
        timestamp: toTimestamp(stopLoss.timestamp),
        timeframe: stopLoss.timeframe || '',
        price: toNumberOrNull(stopLoss.price),
        complete: toNumberOrNull(stopLoss.price) !== null,
      },
      targets: targets.map((target) => ({
        ...target,
        timestamp: toTimestamp(target.timestamp),
        price: toNumberOrNull(target.price),
        complete: toNumberOrNull(target.price) !== null,
      })),
      orders: Array.isArray(execution.orders) ? execution.orders : [],
      fills: Array.isArray(execution.fills) ? execution.fills : [],
    },
    result: {
      ...result,
      exitTimestamp: toTimestamp(result.exitTimestamp),
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
