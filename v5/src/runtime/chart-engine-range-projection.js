import { timestampSeconds } from './chart-engine-context.js';

export function followLogicalRangeForBars(bars, context, options = {}) {
  if (!bars.length) return null;
  const rightOffset = Math.max(0, Number(context.rightOffsetBars || 0));
  const estimatedVisibleBars = Math.floor(Number(options.estimatedVisibleBars || 0));
  if (estimatedVisibleBars > 1) {
    const to = Math.max(0, bars.length - 1 + rightOffset);
    return {
      from: to - Math.max(0, estimatedVisibleBars - 1),
      to,
    };
  }
  return {
    from: 0,
    to: Math.max(0, bars.length - 1 + rightOffset),
  };
}

function estimateRenderedBarSpacingSeconds(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart engine visible range bar time'))
    .sort((left, right) => left - right);
  const gaps = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index])
    .filter((gap) => gap > 0);
  return gaps[0] || 60;
}

export function manualLogicalRangeForVisibleRange(range, bars) {
  if (!range || !bars.length) return null;
  const first = timestampSeconds(bars[0].time, 'chart engine visible range first bar time');
  const last = timestampSeconds(bars[bars.length - 1].time, 'chart engine visible range last bar time');
  if (range.to <= last) return null;
  const spacing = estimateRenderedBarSpacingSeconds(bars);
  const leftOffsetBars = Math.max(0, Math.floor((first - range.from) / spacing));
  const rightOffsetBars = Math.max(1, Math.ceil((range.to - last) / spacing));
  return {
    from: -leftOffsetBars,
    to: bars.length - 1 + rightOffsetBars,
  };
}

export function visibleRangeWithLogicalWhitespace(range, logicalRange, bars) {
  if (!range || !logicalRange || !bars.length) return range;
  const logicalFrom = Number(logicalRange.from);
  const logicalTo = Number(logicalRange.to);
  if (!Number.isFinite(logicalFrom) || !Number.isFinite(logicalTo)) return range;
  const spacing = estimateRenderedBarSpacingSeconds(bars);
  const firstLogicalIndex = 0;
  const lastLogicalIndex = bars.length - 1;
  const leftWhitespaceBars = Math.max(0, firstLogicalIndex - logicalFrom);
  const rightWhitespaceBars = Math.max(0, logicalTo - lastLogicalIndex);
  if (!leftWhitespaceBars && !rightWhitespaceBars) return range;
  return {
    from: Math.floor(range.from - (leftWhitespaceBars * spacing)),
    to: Math.ceil(range.to + (rightWhitespaceBars * spacing)),
  };
}
