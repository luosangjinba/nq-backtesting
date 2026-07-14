function resolveColor(value, fallback) {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

export function createSymbolSettingsSeriesOptions(settings = {}, defaults = {}) {
  const precisionSetting = ['0', '1', '2', '3', '4', '5', '6']
    .includes(String(settings.symbolPricePrecision))
    ? String(settings.symbolPricePrecision)
    : 'auto';
  const priceFormat = precisionSetting === 'auto'
    ? { ...(defaults.priceFormat || { minMove: 0.01, precision: 2, type: 'price' }) }
    : {
      minMove: Number(`1e-${precisionSetting}`),
      precision: Number(precisionSetting),
      type: 'price',
    };
  const state = Object.freeze({
    symbolBordersVisible: settings.symbolBordersVisible === true,
    symbolDownBodyColor: resolveColor(settings.symbolDownBodyColor, defaults.downColor),
    symbolDownBorderColor: resolveColor(settings.symbolDownBorderColor, defaults.borderDownColor),
    symbolDownWickColor: resolveColor(settings.symbolDownWickColor, defaults.wickDownColor),
    symbolPricePrecision: precisionSetting,
    symbolUpBodyColor: resolveColor(settings.symbolUpBodyColor, defaults.upColor),
    symbolUpBorderColor: resolveColor(settings.symbolUpBorderColor, defaults.borderUpColor),
    symbolUpWickColor: resolveColor(settings.symbolUpWickColor, defaults.wickUpColor),
    symbolWicksVisible: settings.symbolWicksVisible !== false,
  });
  return Object.freeze({
    options: Object.freeze({
      borderDownColor: state.symbolDownBorderColor,
      borderUpColor: state.symbolUpBorderColor,
      borderVisible: state.symbolBordersVisible,
      downColor: state.symbolDownBodyColor,
      priceFormat,
      upColor: state.symbolUpBodyColor,
      wickDownColor: state.symbolDownWickColor,
      wickUpColor: state.symbolUpWickColor,
      wickVisible: state.symbolWicksVisible,
    }),
    state,
  });
}
