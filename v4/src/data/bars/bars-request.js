export function normalizeBarsRequest({
  start,
  end,
  timeframe = 1,
  instrument = 'NQ',
} = {}) {
  const normalizedStart = String(start || '').trim();
  const normalizedEnd = String(end || '').trim();
  const normalizedTimeframe = Number(timeframe);
  const normalizedInstrument = String(instrument || 'NQ').trim().toUpperCase();

  if (!normalizedStart || !normalizedEnd) {
    throw new Error('Bars request requires start and end');
  }
  if (!Number.isFinite(normalizedTimeframe) || normalizedTimeframe <= 0) {
    throw new Error('Bars request requires a positive timeframe');
  }

  return {
    start: normalizedStart,
    end: normalizedEnd,
    timeframe: normalizedTimeframe,
    instrument: normalizedInstrument,
  };
}

export function getBarsRequestKey(request) {
  const normalized = normalizeBarsRequest(request);
  return [
    normalized.instrument,
    normalized.timeframe,
    normalized.start,
    normalized.end,
  ].join('|');
}
