import { parseBarTimeMs } from './bar-window.js';
import { unixMillisecondsToSeconds } from '../time-domain/time-domain.js';

function normalizeFiniteNumber(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`Bar data response bar ${fieldName} must be a finite number.`);
  }
  return normalized;
}

export function normalizeBar(rawBar) {
  if (!rawBar || typeof rawBar !== 'object') {
    throw new Error('Bar data response bar must be an object.');
  }

  const timestampMs = parseBarTimeMs(rawBar.timestamp ?? rawBar.time, 'bar timestamp');
  const timestamp = unixMillisecondsToSeconds(timestampMs, {
    fieldName: 'Bar data response bar timestamp',
  });
  const bar = {
    close: normalizeFiniteNumber(rawBar.close, 'close'),
    high: normalizeFiniteNumber(rawBar.high, 'high'),
    low: normalizeFiniteNumber(rawBar.low, 'low'),
    open: normalizeFiniteNumber(rawBar.open, 'open'),
    time: new Date(timestampMs).toISOString(),
    timestamp,
  };

  const volume = Number(rawBar.volume);
  if (Number.isFinite(volume)) {
    bar.volume = volume;
  }

  return bar;
}

export function normalizeBars(rawBars = []) {
  if (!Array.isArray(rawBars)) {
    throw new Error('Bar data response must include a bars array.');
  }

  const barsByTimestamp = new Map();
  rawBars
    .map(normalizeBar)
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((bar) => {
      if (!barsByTimestamp.has(bar.timestamp)) {
        barsByTimestamp.set(bar.timestamp, bar);
      }
    });
  return [...barsByTimestamp.values()];
}
