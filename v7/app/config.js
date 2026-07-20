export const SESSION_BROWSER_CONFIG = Object.freeze({
  storageNamespace: 'v7.session-browser',
  instruments: Object.freeze([
    Object.freeze({ id: 'instrument.cme.nq', label: 'NQ', market: 'Nasdaq-100 futures', category: 'Futures', venue: 'US Futures' }),
    Object.freeze({ id: 'instrument.cme.es', label: 'ES', market: 'S&P 500 futures', category: 'Futures', venue: 'US Futures' }),
  ]),
});
