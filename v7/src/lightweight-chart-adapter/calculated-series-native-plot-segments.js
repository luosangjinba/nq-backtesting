const CONNECTING_PLOT_KINDS = new Set(['area', 'baseline', 'line']);

/** Split a connecting built-in Plot into value-only runs so native rendering cannot bridge gaps. */
export function nativePlotPointSegments(resource) {
  if (!CONNECTING_PLOT_KINDS.has(resource.kind)) {
    return Object.freeze([Object.freeze([...resource.points])]);
  }
  const segments = [];
  let current = [];
  for (const point of resource.points) {
    if (point.state === 'whitespace') {
      if (current.length > 0) segments.push(Object.freeze(current));
      current = [];
      continue;
    }
    current.push(point);
  }
  if (current.length > 0) segments.push(Object.freeze(current));
  return Object.freeze(segments);
}

/** Return the adapter-private built-in Series count required by one logical Plot. */
export function nativePlotSeriesCount(resource) {
  return nativePlotPointSegments(resource).length;
}
