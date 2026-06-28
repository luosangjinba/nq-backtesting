export function buildInstallComparisonBarsMockScript() {
  return `
    (() => {
      window.__comparisonFetchCalls = 0;
      window.__comparisonBarsUrls = [];
      const makeBars = (instrument, timeframe) => {
        const base = instrument === 'NQ' ? 29400 : 7400;
        const step = Number(timeframe) * 60;
        if (Number(timeframe) === 1) {
          return [
            { time: '2026-06-12 09:00', timestamp: 1781254800, tradingDay: '2026-06-12', open: base + 4, high: base + 18, low: base - 30, close: base + 8, volume: 1000 },
            { time: '2026-06-12 09:30', timestamp: 1781256600, tradingDay: '2026-06-12', open: base + 8, high: base + 30, low: base - 15, close: base + 24, volume: 1200 },
            { time: '2026-06-12 10:00', timestamp: 1781258400, tradingDay: '2026-06-12', open: base + 24, high: base + 45, low: base + 14, close: base + 35, volume: 1300 },
            { time: '2026-06-12 10:30', timestamp: 1781260200, tradingDay: '2026-06-12', open: base + 35, high: base + 52, low: base + 22, close: base + 48, volume: 1100 },
            { time: '2026-06-12 11:00', timestamp: 1781262000, tradingDay: '2026-06-12', open: base + 48, high: base + 60, low: base + 32, close: base + 40, volume: 900 },
          ];
        }
        return [
          { time: '2026-06-12 09:00', timestamp: 1781254800, tradingDay: '2026-06-12', open: base + 4.5, high: base + 24.75, low: base - 33.5, close: base - 17.0, volume: 169817 },
          { time: '2026-06-12 10:00', timestamp: 1781254800 + step, tradingDay: '2026-06-12', open: base - 16.75, high: base + 43.5, low: base - 19.75, close: base + 40.5, volume: 200251 },
          { time: '2026-06-12 11:00', timestamp: 1781254800 + step * 2, tradingDay: '2026-06-12', open: base + 40.75, high: base + 61.75, low: base + 30.25, close: base + 5.75, volume: 160953 },
        ];
      };
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (...args) => {
        if (String(args[0]).includes('/v4/bars')) {
          const url = new URL(String(args[0]), window.location.href);
          const instrument = url.searchParams.get('instrument') || 'ES';
          const timeframe = Number(url.searchParams.get('tf') || 60);
          window.__comparisonFetchCalls += 1;
          window.__comparisonLastBarsUrl = String(args[0]);
          window.__comparisonBarsUrls.push(String(args[0]));
          const bars = makeBars(instrument, timeframe);
          return Promise.resolve(new Response(JSON.stringify({
            bars,
            requestedRange: { startTs: bars[0].timestamp, endTs: bars.at(-1).timestamp },
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
        return nativeFetch(...args);
      };
      return true;
    })();
  `;
}
