import {
  LIGHTWEIGHT_PRICE_FORMAT,
  LIGHTWEIGHT_REPLAY_SCALE,
  LIGHTWEIGHT_REPLAY_SCROLL,
  LIGHTWEIGHT_REPLAY_TIMESCALE,
  priceScaleMarginsForContext,
} from './chart-engine-presentation.js';

export function applyFallbackPresentation(canvas, context) {
  canvas.dataset.crosshairReadout = context.showCrosshairReadout ? 'true' : 'false';
  canvas.dataset.rightOffsetBars = String(context.rightOffsetBars);
  canvas.dataset.candleBodyUp = context.candleStyle.body.up;
  canvas.dataset.candleBodyDown = context.candleStyle.body.down;
  canvas.dataset.candleBorderUp = context.candleStyle.border.up;
  canvas.dataset.candleBorderDown = context.candleStyle.border.down;
  canvas.dataset.candleWickUp = context.candleStyle.wick.up;
  canvas.dataset.candleWickDown = context.candleStyle.wick.down;
  canvas.dataset.gridVerticalVisible = String(context.gridStyle.verticalVisible);
  canvas.dataset.gridHorizontalVisible = String(context.gridStyle.horizontalVisible);
  canvas.dataset.gridVerticalColor = context.gridStyle.verticalColor;
  canvas.dataset.gridHorizontalColor = context.gridStyle.horizontalColor;
  canvas.dataset.crosshairVerticalVisible = String(context.crosshairStyle.verticalVisible);
  canvas.dataset.crosshairHorizontalVisible = String(context.crosshairStyle.horizontalVisible);
  canvas.dataset.crosshairVerticalColor = context.crosshairStyle.verticalColor;
  canvas.dataset.crosshairHorizontalColor = context.crosshairStyle.horizontalColor;
  canvas.dataset.crosshairLabelBackgroundColor = context.crosshairStyle.labelBackgroundColor;
  canvas.dataset.backgroundColor = context.backgroundStyle.color;
  canvas.dataset.scaleTextColor = context.scaleStyle.textColor;
  canvas.dataset.scaleLineColor = context.scaleStyle.lineColor;
  canvas.dataset.scaleFontSize = String(context.scaleStyle.fontSize);
  canvas.dataset.priceScaleSide = context.scaleStyle.priceScaleSide;
  canvas.dataset.priceScaleVisible = String(context.scaleStyle.priceScaleVisible);
  canvas.dataset.timeScaleVisible = String(context.scaleStyle.timeScaleVisible);
  canvas.dataset.scaleBordersVisible = String(context.scaleStyle.scaleBordersVisible);
  canvas.dataset.watermarkVisible = String(context.watermarkStyle.visible);
  canvas.dataset.watermarkText = context.watermarkStyle.text;
  canvas.dataset.watermarkColor = context.watermarkStyle.color;
  canvas.dataset.watermarkFontSize = String(context.watermarkStyle.fontSize);
  canvas.dataset.dateFormat = context.dateFormat;
  canvas.dataset.showDayOfWeekLabels = String(context.showDayOfWeekLabels);
  canvas.style.backgroundColor = context.backgroundStyle.color;
  canvas.style.color = context.scaleStyle.textColor;
  canvas.style.paddingTop = `${context.margins.topPercent}%`;
  canvas.style.paddingBottom = `${context.margins.bottomPercent}%`;
  canvas.style.paddingRight = `${context.rightOffsetBars * 10}px`;
}

export function applyFallbackMetadata(canvas, metadata = {}) {
  Object.entries(metadata).forEach(([key, value]) => {
    canvas.dataset[key] = String(value);
  });
}

