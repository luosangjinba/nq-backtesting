import {
  ColorType,
  CrosshairMode,
  TickMarkType,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';

export const EXCHANGE_TIME_ZONE = 'America/New_York';

/** Build chart-only New York presentation without changing real bar instants. */
export function createExchangeTimePresentation(locale = undefined) {
  const options = { timeZone: EXCHANGE_TIME_ZONE };
  const time = new Intl.DateTimeFormat(locale, {
    ...options, hour: '2-digit', hourCycle: 'h23', minute: '2-digit',
  });
  const day = new Intl.DateTimeFormat(locale, {
    ...options, day: '2-digit', month: 'short', year: '2-digit',
  });
  const month = new Intl.DateTimeFormat(locale, { ...options, month: 'short', year: 'numeric' });
  const year = new Intl.DateTimeFormat(locale, { ...options, year: 'numeric' });
  const crosshair = new Intl.DateTimeFormat(locale, {
    ...options,
    day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', month: 'short', year: 'numeric',
  });
  return Object.freeze({
    tickMarkFormatter(value, type) {
      const date = new Date(Number(value) * 1_000);
      if (type === TickMarkType.Year) return year.format(date);
      if (type === TickMarkType.Month) return month.format(date);
      if (type === TickMarkType.DayOfMonth) return day.format(date);
      return time.format(date);
    },
    timeFormatter: (value) => crosshair.format(new Date(Number(value) * 1_000)),
  });
}

const exchangeTimePresentation = createExchangeTimePresentation();

export const CANDLE_OPTIONS = Object.freeze({
  borderDownColor: '#f23645',
  borderUpColor: '#089981',
  downColor: '#f23645',
  wickDownColor: '#f23645',
  wickUpColor: '#089981',
  upColor: '#089981',
});

export const CHART_OPTIONS = Object.freeze({
  autoSize: true,
  localization: Object.freeze({ timeFormatter: exchangeTimePresentation.timeFormatter }),
  layout: Object.freeze({
    background: Object.freeze({ color: '#000000', type: ColorType.Solid }),
    attributionLogo: false,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: 12,
    textColor: '#b8bdc5',
  }),
  grid: Object.freeze({
    horzLines: Object.freeze({ color: '#181818' }),
    vertLines: Object.freeze({ color: '#181818' }),
  }),
  crosshair: Object.freeze({ mode: CrosshairMode.Normal }),
  rightPriceScale: Object.freeze({
    borderColor: '#2b2b2b',
    minimumWidth: 68,
    scaleMargins: Object.freeze({ bottom: 0.12, top: 0.1 }),
  }),
  timeScale: Object.freeze({
    borderColor: '#2b2b2b',
    fixLeftEdge: false,
    lockVisibleTimeRangeOnResize: true,
    rightBarStaysOnScroll: false,
    secondsVisible: false,
    timeVisible: true,
    tickMarkFormatter: exchangeTimePresentation.tickMarkFormatter,
  }),
});
