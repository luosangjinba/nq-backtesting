export const CHART_COMMANDS = Object.freeze({
  REPLACE_BARS: 'chart.replaceBars',
  APPEND_BARS: 'chart.appendBars',
  CLEAR_BARS: 'chart.clearBars',
  GET_VIEWPORT_METRICS: 'chart.getViewportMetrics',
  SET_RIGHT_EDGE_LIMIT: 'chart.setRightEdgeLimit',
  SET_VISIBLE_RANGE: 'chart.setVisibleRange',
  GET_VISIBLE_RANGE: 'chart.getVisibleRange',
  SET_DISPLAY_CONTEXT: 'chart.setDisplayContext',
  GET_VIEWPORT_DEMAND: 'chart.getViewportDemand',
  GET_PREFIX_DEMAND: 'chart.getPrefixDemand',
});

export const CHART_EVENTS = Object.freeze({
  READY: 'chart:ready',
  BARS_CHANGED: 'chart:barsChanged',
  VISIBLE_RANGE_CHANGED: 'chart:visibleRangeChanged',
  VIEWPORT_DEMAND: 'chart:viewportDemand',
  PREFIX_DEMAND: 'chart:prefixDemand',
});
