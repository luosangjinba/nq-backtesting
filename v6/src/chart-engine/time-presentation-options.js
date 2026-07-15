import { formatChartDateTime, formatChartTime } from '../time-domain/time-presentation.js';

export function createTimePresentationChartOptions(settings = {}) {
  const state = Object.freeze({
    dateFormat: ['yyyy-mm-dd', 'dd/mm/yyyy', 'mm/dd/yyyy'].includes(settings.dateFormat)
      ? settings.dateFormat
      : 'yyyy/mm/dd',
    displayTimezone: ['utc', 'local'].includes(settings.displayTimezone)
      ? settings.displayTimezone
      : 'exchange',
    showDayOfWeek: settings.showDayOfWeek !== false,
    timeFormat: settings.timeFormat === '12h' ? '12h' : '24h',
  });
  const crosshairFormatter = (time) => formatChartDateTime(time, state);
  const axisFormatter = (time) => formatChartTime(time, state);

  return Object.freeze({
    options: Object.freeze({
      localization: Object.freeze({ timeFormatter: crosshairFormatter }),
      timeScale: Object.freeze({ tickMarkFormatter: axisFormatter }),
    }),
    state,
  });
}
