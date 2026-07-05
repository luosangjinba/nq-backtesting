const VALID_SIDES = new Set(['buy', 'sell']);

function normalizeText(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeOptionalText(value) {
  return value == null ? '' : String(value).trim();
}

function normalizeFiniteNumber(value, label, { allowZero = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || (!allowZero && normalized <= 0) || (allowZero && normalized < 0)) {
    throw new Error(`${label} must be a ${allowZero ? 'non-negative' : 'positive'} number.`);
  }
  return normalized;
}

function normalizeOptionalFiniteNumber(value, label) {
  if (value == null || value === '') return null;
  return normalizeFiniteNumber(value, label);
}

function normalizeSide(value) {
  const side = String(value || '').trim().toLowerCase();
  if (!VALID_SIDES.has(side)) {
    throw new Error('Journal entry side must be "buy" or "sell".');
  }
  return side;
}

function normalizeTimestamp(value, label, fallback) {
  const candidate = value == null || value === '' ? fallback : value;
  const timestamp = String(candidate || '').trim();
  if (!timestamp) {
    throw new Error(`${label} must be a non-empty timestamp string.`);
  }
  return timestamp;
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) {
    throw new Error('Journal entry tags must be an array.');
  }
  return [...new Set(tags.map((tag) => String(tag || '').trim()).filter(Boolean))].sort();
}

function normalizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Journal entry metadata must be an object.');
  }
  return { ...metadata };
}

export function cloneJournalEntry(entry) {
  return {
    ...entry,
    tags: [...entry.tags],
    metadata: { ...entry.metadata },
  };
}

export function createJournalEntry(payload = {}, {
  now = () => new Date().toISOString(),
} = {}) {
  const createdAt = normalizeTimestamp(payload.createdAt, 'Journal entry createdAt', now());
  const updatedAt = normalizeTimestamp(payload.updatedAt, 'Journal entry updatedAt', createdAt);
  return {
    id: normalizeText(payload.id, 'Journal entry id'),
    symbol: normalizeText(payload.symbol, 'Journal entry symbol').toUpperCase(),
    side: normalizeSide(payload.side),
    quantity: normalizeFiniteNumber(payload.quantity, 'Journal entry quantity'),
    entryPrice: normalizeFiniteNumber(payload.entryPrice, 'Journal entry entryPrice'),
    exitPrice: normalizeOptionalFiniteNumber(payload.exitPrice, 'Journal entry exitPrice'),
    openedAt: normalizeTimestamp(payload.openedAt, 'Journal entry openedAt', createdAt),
    closedAt: payload.closedAt == null || payload.closedAt === ''
      ? null
      : normalizeTimestamp(payload.closedAt, 'Journal entry closedAt', null),
    notes: normalizeOptionalText(payload.notes),
    tags: normalizeTags(payload.tags),
    metadata: normalizeMetadata(payload.metadata),
    createdAt,
    updatedAt,
  };
}

export function updateJournalEntry(entry, patch = {}, {
  now = () => new Date().toISOString(),
} = {}) {
  const next = createJournalEntry({
    ...entry,
    ...patch,
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: patch.updatedAt || now(),
  }, { now });
  return cloneJournalEntry(next);
}
