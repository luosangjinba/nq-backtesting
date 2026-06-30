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
});

export const DEFAULT_CHART_PRESENTATION_SETTINGS = Object.freeze({
  timeFormat: CHART_TIME_FORMATS.H24,
  dateFormat: CHART_DATE_FORMATS.ISO_DATE,
  showStatusOhlc: true,
  showStatusChange: true,
  showCrosshairReadout: true,
  margins: Object.freeze({
    topPercent: 10,
    bottomPercent: 8,
  }),
  rightOffsetBars: 10,
});
