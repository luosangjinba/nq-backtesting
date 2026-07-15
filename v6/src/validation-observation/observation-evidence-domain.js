const SCHEMA_VERSION = 1;

function text(value, field) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${field} must be a non-empty string.`);
  return normalized;
}

function timestamp(value, field) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) throw new Error(`${field} must be a timestamp.`);
  return normalized;
}

function iso(value, field) {
  const milliseconds = Date.parse(text(value, field));
  if (!Number.isFinite(milliseconds)) throw new Error(`${field} must be a valid date/time.`);
  return new Date(milliseconds).toISOString();
}

function price(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) throw new Error('Evidence price must be finite.');
  return normalized;
}

function freeze(record) {
  return Object.freeze(JSON.parse(JSON.stringify(record)));
}

export function createProspectiveObservation({ category, createdAt, evidenceId, id, text: body, trialId } = {}) {
  return freeze({
    artifactType: 'observation',
    category: text(category, 'Observation category'),
    createdAt: timestamp(createdAt, 'Observation createdAt'),
    evidenceId: text(evidenceId, 'Observation evidenceId'),
    id: text(id, 'Observation id'),
    perspective: 'prospective',
    schemaVersion: SCHEMA_VERSION,
    text: text(body, 'Observation text'),
    trialId: text(trialId, 'Observation trialId'),
  });
}

export function createEvidenceSnapshot({
  createdAt,
  id,
  observationId,
  paneId,
  price: priceValue,
  replayCursorTime,
  replaySessionId,
  replayVisibleThroughTime,
  symbol,
  time,
  timeframe,
  trialId,
} = {}) {
  const evidenceTime = iso(time, 'Evidence time');
  const cursorTime = iso(replayCursorTime, 'Evidence replayCursorTime');
  const visibleThroughTime = iso(replayVisibleThroughTime, 'Evidence replayVisibleThroughTime');
  if (cursorTime !== visibleThroughTime) throw new Error('Evidence cursor must equal visible-through boundary.');
  if (Date.parse(evidenceTime) > Date.parse(visibleThroughTime)) {
    throw new Error('Evidence time must not exceed Replay visible-through boundary.');
  }
  return freeze({
    artifactType: 'evidenceSnapshot',
    createdAt: timestamp(createdAt, 'Evidence createdAt'),
    id: text(id, 'Evidence id'),
    observationId: text(observationId, 'Evidence observationId'),
    paneId: text(paneId, 'Evidence paneId'),
    price: price(priceValue),
    replayCursorTime: cursorTime,
    replaySessionId: text(replaySessionId, 'Evidence replaySessionId'),
    replayVisibleThroughTime: visibleThroughTime,
    schemaVersion: SCHEMA_VERSION,
    symbol: text(symbol, 'Evidence symbol'),
    time: evidenceTime,
    timeframe: text(timeframe, 'Evidence timeframe'),
    trialId: text(trialId, 'Evidence trialId'),
  });
}
