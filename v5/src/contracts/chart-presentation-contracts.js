export const CHART_PRESENTATION_COMMANDS = Object.freeze({
  GET: 'chartPresentation.get',
  SET: 'chartPresentation.set',
  RESET: 'chartPresentation.reset',
});

export const CHART_PRESENTATION_EVENTS = Object.freeze({
  CHANGED: 'chartPresentation:changed',
});

export const CHART_TIME_FORMATS = Object.freeze({
  H24: '24h',
  H12: '12h',
});

export const CHART_DATE_FORMATS = Object.freeze({
  ISO_DATE: 'YYYY-MM-DD',
  MONTH_DAY_YEAR: "MMM DD 'YY",
  DAY_MONTH_YEAR: "DD MMM 'YY",
});

export const STATUS_TITLE_MODES = Object.freeze({
  SYMBOL_TIMEFRAME: 'symbol-timeframe',
  SYMBOL: 'symbol',
  TIMEFRAME: 'timeframe',
});

export const PRICE_SCALE_SIDES = Object.freeze({
  RIGHT: 'right',
  LEFT: 'left',
});

export const DEFAULT_CANDLE_STYLE = Object.freeze({
  body: Object.freeze({
    up: '#26a69a',
    down: '#ef5350',
  }),
  border: Object.freeze({
    up: '#26a69a',
    down: '#ef5350',
  }),
  wick: Object.freeze({
    up: '#26a69a',
    down: '#ef5350',
  }),
});

export const DEFAULT_GRID_STYLE = Object.freeze({
  verticalVisible: true,
  horizontalVisible: true,
  verticalColor: '#374151',
  horizontalColor: '#374151',
});

export const DEFAULT_CROSSHAIR_STYLE = Object.freeze({
  verticalVisible: true,
  horizontalVisible: true,
  verticalColor: '#94a3b8',
  horizontalColor: '#94a3b8',
  labelBackgroundColor: '#334155',
});

export const DEFAULT_BACKGROUND_STYLE = Object.freeze({
  color: '#111827',
});

export const DEFAULT_SCALE_STYLE = Object.freeze({
  textColor: '#22d3ee',
  lineColor: '#334155',
  fontSize: 12,
  priceScaleSide: PRICE_SCALE_SIDES.RIGHT,
  priceScaleVisible: true,
  timeScaleVisible: true,
  scaleBordersVisible: true,
});

export const DEFAULT_WATERMARK_STYLE = Object.freeze({
  visible: false,
  text: 'FX Replay',
  color: '#334155',
  fontSize: 48,
});

export const DEFAULT_CHART_PRESENTATION_SETTINGS = Object.freeze({
  timeFormat: CHART_TIME_FORMATS.H24,
  dateFormat: CHART_DATE_FORMATS.ISO_DATE,
  showStatusTitle: true,
  statusTitleMode: STATUS_TITLE_MODES.SYMBOL_TIMEFRAME,
  showOpenMarketStatus: true,
  showDayOfWeekLabels: false,
  showStatusOhlc: true,
  showStatusChange: true,
  showCrosshairReadout: true,
  showBarCountdown: false,
  margins: Object.freeze({
    topPercent: 10,
    bottomPercent: 8,
  }),
  rightOffsetBars: 10,
  candleStyle: DEFAULT_CANDLE_STYLE,
  gridStyle: DEFAULT_GRID_STYLE,
  crosshairStyle: DEFAULT_CROSSHAIR_STYLE,
  backgroundStyle: DEFAULT_BACKGROUND_STYLE,
  scaleStyle: DEFAULT_SCALE_STYLE,
  watermarkStyle: DEFAULT_WATERMARK_STYLE,
});
