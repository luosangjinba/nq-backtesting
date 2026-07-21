/** Keep adapter-only logical ranges valid when a replacement sharply reduces bar count. */
export function planVisibleLogicalRange(projection, barCount) {
  const from = Math.max(-0.5, projection.from);
  if (projection.origin === 'manual' && projection.from < -0.5) {
    return Object.freeze({ from, to: from + projection.spanBars });
  }
  const projectedTo = projection.to;
  const to = projectedTo > from
    ? projectedTo
    : Math.max(from + 0.5, (barCount - 1) + Math.max(0, projection.latestOffsetBars));
  return Object.freeze({ from, to });
}
