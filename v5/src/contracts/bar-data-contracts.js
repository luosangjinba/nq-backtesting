export const BAR_DATA_COMMANDS = Object.freeze({
  PLAN_WINDOW: 'barData.planWindow',
  LOAD_WINDOW: 'barData.loadWindow',
  GET_WINDOW: 'barData.getWindow',
  RELEASE_WINDOW: 'barData.releaseWindow',
  PRUNE_CACHE: 'barData.pruneCache',
  GET_CACHE_SUMMARY: 'barData.getCacheSummary',
});

export const BAR_DATA_EVENTS = Object.freeze({
  WINDOW_LOADED: 'barData:windowLoaded',
  WINDOW_RELEASE_DEFERRED: 'barData:windowReleaseDeferred',
  WINDOW_RELEASED: 'barData:windowReleased',
});
