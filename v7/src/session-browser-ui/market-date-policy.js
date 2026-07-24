const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
