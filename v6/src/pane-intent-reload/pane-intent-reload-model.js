const RELOAD_REASONS = Object.freeze(['symbol', 'interval']);

function normalizeReason(reason = '') {
  const normalized = String(reason || '').trim();
  if (!RELOAD_REASONS.includes(normalized)) {
    throw new Error(`Unsupported pane intent reload reason: ${reason}`);
  }
  return normalized;
}

function normalizePaneId(paneId = '') {
  const normalized = String(paneId || '').trim();
  if (!normalized) {
    throw new Error('Pane intent reload paneId must be a non-empty string.');
  }
  return normalized;
}

function normalizeInstrument(instrument = '') {
  const normalized = String(instrument || '').trim().toUpperCase();
  if (!normalized) {
    throw new Error('Pane intent reload instrument must be a non-empty string.');
  }
  return normalized;
}

function normalizeDisplayTimeframe(displayTimeframe) {
  const text = String(displayTimeframe ?? '').trim().toUpperCase();
  if (text === '1D' || text === '1W') return text;
  const normalized = Number(displayTimeframe);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error('Pane intent reload displayTimeframe must be a positive integer, 1D, or 1W.');
  }
  return normalized;
}

function normalizeSource(source = 'pane-intent') {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('Pane intent reload source must be a non-empty string.');
  }
  return normalized;
}

export function createPaneIntentReloadIntent({
  displayTimeframe,
  instrument,
  paneId,
  reason,
  source = 'pane-intent',
} = {}) {
  return Object.freeze({
    displayTimeframe: normalizeDisplayTimeframe(displayTimeframe),
    instrument: normalizeInstrument(instrument),
    paneId: normalizePaneId(paneId),
    reason: normalizeReason(reason),
    source: normalizeSource(source),
  });
}

export function createReloadIntentsFromPaneIntent({
  pane = {},
  reason,
  source = 'pane-intent',
} = {}) {
  return Object.freeze([
    createPaneIntentReloadIntent({
      displayTimeframe: pane.displayTimeframe,
      instrument: pane.instrument,
      paneId: pane.id,
      reason,
      source,
    }),
  ]);
}

export function createReloadIntentsFromSyncApplied(applied = {}, paneSnapshot = {}) {
  const reason = normalizeReason(applied.kind);
  const panesById = new Map((paneSnapshot.panes || []).map((pane) => [pane.id, pane]));
  return Object.freeze((applied.targets || []).map((target) => {
    const pane = panesById.get(target.paneId);
    if (!pane) {
      throw new Error(`Pane intent reload target pane "${target.paneId}" is missing.`);
    }
    return createPaneIntentReloadIntent({
      displayTimeframe: pane.displayTimeframe,
      instrument: pane.instrument,
      paneId: pane.id,
      reason,
      source: 'pane-intent-sync',
    });
  }));
}
