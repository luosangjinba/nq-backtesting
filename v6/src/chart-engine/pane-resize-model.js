const MIN_RATIO = 12;

const DEFAULT_RATIOS_BY_VARIANT = Object.freeze({
  single: Object.freeze({ columns: Object.freeze([100]), rows: Object.freeze([100]) }),
  'twice-horizontal': Object.freeze({ columns: Object.freeze([100]), rows: Object.freeze([50, 50]) }),
  'twice-vertical': Object.freeze({ columns: Object.freeze([50, 50]), rows: Object.freeze([100]) }),
  'triple-columns': Object.freeze({ columns: Object.freeze([33.333, 33.334, 33.333]), rows: Object.freeze([100]) }),
  'triple-left-stack': Object.freeze({ columns: Object.freeze([50, 50]), rows: Object.freeze([50, 50]) }),
  'triple-right-stack': Object.freeze({ columns: Object.freeze([50, 50]), rows: Object.freeze([50, 50]) }),
  'triple-rows': Object.freeze({ columns: Object.freeze([100]), rows: Object.freeze([33.333, 33.334, 33.333]) }),
});

const HANDLE_SPECS_BY_VARIANT = Object.freeze({
  single: Object.freeze([]),
  'twice-horizontal': Object.freeze([
    Object.freeze({ axis: 'rows', id: 'rows:0', index: 0, region: 'full' }),
  ]),
  'twice-vertical': Object.freeze([
    Object.freeze({ axis: 'columns', id: 'columns:0', index: 0, region: 'full' }),
  ]),
  'triple-columns': Object.freeze([
    Object.freeze({ axis: 'columns', id: 'columns:0', index: 0, region: 'full' }),
    Object.freeze({ axis: 'columns', id: 'columns:1', index: 1, region: 'full' }),
  ]),
  'triple-left-stack': Object.freeze([
    Object.freeze({ axis: 'columns', id: 'columns:0', index: 0, region: 'full' }),
    Object.freeze({ axis: 'rows', id: 'rows:0', index: 0, region: 'left' }),
  ]),
  'triple-right-stack': Object.freeze([
    Object.freeze({ axis: 'columns', id: 'columns:0', index: 0, region: 'full' }),
    Object.freeze({ axis: 'rows', id: 'rows:0', index: 0, region: 'right' }),
  ]),
  'triple-rows': Object.freeze([
    Object.freeze({ axis: 'rows', id: 'rows:0', index: 0, region: 'full' }),
    Object.freeze({ axis: 'rows', id: 'rows:1', index: 1, region: 'full' }),
  ]),
});

function cloneRatios(ratios) {
  return {
    columns: [...ratios.columns],
    rows: [...ratios.rows],
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeParts(parts = []) {
  const numbers = parts.map((part) => Number(part)).filter(Number.isFinite);
  const total = numbers.reduce((sum, part) => sum + part, 0);
  if (!numbers.length || total <= 0) {
    return null;
  }
  return numbers.map((part) => (part / total) * 100);
}

export function getDefaultPaneResizeRatios(variant = 'single') {
  const ratios = DEFAULT_RATIOS_BY_VARIANT[variant] || DEFAULT_RATIOS_BY_VARIANT.single;
  return cloneRatios(ratios);
}

export function normalizePaneResizeRatios(variant = 'single', input = null) {
  const fallback = getDefaultPaneResizeRatios(variant);
  const columns = normalizeParts(input?.columns);
  const rows = normalizeParts(input?.rows);
  if (columns?.length === fallback.columns.length) {
    fallback.columns = columns;
  }
  if (rows?.length === fallback.rows.length) {
    fallback.rows = rows;
  }
  return fallback;
}

export function createGridTemplatesFromRatios(ratios = {}) {
  const normalizedColumns = normalizeParts(ratios.columns) || [100];
  const normalizedRows = normalizeParts(ratios.rows) || [100];
  return {
    columns: normalizedColumns.map((part) => `minmax(0, ${Number(part.toFixed(3))}fr)`).join(' '),
    rows: normalizedRows.map((part) => `minmax(0, ${Number(part.toFixed(3))}fr)`).join(' '),
  };
}

export function getPaneResizeHandles(variant = 'single', ratios = null) {
  const normalized = normalizePaneResizeRatios(variant, ratios);
  return (HANDLE_SPECS_BY_VARIANT[variant] || []).map((handle) => {
    const parts = normalized[handle.axis];
    const offset = parts.slice(0, handle.index + 1).reduce((sum, part) => sum + part, 0);
    return {
      ...handle,
      offset,
      orientation: handle.axis === 'columns' ? 'vertical' : 'horizontal',
    };
  });
}

export function resizePaneRatiosByHandle(variant = 'single', ratios = null, handleId = '', coordinatePercent = 50) {
  const handle = (HANDLE_SPECS_BY_VARIANT[variant] || []).find((candidate) => candidate.id === handleId);
  if (!handle) {
    return normalizePaneResizeRatios(variant, ratios);
  }
  const next = normalizePaneResizeRatios(variant, ratios);
  const parts = next[handle.axis];
  const before = parts.slice(0, handle.index).reduce((sum, part) => sum + part, 0);
  const after = parts.slice(handle.index + 2).reduce((sum, part) => sum + part, 0);
  const available = Math.max(MIN_RATIO * 2, 100 - before - after);
  const localCoordinate = clamp(Number(coordinatePercent) - before, MIN_RATIO, available - MIN_RATIO);
  parts[handle.index] = localCoordinate;
  parts[handle.index + 1] = available - localCoordinate;
  return next;
}

export function calculatePaneResizeCoordinatePercent(handle = {}, point = {}, rect = {}) {
  const width = Math.max(1, Number(rect.width) || 1);
  const height = Math.max(1, Number(rect.height) || 1);
  const left = Number(rect.left) || 0;
  const top = Number(rect.top) || 0;
  if (handle.axis === 'rows') {
    return clamp(((Number(point.clientY) - top) / height) * 100, 0, 100);
  }
  return clamp(((Number(point.clientX) - left) / width) * 100, 0, 100);
}

