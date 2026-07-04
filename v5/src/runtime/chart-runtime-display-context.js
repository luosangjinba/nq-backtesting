import {
  DEFAULT_DISPLAY_TIMEZONE,
  DEFAULT_EXCHANGE_TIMEZONE,
} from '../contracts/timezone-contracts.js';
import {
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../contracts/chart-presentation-contracts.js';
import {
  cloneBackgroundStyle,
  cloneCandleStyle,
  cloneCrosshairStyle,
  cloneGridStyle,
  cloneScaleStyle,
  cloneWatermarkStyle,
  normalizeDisplayTimeframe,
  normalizeLoadedCoverage,
} from './chart-runtime-state.js';

export function buildChartDisplayContext(payload = {}, currentContext = {}) {
  const {
    instrument = currentContext.instrument,
    displayTimeframe = currentContext.displayTimeframe,
    loadedCoverage = currentContext.loadedCoverage,
    displayTimezone = currentContext.displayTimezone,
    exchangeTimezone = currentContext.exchangeTimezone,
    timeFormat = currentContext.timeFormat,
    dateFormat = currentContext.dateFormat,
    showDayOfWeekLabels = currentContext.showDayOfWeekLabels,
    showCrosshairReadout = currentContext.showCrosshairReadout,
    margins = currentContext.margins,
    rightOffsetBars = currentContext.rightOffsetBars,
    candleStyle = currentContext.candleStyle,
    gridStyle = currentContext.gridStyle,
    crosshairStyle = currentContext.crosshairStyle,
    backgroundStyle = currentContext.backgroundStyle,
    scaleStyle = currentContext.scaleStyle,
    watermarkStyle = currentContext.watermarkStyle,
    displayRevision = currentContext.displayRevision,
  } = payload || {};

  return {
    instrument: instrument == null ? null : String(instrument),
    displayTimeframe: normalizeDisplayTimeframe(displayTimeframe),
    loadedCoverage: normalizeLoadedCoverage(loadedCoverage),
    displayTimezone: displayTimezone || DEFAULT_DISPLAY_TIMEZONE,
    exchangeTimezone: exchangeTimezone || DEFAULT_EXCHANGE_TIMEZONE,
    timeFormat: timeFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
    dateFormat: dateFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.dateFormat,
    showDayOfWeekLabels: showDayOfWeekLabels == null
      ? DEFAULT_CHART_PRESENTATION_SETTINGS.showDayOfWeekLabels
      : Boolean(showDayOfWeekLabels),
    showCrosshairReadout: showCrosshairReadout == null
      ? DEFAULT_CHART_PRESENTATION_SETTINGS.showCrosshairReadout
      : Boolean(showCrosshairReadout),
    margins: {
      topPercent: Number(margins?.topPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.topPercent),
      bottomPercent: Number(margins?.bottomPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.bottomPercent),
    },
    rightOffsetBars: Number(rightOffsetBars ?? DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars),
    candleStyle: cloneCandleStyle(candleStyle),
    gridStyle: cloneGridStyle(gridStyle),
    crosshairStyle: cloneCrosshairStyle(crosshairStyle),
    backgroundStyle: cloneBackgroundStyle(backgroundStyle),
    scaleStyle: cloneScaleStyle(scaleStyle),
    watermarkStyle: cloneWatermarkStyle(watermarkStyle),
    displayRevision: Math.max(0, Math.floor(Number(displayRevision || 0))),
  };
}
