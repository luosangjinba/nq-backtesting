import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { TimeMarkerPrimitive } from './time-marker-primitive.js';
import { getTimeOverlaySettings } from './time-overlay-store.js';
import { DEFAULT_DAY_BOUNDARY_COLOR, isTimeOverlayTimeframe } from './time-overlay-types.js';

let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives) || [];
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getDateParts(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function formatDateKey(parts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function timestampFromDateAndTime(dateKey, timeText = '00:00') {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = timeText.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute, 0) / 1000);
}

function collectDateKeys(displayBars, selectedDate = '') {
  if (selectedDate) return [selectedDate];
  const keys = new Set();
  displayBars.forEach((bar) => {
    if (Number.isFinite(Number(bar.timestamp))) keys.add(formatDateKey(getDateParts(bar.timestamp)));
  });
  return Array.from(keys).sort();
}

function buildMarkers(displayBars, settings) {
  const dateKeys = collectDateKeys(displayBars, settings.selectedDate);
  const markers = [];

  dateKeys.forEach((dateKey) => {
    if (settings.showDayBoundary) {
      const dayTimestamp = timestampFromDateAndTime(dateKey, '00:00');
      if (dayTimestamp !== null) {
        markers.push({
          type: 'day-boundary',
          timestamp: dayTimestamp,
          color: settings.dayBoundaryColor || DEFAULT_DAY_BOUNDARY_COLOR,
          label: '',
        });
      }
    }

    settings.eventTimes
      .filter((eventTime) => eventTime.enabled !== false)
      .forEach((eventTime) => {
        const timestamp = timestampFromDateAndTime(dateKey, eventTime.time);
        if (timestamp === null) return;
        markers.push({
          type: 'event-time',
          timestamp,
          color: eventTime.color,
          label: eventTime.label,
          labelColor: eventTime.labelColor,
        });
      });
  });

  return markers;
}

export function renderTimeOverlays() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  const displayBars = store.getDisplayBars();
  const timeframe = store.getCurrentTimeframe();
  const settings = getTimeOverlaySettings();

  if (!chartInstance || !series || !displayBars.length) return;
  if (!settings.enabled || !isTimeOverlayTimeframe(timeframe)) return;

  const markers = buildMarkers(displayBars, settings);
  if (!markers.length) return;

  const primitive = new TimeMarkerPrimitive(chartInstance, displayBars, timeframe, markers);
  chart.attachPrimitive(primitive);
  primitive.requestUpdate?.();
  renderedPrimitives.push(primitive);
}

export function initTimeOverlayRenderer() {
  bus.on('bars:loaded', renderTimeOverlays);
  bus.on('time-overlays:changed', renderTimeOverlays);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
