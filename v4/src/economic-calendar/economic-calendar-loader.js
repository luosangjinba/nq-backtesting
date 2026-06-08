import * as bus from '../event-bus.js';
import { fetchEconomicEvents } from '../api.js';
import { dateKeyFromInput, dateKeyFromTimestamp } from '../utils.js';
import {
  clearEconomicEvents,
  setEconomicEvents,
} from './economic-calendar-store.js';

let requestSeq = 0;

function resolveLoadedDateRange(payload = {}) {
  const requestedRange = payload.requestedRange || {};
  const startFromRange = dateKeyFromTimestamp(requestedRange.startTs);
  const endFromRange = dateKeyFromTimestamp(requestedRange.endTs);
  const dateFrom = startFromRange || dateKeyFromInput(payload.start);
  const dateTo = endFromRange || dateKeyFromInput(payload.end);
  if (!dateFrom || !dateTo) return null;
  return { dateFrom, dateTo };
}

async function loadEconomicEventsForBars(payload = {}) {
  const range = resolveLoadedDateRange(payload);
  requestSeq += 1;
  const seq = requestSeq;
  if (!range) {
    clearEconomicEvents();
    return;
  }

  try {
    const response = await fetchEconomicEvents({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      impact: 'High,Medium,Low',
      includeHolidays: true,
    });
    if (seq !== requestSeq) return;
    setEconomicEvents(response.events || [], range);
  } catch (error) {
    if (seq !== requestSeq) return;
    clearEconomicEvents();
    bus.emit('status:update', {
      text: `Economic calendar load failed: ${error.message}`,
      isError: true,
    });
  }
}

export function initEconomicCalendarLoader() {
  bus.on('bars:loaded', loadEconomicEventsForBars);
  bus.on('bars:cleared', () => {
    requestSeq += 1;
    clearEconomicEvents();
  });
}
