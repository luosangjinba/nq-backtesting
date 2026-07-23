import {
  createPricePresentation,
  readWorkstationSettings,
} from '../workstation-settings/public.js';

const TRANSPARENT_BODY = 'rgba(0, 0, 0, 0)';
const HIDDEN_BODY_PRICE_LINE = '#787b86';

/** Map the global branded Settings value to native series-only presentation options. */
export function createCandleSeriesPresentation(settings, priceIncrement) {
  const { candles } = readWorkstationSettings(settings);
  const price = createPricePresentation({
    priceIncrement,
    pricePrecision: candles.pricePrecision,
  });
  return Object.freeze({
    borderDownColor: candles.downBorderColor,
    borderUpColor: candles.upBorderColor,
    borderVisible: candles.bordersVisible,
    downColor: candles.bodyVisible ? candles.downBodyColor : TRANSPARENT_BODY,
    priceFormat: price.priceFormat,
    priceLineColor: candles.bodyVisible ? '' : HIDDEN_BODY_PRICE_LINE,
    upColor: candles.bodyVisible ? candles.upBodyColor : TRANSPARENT_BODY,
    wickDownColor: candles.downWickColor,
    wickUpColor: candles.upWickColor,
    wickVisible: candles.wicksVisible,
  });
}
