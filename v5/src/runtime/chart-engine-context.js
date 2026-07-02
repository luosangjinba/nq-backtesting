import { DEFAULT_DISPLAY_TIMEZONE, DEFAULT_EXCHANGE_TIMEZONE } from '../contracts/timezone-contracts.js';
import { DEFAULT_CHART_PRESENTATION_SETTINGS } from '../contracts/chart-presentation-contracts.js';

export function timestampSeconds(value, label) {
  const parsed = typeof value === 'number' ? value * 1000 : Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid chart timestamp.`);
  }
  return Math.floor(parsed / 1000);
}

export function toEngineBar(bar) {
  return {
    time: timestampSeconds(bar.time, 'chart engine bar time'),
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close),
  };
}

export function toChartBar(bar) {
  if (!bar) return null;
  return {
    time: typeof bar.time === 'number'
      ? new Date(timestampSeconds(bar.time, 'chart readout bar time') * 1000).toISOString()
      : bar.time,
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close),
  };
}

export function normalizeContext(context = {}) {
  const defaultCandleStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.candleStyle;
  const defaultGridStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.gridStyle;
  const defaultCrosshairStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.crosshairStyle;
  const defaultBackgroundStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.backgroundStyle;
  const defaultScaleStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle;
  const defaultWatermarkStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle;
  return {
    displayTimezone: context.displayTimezone || DEFAULT_DISPLAY_TIMEZONE,
    exchangeTimezone: context.exchangeTimezone || DEFAULT_EXCHANGE_TIMEZONE,
    timeFormat: context.timeFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
    dateFormat: context.dateFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.dateFormat,
    showDayOfWeekLabels: context.showDayOfWeekLabels == null
      ? DEFAULT_CHART_PRESENTATION_SETTINGS.showDayOfWeekLabels
      : Boolean(context.showDayOfWeekLabels),
    showCrosshairReadout: context.showCrosshairReadout == null
      ? DEFAULT_CHART_PRESENTATION_SETTINGS.showCrosshairReadout
      : Boolean(context.showCrosshairReadout),
    margins: {
      topPercent: Number(
        context.margins?.topPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.topPercent
      ),
      bottomPercent: Number(
        context.margins?.bottomPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.bottomPercent
      ),
    },
    rightOffsetBars: Number(context.rightOffsetBars ?? DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars),
    candleStyle: {
      body: {
        up: context.candleStyle?.body?.up || defaultCandleStyle.body.up,
        down: context.candleStyle?.body?.down || defaultCandleStyle.body.down,
      },
      border: {
        up: context.candleStyle?.border?.up || defaultCandleStyle.border.up,
        down: context.candleStyle?.border?.down || defaultCandleStyle.border.down,
      },
      wick: {
        up: context.candleStyle?.wick?.up || defaultCandleStyle.wick.up,
        down: context.candleStyle?.wick?.down || defaultCandleStyle.wick.down,
      },
    },
    gridStyle: {
      verticalVisible: context.gridStyle?.verticalVisible == null
        ? defaultGridStyle.verticalVisible
        : Boolean(context.gridStyle.verticalVisible),
      horizontalVisible: context.gridStyle?.horizontalVisible == null
        ? defaultGridStyle.horizontalVisible
        : Boolean(context.gridStyle.horizontalVisible),
      verticalColor: context.gridStyle?.verticalColor || defaultGridStyle.verticalColor,
      horizontalColor: context.gridStyle?.horizontalColor || defaultGridStyle.horizontalColor,
    },
    crosshairStyle: {
      verticalVisible: context.crosshairStyle?.verticalVisible == null
        ? defaultCrosshairStyle.verticalVisible
        : Boolean(context.crosshairStyle.verticalVisible),
      horizontalVisible: context.crosshairStyle?.horizontalVisible == null
        ? defaultCrosshairStyle.horizontalVisible
        : Boolean(context.crosshairStyle.horizontalVisible),
      verticalColor: context.crosshairStyle?.verticalColor || defaultCrosshairStyle.verticalColor,
      horizontalColor: context.crosshairStyle?.horizontalColor || defaultCrosshairStyle.horizontalColor,
      labelBackgroundColor: context.crosshairStyle?.labelBackgroundColor || defaultCrosshairStyle.labelBackgroundColor,
    },
    backgroundStyle: {
      color: context.backgroundStyle?.color || defaultBackgroundStyle.color,
    },
    scaleStyle: {
      textColor: context.scaleStyle?.textColor || defaultScaleStyle.textColor,
      lineColor: context.scaleStyle?.lineColor || defaultScaleStyle.lineColor,
      fontSize: Number(context.scaleStyle?.fontSize ?? defaultScaleStyle.fontSize),
      priceScaleVisible: context.scaleStyle?.priceScaleVisible == null
        ? defaultScaleStyle.priceScaleVisible
        : Boolean(context.scaleStyle.priceScaleVisible),
      timeScaleVisible: context.scaleStyle?.timeScaleVisible == null
        ? defaultScaleStyle.timeScaleVisible
        : Boolean(context.scaleStyle.timeScaleVisible),
      scaleBordersVisible: context.scaleStyle?.scaleBordersVisible == null
        ? defaultScaleStyle.scaleBordersVisible
        : Boolean(context.scaleStyle.scaleBordersVisible),
    },
    watermarkStyle: {
      visible: context.watermarkStyle?.visible == null
        ? defaultWatermarkStyle.visible
        : Boolean(context.watermarkStyle.visible),
      text: context.watermarkStyle?.text == null ? defaultWatermarkStyle.text : String(context.watermarkStyle.text),
      color: context.watermarkStyle?.color || defaultWatermarkStyle.color,
      fontSize: Number(context.watermarkStyle?.fontSize ?? defaultWatermarkStyle.fontSize),
    },
  };
}
