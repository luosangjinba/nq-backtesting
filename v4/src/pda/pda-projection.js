export const DEFAULT_PRIMARY_INSTRUMENT = 'NQ';

function normalizeInstrument(value, fallback = '') {
  return String(value || fallback || '').trim().toUpperCase();
}

function pushTimestamp(target, value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) target.push(numeric);
}

export function getPdaSourceInstrument(annotation = {}) {
  return normalizeInstrument(annotation.sourceInstrument || annotation.instrument, DEFAULT_PRIMARY_INSTRUMENT);
}

export function getTargetInstrument(contextOrInstrument) {
  if (typeof contextOrInstrument === 'string') return normalizeInstrument(contextOrInstrument, DEFAULT_PRIMARY_INSTRUMENT);
  return normalizeInstrument(contextOrInstrument?.instrument, DEFAULT_PRIMARY_INSTRUMENT);
}

export function canRenderPdaPriceProjection(annotation = {}, contextOrInstrument = DEFAULT_PRIMARY_INSTRUMENT) {
  return getPdaSourceInstrument(annotation) === getTargetInstrument(contextOrInstrument);
}

export function getPdaProjectionTimestamps(annotation = {}) {
  const timestamps = [];
  pushTimestamp(timestamps, annotation.canonicalTimestamp);
  pushTimestamp(timestamps, annotation.timestamp);
  pushTimestamp(timestamps, annotation.anchorTime);
  pushTimestamp(timestamps, annotation.start?.timestamp);
  pushTimestamp(timestamps, annotation.end?.timestamp);
  pushTimestamp(timestamps, annotation.startTime);
  pushTimestamp(timestamps, annotation.endTime);
  (Array.isArray(annotation.points) ? annotation.points : []).forEach((point) => {
    pushTimestamp(timestamps, point?.canonicalTimestamp);
    pushTimestamp(timestamps, point?.timestamp);
    pushTimestamp(timestamps, point?.time);
  });
  return Array.from(new Set(timestamps)).sort((a, b) => a - b);
}
