import { readWorkstationSettings } from '../workstation-settings/public.js';

const HIDDEN_BODY_PRICE_COLOR = '#787b86';

/** Map independent Name/Value/Line intent to native options plus one name-only fallback. */
export function createCurrentPriceSeriesPresentation(settings, instrumentLabel = '') {
  const { currentPrice } = readWorkstationSettings(settings);
  const symbol = String(instrumentLabel ?? '').trim();
  return Object.freeze({
    customNameOnlyVisible: currentPrice.nameVisible && !currentPrice.valueVisible && symbol.length > 0,
    lastValueVisible: currentPrice.valueVisible,
    priceLineVisible: currentPrice.lineVisible,
    title: currentPrice.nameVisible && currentPrice.valueVisible ? symbol : '',
  });
}

/**
 * Own the only non-native combination: a current-price symbol axis label with
 * no numeric value. Lightweight Charts otherwise owns value labels and lines.
 */
export function createCurrentPriceNamePrimitive() {
  let requestUpdate = () => {};
  let series = null;
  let state = Object.freeze({ backColor: HIDDEN_BODY_PRICE_COLOR, name: '', price: null, visible: false });
  const view = Object.freeze({
    backColor: () => state.backColor,
    coordinate: () => {
      const coordinate = Number.isFinite(state.price) ? series?.priceToCoordinate(state.price) : null;
      return Number.isFinite(coordinate) ? coordinate : -10_000;
    },
    text: () => state.name,
    textColor: () => '#ffffff',
    tickVisible: () => true,
    visible: () => state.visible && Number.isFinite(state.price) && state.name.length > 0,
  });
  const views = Object.freeze([view]);
  const primitive = Object.freeze({
    attached(parameters) {
      series = parameters.series;
      requestUpdate = parameters.requestUpdate;
    },
    detached() {
      requestUpdate = () => {};
      series = null;
    },
    priceAxisViews: () => views,
  });

  return Object.freeze({
    primitive,
    snapshot: () => state,
    update({ bar = null, instrumentLabel = '', settings }) {
      const value = readWorkstationSettings(settings);
      const presentation = createCurrentPriceSeriesPresentation(settings, instrumentLabel);
      const direction = bar && Number(bar.close) < Number(bar.open) ? 'down' : 'up';
      const bodyColor = direction === 'down'
        ? value.candles.downBodyColor
        : value.candles.upBodyColor;
      state = Object.freeze({
        backColor: value.candles.bodyVisible ? bodyColor : HIDDEN_BODY_PRICE_COLOR,
        name: String(instrumentLabel ?? '').trim(),
        price: Number.isFinite(bar?.close) ? Number(bar.close) : null,
        visible: presentation.customNameOnlyVisible,
      });
      requestUpdate();
    },
  });
}
