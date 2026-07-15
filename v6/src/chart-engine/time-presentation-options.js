import { formatChartDateTime, formatChartTime } from '../time-domain/time-presentation.js';
import { normalizeTimePresentationPreferences } from '../time-domain/time-presentation-preferences.js';

export function createTimePresentationChartOptions(settings = {}) {
  const state = normalizeTimePresentationPreferences(settings);
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
