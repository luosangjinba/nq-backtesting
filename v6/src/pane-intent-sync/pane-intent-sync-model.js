const SYNC_KINDS = Object.freeze(['symbol', 'interval']);

function normalizeKind(kind = '') {
  const normalized = String(kind || '').trim();
  if (!SYNC_KINDS.includes(normalized)) {
    throw new Error(`Unsupported pane intent sync kind: ${kind}`);
  }
  return normalized;
}

function normalizePaneId(paneId = '') {
  return String(paneId || '').trim();
}

function isSyncEnabled(kind, layoutSnapshot = {}) {
  return Boolean(layoutSnapshot.sync?.[kind]);
}

function getVisiblePaneIds(layoutSnapshot = {}) {
  const paneIds = layoutSnapshot.visiblePaneIds || layoutSnapshot.panes?.map((pane) => pane.id) || [];
  return paneIds.map(normalizePaneId).filter(Boolean);
}

function getPaneValue(kind, pane = {}) {
  return kind === 'symbol' ? pane.instrument : pane.displayTimeframe;
}

function getSourceValue(kind, sourcePane = {}) {
  return kind === 'symbol' ? sourcePane.instrument : sourcePane.displayTimeframe;
}

export function createPaneIntentSyncPlan({
  kind,
  layoutSnapshot = {},
  paneSnapshot = {},
  sourcePane = {},
} = {}) {
  const syncKind = normalizeKind(kind);
  const sourcePaneId = normalizePaneId(sourcePane.id);
  const sourceValue = getSourceValue(syncKind, sourcePane);
  if (!sourcePaneId || sourceValue == null || !isSyncEnabled(syncKind, layoutSnapshot)) {
    return Object.freeze({
      enabled: false,
      kind: syncKind,
      sourcePaneId,
      sourceValue,
      targets: Object.freeze([]),
    });
  }

  const visiblePaneIds = new Set(getVisiblePaneIds(layoutSnapshot));
  const targets = (paneSnapshot.panes || [])
    .filter((pane) => visiblePaneIds.has(pane.id))
    .filter((pane) => pane.id !== sourcePaneId)
    .filter((pane) => getPaneValue(syncKind, pane) !== sourceValue)
    .map((pane) => Object.freeze({
      paneId: pane.id,
      value: sourceValue,
    }));

  return Object.freeze({
    enabled: true,
    kind: syncKind,
    sourcePaneId,
    sourceValue,
    targets: Object.freeze(targets),
  });
}

export function createSymbolIntentSyncPlan(payload = {}) {
  return createPaneIntentSyncPlan({ ...payload, kind: 'symbol' });
}

export function createIntervalIntentSyncPlan(payload = {}) {
  return createPaneIntentSyncPlan({ ...payload, kind: 'interval' });
}
