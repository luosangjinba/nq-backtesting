import { newYorkWallEpochToInstantMs } from './new-york-wall-clock.js';

const EXCHANGE_TIME_ZONE = 'America/New_York';
const exchangeFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit',
  month: '2-digit', second: '2-digit', timeZone: EXCHANGE_TIME_ZONE, year: 'numeric',
});

function partsAt(epochMs) {
  return Object.fromEntries(exchangeFormatter.formatToParts(epochMs)
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
}

function fieldsEpoch(parts) {
  return Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour, parts.minute, parts.second,
  );
}

/** Convert one real instant to the exchange-wall fields accepted by V4 bars. */
export function formatExchangeWallMinute(epochMs) {
  if (!Number.isSafeInteger(epochMs) || epochMs < 0) {
    throw new TypeError('Exchange-wall request time must be a non-negative epoch millisecond.');
  }
  const parts = partsAt(epochMs);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')} ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

/**
 * Convert V4's UTC-like epoch encoding of exchange wall-clock fields back to a
 * real instant. The source is timezone-naive, so DST fall-back ambiguity keeps
 * the Intl-selected occurrence rather than inventing unavailable provenance.
 */
export function exchangeWallSecondsToInstantMs(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('V4 bar timestamp must be a non-negative epoch second.');
  }
  const wallEpochMs = value * 1_000;
  if (new Date(wallEpochMs).getUTCFullYear() >= 2007) {
    return newYorkWallEpochToInstantMs(wallEpochMs);
  }
  let instantEpochMs = wallEpochMs;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const correctionMs = wallEpochMs - fieldsEpoch(partsAt(instantEpochMs));
    instantEpochMs += correctionMs;
    if (correctionMs === 0) return instantEpochMs;
  }
  if (fieldsEpoch(partsAt(instantEpochMs)) !== wallEpochMs) {
    throw new TypeError('V4 bar timestamp is not a valid New York exchange-wall time.');
  }
  return instantEpochMs;
}
