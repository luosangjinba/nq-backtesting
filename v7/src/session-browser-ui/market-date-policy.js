const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WALL_MINUTE_PATTERN = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function marketDateId({ year, month, day }) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new TypeError('Market date parts must be integers.');
  }
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * Owner: Session Browser UI domain helper.
 * Purpose: derive dates on which every selected instrument has source bars.
 * Inputs: immutable date arrays keyed by instrument identity and a selection.
 * Outputs: a sorted immutable array representing the intersection.
 * Side effects: none.
 */
export function intersectMarketDates(availabilityByInstrument, instrumentIds) {
  if (!availabilityByInstrument || !Array.isArray(instrumentIds)) {
    throw new TypeError('Market date policy requires availability and instruments.');
  }
  if (instrumentIds.length === 0) return Object.freeze([]);
  const dateArrays = instrumentIds.map((instrumentId) => {
    const dates = availabilityByInstrument[instrumentId]?.dates;
    if (!Array.isArray(dates) || dates.some((date) => !DATE_PATTERN.test(date))) {
      throw new TypeError('Market date availability is incomplete.');
    }
    return dates;
  });
  const remaining = new Set(dateArrays[0]);
  dateArrays.slice(1).forEach((dates) => {
    const candidate = new Set(dates);
    remaining.forEach((date) => {
      if (!candidate.has(date)) remaining.delete(date);
    });
  });
  return Object.freeze([...remaining].sort());
}

function shiftMarketDate(date, days) {
  if (!DATE_PATTERN.test(date) || !Number.isInteger(days)) {
    throw new TypeError('Market date shift requires a canonical date and integer offset.');
  }
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function weekday(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/**
 * Owner: Session Browser UI domain helper.
 * Purpose: expose source-backed dates plus Saturday boundary shorthand without
 * teaching the generic Calendar Surface about CME trading-week semantics.
 * Inputs: selected-instrument availability and Start/End boundary identity.
 * Outputs: sorted immutable selectable wall-date ids.
 * Side effects: none.
 */
export function sessionBoundaryMarketDates(availabilityByInstrument, instrumentIds, boundary) {
  if (boundary !== 'start' && boundary !== 'end') {
    throw new TypeError('Session boundary must be start or end.');
  }
  const sourceDates = intersectMarketDates(availabilityByInstrument, instrumentIds);
  if (sourceDates.length === 0) return sourceDates;
  const bounds = sharedMarketTimeBounds(availabilityByInstrument, instrumentIds);
  const dates = new Set(sourceDates);
  for (const date of sourceDates) {
    if (boundary === 'start' && weekday(date) === 0) {
      const resolved = `${date}T18:00`;
      if (resolved >= bounds.firstTimestamp && resolved <= bounds.latestTimestamp) {
        dates.add(shiftMarketDate(date, -1));
      }
    }
    if (boundary === 'end' && weekday(date) === 5) {
      const resolved = `${date}T16:59`;
      if (resolved >= bounds.firstTimestamp && resolved <= bounds.latestTimestamp) {
        dates.add(shiftMarketDate(date, 1));
      }
    }
  }
  return Object.freeze([...dates].sort());
}

/** Resolve a selected Saturday into the adjacent CME trading-week boundary. */
export function resolveSessionBoundaryWallMinute(value, boundary) {
  const match = typeof value === 'string' ? WALL_MINUTE_PATTERN.exec(value) : null;
  if (!match || (boundary !== 'start' && boundary !== 'end')) {
    throw new TypeError('Session boundary resolution requires a canonical wall minute and boundary.');
  }
  const date = match[1];
  if (weekday(date) !== 6) return value;
  return boundary === 'start'
    ? `${shiftMarketDate(date, 1)}T18:00`
    : `${shiftMarketDate(date, -1)}T16:59`;
}

/** Translate the customer-visible boundary into Replay's exclusive range cutoff. */
export function resolveSessionRangeWallMinute(value, boundary) {
  const resolved = resolveSessionBoundaryWallMinute(value, boundary);
  if (boundary !== 'end' || resolved === value) return resolved;
  return `${resolved.slice(0, 10)}T17:00`;
}

export function sharedMarketTimeBounds(availabilityByInstrument, instrumentIds) {
  if (!availabilityByInstrument || !Array.isArray(instrumentIds) || instrumentIds.length === 0) {
    throw new TypeError('Shared market-time bounds require selected instruments.');
  }
  const records = instrumentIds.map((instrumentId) => availabilityByInstrument[instrumentId]);
  if (records.some((record) => !record
    || typeof record.firstTimestamp !== 'string'
    || typeof record.latestTimestamp !== 'string')) {
    throw new TypeError('Market date availability is incomplete.');
  }
  return Object.freeze({
    firstTimestamp: records.map(({ firstTimestamp }) => firstTimestamp).sort().at(-1),
    latestTimestamp: records.map(({ latestTimestamp }) => latestTimestamp).sort()[0],
  });
}
