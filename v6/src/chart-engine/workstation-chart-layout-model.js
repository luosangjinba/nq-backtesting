export const LAYOUT_PANE_COUNTS = Object.freeze({ single: 1, triple: 3, twice: 2 });

export const LAYOUT_VARIANTS_BY_MODE = Object.freeze({
  single: Object.freeze(['single']),
  triple: Object.freeze(['triple-columns', 'triple-rows', 'triple-right-stack', 'triple-left-stack']),
  twice: Object.freeze(['twice-vertical', 'twice-horizontal']),
});

export const DEFAULT_LAYOUT_VARIANT_BY_MODE = Object.freeze({
  single: 'single',
  triple: 'triple-columns',
  twice: 'twice-vertical',
});

export const LAYOUT_GRID_AREAS_BY_VARIANT = Object.freeze({
  single: Object.freeze(['1 / 1 / 2 / 2']),
  'triple-columns': Object.freeze(['1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4']),
  'triple-left-stack': Object.freeze(['1 / 1 / 2 / 2', '2 / 1 / 3 / 2', '1 / 2 / 3 / 3']),
  'triple-right-stack': Object.freeze(['1 / 1 / 3 / 2', '1 / 2 / 2 / 3', '2 / 2 / 3 / 3']),
  'triple-rows': Object.freeze(['1 / 1 / 2 / 2', '2 / 1 / 3 / 2', '3 / 1 / 4 / 2']),
  'twice-horizontal': Object.freeze(['1 / 1 / 2 / 2', '2 / 1 / 3 / 2']),
  'twice-vertical': Object.freeze(['1 / 1 / 2 / 2', '1 / 2 / 2 / 3']),
});

export function normalizeWorkstationLayoutMode(mode = 'single') {
  const normalized = String(mode || '').trim();
  if (!Object.hasOwn(LAYOUT_PANE_COUNTS, normalized)) {
    throw new Error(`Unsupported chart surface layout mode: ${mode}`);
  }
  return normalized;
}

export function normalizeWorkstationLayoutVariant(mode, variant = null) {
  const normalizedMode = normalizeWorkstationLayoutMode(mode);
  const fallback = DEFAULT_LAYOUT_VARIANT_BY_MODE[normalizedMode];
  const normalized = String(variant || fallback).trim();
  if (!LAYOUT_VARIANTS_BY_MODE[normalizedMode].includes(normalized)) {
    throw new Error(`Unsupported chart surface layout variant: ${variant}`);
  }
  return normalized;
}

export function createWorkstationLayoutSnapshot(snapshot = {}, paneIds = []) {
  const mode = normalizeWorkstationLayoutMode(snapshot.mode);
  const variant = normalizeWorkstationLayoutVariant(mode, snapshot.variant);
  const paneCount = LAYOUT_PANE_COUNTS[mode];
  return Object.freeze({
    mode,
    paneCount,
    variant,
    visiblePaneIds: Object.freeze(paneIds.slice(0, paneCount)),
  });
}
