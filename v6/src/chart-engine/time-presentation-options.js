import { formatChartTime } from '../time-domain/time-presentation.js';

export function createTimePresentationChartOptions(settings = {}) {
  const state = Object.freeze({
    displayTimezone: ['utc', 'local'].includes(settings.displayTimezone)
      ? settings.displayTimezone
      : 'exchange',
    timeFormat: settings.timeFormat === '12h' ? '12h' : '24h',
  });
  const formatter = (time) => formatChartTime(time, state);

  return Object.freeze({
    options: Object.freeze({
      localization: Object.freeze({ timeFormatter: formatter }),
      timeScale: Object.freeze({ tickMarkFormatter: formatter }),
    }),
    state,
  });
}
