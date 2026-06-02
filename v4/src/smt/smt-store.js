// Manual SMT evidence store. First version only supports NQ following ES.

import * as bus from '../event-bus.js';
import { timeframeToString } from '../config.js';

export const SMT_TYPES = {
  LIQUIDITY: 'liquidity',
  FVG: 'fvg',
};

export const SMT_DIRECTIONS = {
  BULLISH: 'bullish',
  BEARISH: 'bearish',
};

const VALID_TYPES = new Set(Object.values(SMT_TYPES));
const VALID_DIRECTIONS = new Set(Object.values(SMT_DIRECTIONS));

let records = [];

function emitChanged() {
  bus.emit('smt:changed', { records: getSmtRecords() });
}

function makeId(type, timestamp) {
  return `smt_${type}_${timestamp}_${Date.now()}`;
}

function normalizeTimeframe(timeframe) {
  if (typeof timeframe === 'number') return timeframeToString(timeframe);
  return timeframe || '1H';
}

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getSmtRecordIdentity(record) {
  return [
    record.type,
    record.direction,
    record.timeframe,
    record.leftTimestamp ?? record.timestamp,
    record.rightTimestamp ?? record.fvgStartTimestamp,
    record.primaryInstrument || 'NQ',
    record.compareInstrument || 'ES',
  ].join(':');
}

export function normalizeSmtRecord(input = {}, { preserveId = false } = {}) {
  const type = VALID_TYPES.has(input.type) ? input.type : SMT_TYPES.LIQUIDITY;
  const direction = VALID_DIRECTIONS.has(input.direction) ? input.direction : SMT_DIRECTIONS.BEARISH;
  const now = Date.now();
  const baseTimestamp = input.leftTimestamp ?? input.timestamp ?? now;
  const base = {
    id: preserveId && input.id ? input.id : makeId(type, baseTimestamp),
    type,
    direction,
    timeframe: normalizeTimeframe(input.timeframe),
    primaryInstrument: 'NQ',
    compareInstrument: 'ES',
    source: input.source || 'manual',
    note: input.note || '',
    display: {
      ...(input.display || {}),
      hidden: Boolean(input.display?.hidden),
    },
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };

  if (type === SMT_TYPES.LIQUIDITY) {
    const leftTimestamp = normalizeNumber(input.leftTimestamp);
    const rightTimestamp = normalizeNumber(input.rightTimestamp);
    const primaryLeftPrice = normalizeNumber(input.primaryLeftPrice);
    const primaryRightPrice = normalizeNumber(input.primaryRightPrice);
    const compareLeftPrice = normalizeNumber(input.compareLeftPrice);
    const compareRightPrice = normalizeNumber(input.compareRightPrice);
    if (
      [leftTimestamp, rightTimestamp, primaryLeftPrice, primaryRightPrice, compareLeftPrice, compareRightPrice].some(
        (value) => value === null
      )
    ) {
      throw new Error('invalid liquidity SMT record');
    }
    return {
      ...base,
      leftTimestamp,
      rightTimestamp,
      primaryLeftPrice,
      primaryRightPrice,
      compareLeftPrice,
      compareRightPrice,
      primarySwept: false,
      compareSwept: true,
    };
  }

  const timestamp = normalizeNumber(input.timestamp);
  const fvgStartTimestamp = normalizeNumber(input.fvgStartTimestamp);
  const fvgEndTimestamp = normalizeNumber(input.fvgEndTimestamp);
  const fvgTop = normalizeNumber(input.fvgTop);
  const fvgBottom = normalizeNumber(input.fvgBottom);
  if ([timestamp, fvgStartTimestamp, fvgEndTimestamp, fvgTop, fvgBottom].some((value) => value === null)) {
    throw new Error('invalid FVG SMT record');
  }

  return {
    ...base,
    timestamp,
    fvgStartTimestamp,
    fvgEndTimestamp,
    fvgTop: Math.max(fvgTop, fvgBottom),
    fvgBottom: Math.min(fvgTop, fvgBottom),
    primaryHasFvg: false,
    reactionMove: direction === SMT_DIRECTIONS.BULLISH ? 'up' : 'down',
  };
}

export function addSmtRecord(input) {
  const record = normalizeSmtRecord(input);
  records = [...records, record];
  emitChanged();
  return record;
}

export function updateSmtRecord(id, patch = {}) {
  let updated = null;
  records = records.map((record) => {
    if (record.id !== id) return record;
    updated = normalizeSmtRecord(
      {
        ...record,
        ...patch,
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: Date.now(),
      },
      { preserveId: true }
    );
    return updated;
  });
  if (updated) emitChanged();
  return updated;
}

export function deleteSmtRecord(id) {
  const before = records.length;
  records = records.filter((record) => record.id !== id);
  if (records.length !== before) emitChanged();
}

export function loadSmtRecords(nextRecords = []) {
  records = Array.isArray(nextRecords) ? nextRecords.map((record) => normalizeSmtRecord(record, { preserveId: true })) : [];
  emitChanged();
}

export function clearSmtRecords() {
  records = [];
  emitChanged();
}

export function getSmtRecords() {
  return records.map((record) => ({ ...record }));
}

export function getSmtRecordById(id) {
  return records.find((record) => record.id === id) || null;
}
