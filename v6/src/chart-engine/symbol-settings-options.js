function resolveColor(value, fallback) {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

export function createSymbolSettingsSeriesOptions(settings = {}, defaults = {}) {
  const state = Object.freeze({
    symbolBordersVisible: settings.symbolBordersVisible === true,
    symbolDownBodyColor: resolveColor(settings.symbolDownBodyColor, defaults.downColor),
    symbolDownBorderColor: resolveColor(settings.symbolDownBorderColor, defaults.borderDownColor),
    symbolDownWickColor: resolveColor(settings.symbolDownWickColor, defaults.wickDownColor),
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
      upColor: state.symbolUpBodyColor,
      wickDownColor: state.symbolDownWickColor,
      wickUpColor: state.symbolUpWickColor,
      wickVisible: state.symbolWicksVisible,
    }),
    state,
  });
}