export function applyLightweightMetadata(canvas, context) {
  canvas.dataset.timeScaleBarSpacing = String(LIGHTWEIGHT_REPLAY_TIMESCALE.barSpacing);
  canvas.dataset.timeScaleMinBarSpacing = String(LIGHTWEIGHT_REPLAY_TIMESCALE.minBarSpacing);
  canvas.dataset.timeScaleLockOnResize = String(LIGHTWEIGHT_REPLAY_TIMESCALE.lockVisibleTimeRangeOnResize);
  canvas.dataset.timeScaleRightBarStaysOnScroll = String(LIGHTWEIGHT_REPLAY_TIMESCALE.rightBarStaysOnScroll);
  canvas.dataset.timeScaleShiftOnNewBar = String(LIGHTWEIGHT_REPLAY_TIMESCALE.shiftVisibleRangeOnNewBar);
  canvas.dataset.handleScrollMouseWheel = String(LIGHTWEIGHT_REPLAY_SCROLL.mouseWheel);
  canvas.dataset.handleScrollPressedMouseMove = String(LIGHTWEIGHT_REPLAY_SCROLL.pressedMouseMove);
  canvas.dataset.handleScaleMouseWheel = String(LIGHTWEIGHT_REPLAY_SCALE.mouseWheel);
  canvas.dataset.handleScaleAxisPressedMouseMove = String(!context.scaleStyle.lockPriceToBarRatio);
  canvas.dataset.timeScaleRightOffset = String(context.rightOffsetBars);
  canvas.dataset.lightweightMarginTopPercent = String(context.margins.topPercent);
  canvas.dataset.lightweightMarginBottomPercent = String(context.margins.bottomPercent);
  const priceScaleMargins = priceScaleMarginsForContext(context);
  canvas.dataset.priceScaleMarginTop = String(priceScaleMargins.top);
  canvas.dataset.priceScaleMarginBottom = String(priceScaleMargins.bottom);
  canvas.dataset.pricePrecision = String(LIGHTWEIGHT_PRICE_FORMAT.precision);
  canvas.dataset.priceMinMove = String(LIGHTWEIGHT_PRICE_FORMAT.minMove);
  canvas.dataset.candleBodyUp = context.candleStyle.body.up;
  canvas.dataset.candleBodyDown = context.candleStyle.body.down;
  canvas.dataset.candleBorderUp = context.candleStyle.border.up;
  canvas.dataset.candleBorderDown = context.candleStyle.border.down;
  canvas.dataset.candleWickUp = context.candleStyle.wick.up;
  canvas.dataset.candleWickDown = context.candleStyle.wick.down;
  canvas.dataset.gridVerticalVisible = String(context.gridStyle.verticalVisible);
  canvas.dataset.gridHorizontalVisible = String(context.gridStyle.horizontalVisible);
  canvas.dataset.gridVerticalColor = context.gridStyle.verticalColor;
  canvas.dataset.gridHorizontalColor = context.gridStyle.horizontalColor;
  canvas.dataset.crosshairVerticalVisible = String(context.crosshairStyle.verticalVisible);
  canvas.dataset.crosshairHorizontalVisible = String(context.crosshairStyle.horizontalVisible);
  canvas.dataset.crosshairVerticalColor = context.crosshairStyle.verticalColor;
  canvas.dataset.crosshairHorizontalColor = context.crosshairStyle.horizontalColor;
  canvas.dataset.crosshairLabelBackgroundColor = context.crosshairStyle.labelBackgroundColor;
  canvas.dataset.backgroundColor = context.backgroundStyle.color;
  canvas.dataset.scaleTextColor = context.scaleStyle.textColor;
  canvas.dataset.scaleLineColor = context.scaleStyle.lineColor;
  canvas.dataset.scaleFontSize = String(context.scaleStyle.fontSize);
  canvas.dataset.priceScaleSide = context.scaleStyle.priceScaleSide;
  canvas.dataset.priceScaleVisible = String(context.scaleStyle.priceScaleVisible);
  canvas.dataset.timeScaleVisible = String(context.scaleStyle.timeScaleVisible);
  canvas.dataset.scaleBordersVisible = String(context.scaleStyle.scaleBordersVisible);
  canvas.dataset.lockPriceToBarRatio = String(context.scaleStyle.lockPriceToBarRatio);
  canvas.dataset.watermarkVisible = String(context.watermarkStyle.visible);
  canvas.dataset.watermarkText = context.watermarkStyle.text;
  canvas.dataset.watermarkColor = context.watermarkStyle.color;
  canvas.dataset.watermarkFontSize = String(context.watermarkStyle.fontSize);
  canvas.dataset.dateFormat = context.dateFormat;
  canvas.dataset.showDayOfWeekLabels = String(context.showDayOfWeekLabels);
}

export function applyLightweightPresentation(canvas, context) {
  canvas.style.paddingTop = '';
  canvas.style.paddingBottom = '';
  canvas.style.paddingRight = '';
  canvas.style.backgroundColor = '';
  canvas.style.color = '';
  applyLightweightMetadata(canvas, context);
}
