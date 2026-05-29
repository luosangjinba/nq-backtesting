import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { KillzoneBandPrimitive } from './killzone-band-primitive.js';
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

  });

  settings.eventTimes
    .filter((eventTime) => eventTime.enabled !== false && eventTime.date)
    .filter((eventTime) => !settings.selectedDate || eventTime.date === settings.selectedDate)
    .forEach((eventTime) => {
      const timestamp = timestampFromDateAndTime(eventTime.date, eventTime.time);
      if (timestamp === null) return;
      markers.push({
        type: 'event-time',
        timestamp,
        color: eventTime.color,
        label: eventTime.label,
        labelColor: eventTime.labelColor,
      });
    });

  return markers;
}

function rangesOverlap(a, b) {
  return a.startTimestamp < b.endTimestamp && b.startTimestamp < a.endTimestamp;
}

function assignKillzoneLayers(bands) {
  const layers = [];
  return [...bands]
    .sort((a, b) => a.startTimestamp - b.startTimestamp || a.endTimestamp - b.endTimestamp)
    .map((band) => {
      const layer = layers.findIndex((layerBands) => !layerBands.some((candidate) => rangesOverlap(candidate, band)));
      const targetLayer = layer === -1 ? layers.length : layer;
      if (!layers[targetLayer]) layers[targetLayer] = [];
      const layeredBand = { ...band, layer: targetLayer };
      layers[targetLayer].push(layeredBand);
      return layeredBand;
    });
}

function buildKillzoneBands(settings) {
  const bands = (settings.killzones || [])
    .filter((killzone) => killzone.enabled !== false && killzone.date)
    .filter((killzone) => !settings.selectedDate || killzone.date === settings.selectedDate)
    .map((killzone) => {
      const startTimestamp = timestampFromDateAndTime(killzone.date, killzone.startTime);
      const endTimestamp = timestampFromDateAndTime(killzone.date, killzone.endTime);
      if (startTimestamp === null || endTimestamp === null || startTimestamp === endTimestamp) return null;
      return {
        id: killzone.id,
        type: 'killzone',
        startTimestamp: Math.min(startTimestamp, endTimestamp),
        endTimestamp: Math.max(startTimestamp, endTimestamp),
        label: killzone.label || 'Killzone',
        fillColor: killzone.fillColor,
        lineColor: killzone.lineColor,
      };
    })
    .filter(Boolean);

  return assignKillzoneLayers(bands);
}

function buildKillzoneDraftMarker(settings) {
  const draft = settings.killzoneDraft;
  if (!draft?.date || !draft.startTime) return null;
  if (settings.selectedDate && draft.date !== settings.selectedDate) return null;
  const timestamp = timestampFromDateAndTime(draft.date, draft.startTime);
  if (timestamp === null) return null;
  return {
    id: 'killzone-draft',
    type: 'killzone-draft',
    startTimestamp: timestamp,
    endTimestamp: timestamp,
    label: 'Killzone start',
    fillColor: 'rgba(255, 224, 130, 0.34)',
    lineColor: 'rgba(255, 224, 130, 0.72)',
    draft: true,
    layer: 0,
  };
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
  const killzoneDraftMarker = buildKillzoneDraftMarker(settings);
  const killzoneBands = [...buildKillzoneBands(settings), ...(killzoneDraftMarker ? [killzoneDraftMarker] : [])];
  if (!markers.length && !killzoneBands.length) return;

  if (markers.length) {
    const markerPrimitive = new TimeMarkerPrimitive(chartInstance, displayBars, timeframe, markers);
    chart.attachPrimitive(markerPrimitive);
    markerPrimitive.requestUpdate?.();
    renderedPrimitives.push(markerPrimitive);
  }

  if (killzoneBands.length) {
    const killzonePrimitive = new KillzoneBandPrimitive(chartInstance, displayBars, timeframe, killzoneBands);
    chart.attachPrimitive(killzonePrimitive);
    killzonePrimitive.requestUpdate?.();
    renderedPrimitives.push(killzonePrimitive);
  }
}

export function initTimeOverlayRenderer() {
  bus.on('bars:loaded', renderTimeOverlays);
  bus.on('time-overlays:changed', renderTimeOverlays);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
