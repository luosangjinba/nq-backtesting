export function createCurrentPriceSeriesOptions(settings = {}, symbol = '') {
  const state = Object.freeze({
    currentPriceLineVisible: settings.currentPriceLineVisible !== false,
    currentPriceNameVisible: settings.currentPriceNameVisible !== false,
    currentPriceValueVisible: settings.currentPriceValueVisible !== false,
    symbol: String(symbol || '').trim().toUpperCase(),
  });
  return Object.freeze({
    options: Object.freeze({
      lastValueVisible: state.currentPriceValueVisible,
      priceLineVisible: state.currentPriceLineVisible,
      title: state.currentPriceNameVisible ? state.symbol : '',
    }),
    state,
  });
}
