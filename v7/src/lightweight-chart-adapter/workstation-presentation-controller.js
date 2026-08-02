import { createWorkstationSettings, readWorkstationSettings } from '../workstation-settings/public.js';
import { createCanvasPresentation } from './canvas-presentation.js';
import { createCandleSeriesPresentation } from './candle-presentation.js';
import { createChartTimePresentation } from './chart-options.js';
import { createCurrentPriceSeriesPresentation } from './current-price-presentation.js';

export function createWorkstationPresentationController({
  candleSeriesWriter,
  chart,
  currentPriceName,
  host,
  priceScale,
  truncationInteraction,
}) {
  let instrumentLabel = '';
  let priceIncrement = '0.01';
  let settings = createWorkstationSettings();

  function syncCurrentPrice(data) {
    currentPriceName.update({ bar: data.at(-1) ?? null, instrumentLabel, settings });
  }

  function applyNative(nextSettings, nextPriceIncrement, nextInstrumentLabel) {
    const canvasPresentation = createCanvasPresentation(nextSettings);
    const timePresentation = createChartTimePresentation(nextSettings);
    chart.applyOptions({
      ...canvasPresentation.chartOptions,
      localization: { timeFormatter: timePresentation.timeFormatter },
      timeScale: { tickMarkFormatter: timePresentation.tickMarkFormatter },
    });
    priceScale.applyOptions(canvasPresentation.priceScaleOptions);
    truncationInteraction.setNormalCrosshair(canvasPresentation.crosshairOptions);
    const { customNameOnlyVisible: _customNameOnlyVisible, ...currentPriceOptions }
      = createCurrentPriceSeriesPresentation(nextSettings, nextInstrumentLabel);
    candleSeriesWriter.applyOptions({
      ...createCandleSeriesPresentation(nextSettings, nextPriceIncrement),
      ...currentPriceOptions,
    });
  }

  function publishDataset(value) {
    host.dataset.bodyVisible = String(value.candles.bodyVisible);
    host.dataset.canvasBackgroundColor = value.canvas.backgroundColor;
    host.dataset.bordersVisible = String(value.candles.bordersVisible);
    host.dataset.crosshairColor = value.canvas.crosshairColor;
    host.dataset.crosshairOpacityPercent = String(value.canvas.crosshairOpacityPercent);
    host.dataset.crosshairStyle = value.canvas.crosshairStyle;
    host.dataset.crosshairWidth = String(value.canvas.crosshairWidth);
    host.dataset.gridVisible = String(value.canvas.gridVisible);
    host.dataset.scaleFontSize = String(value.canvas.scaleFontSize);
    host.dataset.scaleTextColor = value.canvas.scaleTextColor;
    host.dataset.scaleMarginBottomPercent = String(value.canvas.bottomMarginPercent);
    host.dataset.scaleMarginTopPercent = String(value.canvas.topMarginPercent);
    host.dataset.pricePrecision = String(value.candles.pricePrecision);
    host.dataset.currentPriceLineVisible = String(value.currentPrice.lineVisible);
    host.dataset.currentPriceNameVisible = String(value.currentPrice.nameVisible);
    host.dataset.currentPriceValueVisible = String(value.currentPrice.valueVisible);
    host.dataset.dateFormat = value.time.dateFormat;
    host.dataset.dayOfWeekVisible = String(value.time.dayOfWeekVisible);
    host.dataset.displayTimezone = value.time.displayTimezone;
    host.dataset.hourFormat = value.time.hourFormat;
    host.dataset.wicksVisible = String(value.candles.wicksVisible);
  }

  return Object.freeze({
    apply(
      nextSettings,
      nextPriceIncrement = priceIncrement,
      nextInstrumentLabel = instrumentLabel,
      data = [],
    ) {
      const value = readWorkstationSettings(nextSettings);
      try {
        applyNative(nextSettings, nextPriceIncrement, nextInstrumentLabel);
      } catch (error) {
        try {
          applyNative(settings, priceIncrement, instrumentLabel);
          syncCurrentPrice(data);
        } catch { /* Preserve the first native option failure. */ }
        throw error;
      }
      settings = nextSettings;
      priceIncrement = nextPriceIncrement;
      instrumentLabel = nextInstrumentLabel;
      syncCurrentPrice(data);
      publishDataset(value);
    },
    snapshot: () => Object.freeze({ instrumentLabel, priceIncrement, settings }),
    syncCurrentPrice,
  });
}
