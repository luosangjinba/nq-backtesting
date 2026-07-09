import { windowBoundsMs } from './bar-window.js';
import { unixMillisecondsToSeconds } from '../time-domain/time-domain.js';

export const DATABASE_BAR_SCHEMA = Object.freeze({
  dbPath: 'v4/data/trading_data.duckdb',
  table: 'futures_1m',
  columns: Object.freeze({
    close: 'close',
    high: 'high',
    instrument: 'instrument',
    low: 'low',
    open: 'open',
    timestamp: 'ts',
    volume: 'volume',
  }),
  engine: 'duckdb',
});

function toEpochSeconds(timestampMs) {
  return unixMillisecondsToSeconds(timestampMs, {
    fieldName: 'Database bars adapter timestampMs',
  });
}

function normalizeRows(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.bars)) return result.bars;
  if (Array.isArray(result?.rows)) return result.rows;
  throw new Error('Database bars adapter query result must include rows or bars.');
}

function mapDatabaseRow(row, schema) {
  if (!row || typeof row !== 'object') {
    throw new Error('Database bars adapter row must be an object.');
  }

  const columns = schema.columns || DATABASE_BAR_SCHEMA.columns;
  return {
    close: row.close ?? row[columns.close],
    high: row.high ?? row[columns.high],
    low: row.low ?? row[columns.low],
    open: row.open ?? row[columns.open],
    time: row.time ?? row.timestamp ?? row[columns.timestamp],
    volume: row.volume ?? row[columns.volume],
  };
}

function normalizeHistory(result = {}, window = {}, bounds) {
  return {
    canvasLeftBoundary: window.canvasLeftBoundary || null,
    cappedAtCanvasLeft: window.requestCap === 'canvas-left',
    direction: window.direction || null,
    exhaustedBefore: Boolean(result.exhaustedBefore),
    requestCap: window.requestCap || null,
    startTs: toEpochSeconds(bounds.startMs),
    endTs: toEpochSeconds(bounds.endMs),
  };
}

export function createDatabaseBarsAdapter({
  now = () => performance.now(),
  queryBars,
  schema = DATABASE_BAR_SCHEMA,
  source = 'database-bars-adapter',
} = {}) {
  if (typeof queryBars !== 'function') {
    throw new Error('Database bars adapter requires a queryBars function.');
  }

  return async function fetchDatabaseBars(window) {
    const bounds = windowBoundsMs(window);
    const startedAtMs = now();
    const queryResult = await queryBars({
      bounds,
      schema,
      window: { ...window },
    });
    const queriedAtMs = now();
    const bars = normalizeRows(queryResult).map((row) => mapDatabaseRow(row, schema));
    const finishedAtMs = now();

    return {
      bars,
      history: normalizeHistory(queryResult, window, bounds),
      requestedRange: {
        endTs: toEpochSeconds(bounds.endMs),
        startTs: toEpochSeconds(bounds.startMs),
      },
      schema,
      timing: {
        durationMs: finishedAtMs - startedAtMs,
        normalizeMs: finishedAtMs - queriedAtMs,
        queryMs: queriedAtMs - startedAtMs,
        source,
      },
    };
  };
}
