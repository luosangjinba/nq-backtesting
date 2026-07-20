import {
  ColorType,
  CrosshairMode,
  TickMarkType,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';

const localTime = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', hourCycle: 'h23', minute: '2-digit',
});
const localDay = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: '2-digit' });
const localMonth = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
const localYear = new Intl.DateTimeFormat(undefined, { year: 'numeric' });
const localCrosshair = new Intl.DateTimeFormat(undefined, {
  day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', month: 'short', year: 'numeric',
});

function localTick(time, type) {
  const date = new Date(Number(time) * 1_000);
  if (type === TickMarkType.Year) return localYear.format(date);
  if (type === TickMarkType.Month) return localMonth.format(date);
  if (type === TickMarkType.DayOfMonth) return localDay.format(date);
  return localTime.format(date);
}

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
  localization: Object.freeze({ timeFormatter: (time) => localCrosshair.format(new Date(Number(time) * 1_000)) }),
  layout: Object.freeze({
    background: Object.freeze({ color: '#050505', type: ColorType.Solid }),
    attributionLogo: false,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    textColor: '#9a9a9a',
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
    tickMarkFormatter: localTick,
  }),
});
