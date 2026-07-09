export const DEFAULT_PANE_ID = 'main';
export const CHART_SURFACE_PANE_IDS = Object.freeze(['main', 'secondary', 'tertiary']);

const DEFAULT_PANE_INPUT = Object.freeze({
  active: true,
  chartBarsRevision: 0,
  displayTimeframe: 1,
  id: DEFAULT_PANE_ID,
  instrument: 'NQ',
  viewportIntentRevision: 0,
});

export const PANE_RECORD_KEYS = Object.freeze([
  'active',
  'chartBarsRevision',
  'displayTimeframe',
  'id',
  'instrument',
  'viewportIntentRevision',
]);

function normalizeText(value, fallback, fieldName) {
  const normalized = String(value || fallback || '').trim();
  if (!normalized) {
    throw new Error(`Pane ${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeRevision(value, fieldName) {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) {
    throw new Error(`Pane ${fieldName} must be a non-negative integer.`);
  }
  return revision;
}

export function normalizePaneInstrument(value) {
  return normalizeText(value, null, 'instrument').toUpperCase();
}

export function normalizePaneDisplayTimeframe(value) {
  const timeframe = Number(value);
  if (!Number.isInteger(timeframe) || timeframe <= 0) {
    throw new Error('Pane displayTimeframe must be a positive integer.');
  }
  return timeframe;
}

export function createPaneRecord(input = {}) {
  return Object.freeze({
    active: Boolean(input.active ?? DEFAULT_PANE_INPUT.active),
    chartBarsRevision: normalizeRevision(
      input.chartBarsRevision ?? DEFAULT_PANE_INPUT.chartBarsRevision,
      'chartBarsRevision'
    ),
    displayTimeframe: normalizePaneDisplayTimeframe(
      input.displayTimeframe ?? DEFAULT_PANE_INPUT.displayTimeframe
    ),
    id: normalizeText(input.id, DEFAULT_PANE_INPUT.id, 'id'),
    instrument: normalizePaneInstrument(input.instrument ?? DEFAULT_PANE_INPUT.instrument),
    viewportIntentRevision: normalizeRevision(
      input.viewportIntentRevision ?? DEFAULT_PANE_INPUT.viewportIntentRevision,
      'viewportIntentRevision'
    ),
  });
}

export function createDefaultPaneRecord(input = {}) {
  return createPaneRecord({
    ...DEFAULT_PANE_INPUT,
    ...input,
    active: true,
    id: input.id || DEFAULT_PANE_ID,
  });
}

export function createDefaultPaneRecords() {
  return CHART_SURFACE_PANE_IDS.map((id, index) => createPaneRecord({
    ...DEFAULT_PANE_INPUT,
    active: index === 0,
    id,
  }));
}

export function assertPaneRecordShape(pane) {
  const keys = Object.keys(pane || {}).sort();
  const expected = [...PANE_RECORD_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`Pane record shape mismatch: ${keys.join(',')}`);
  }
  return true;
}
