/** Preserve manual walls while recovering ranges wholly stranded before loaded data. */
export function planVisibleLogicalRange(projection, barCount) {
  if (projection.origin === 'manual') {
    if (projection.to > -0.5) {
      // A partial negative range represents real Canvas whitespace. Keeping
      // both endpoints lets prepended bars occupy it without moving the candle
      // that was under the pointer when the drag ended.
      return Object.freeze({ from: projection.from, to: projection.to });
    }
    return Object.freeze({ from: -0.5, to: -0.5 + projection.spanBars });
  }
  const from = Math.max(-0.5, projection.from);
  const projectedTo = projection.to;
  const to = projectedTo > from
    ? projectedTo
    : Math.max(from + 0.5, (barCount - 1) + Math.max(0, projection.latestOffsetBars));
  return Object.freeze({ from, to });
}
