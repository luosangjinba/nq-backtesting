import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { addAnnotation, getAnnotations, removeAnnotation } from './pda-store.js';
import { getBucketStart } from './pda-context.js';

const NDOG_TYPE = 'ndog';
const SESSION_END_HOUR = 17;

function objectiveId(type, bucketStart) {
  return `objective_${type}_${bucketStart}`;
}

function formatSessionDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function sameSession(bar, sessionStart) {
  return getBucketStart(bar.timestamp, 1440) === sessionStart;
}

function getBarsBeforeSession(allBars, sessionStart) {
  return allBars.filter((bar) => bar.timestamp < sessionStart);
}

function findSessionOpenBar(displayBars, sessionStart) {
  return displayBars.find((bar) => bar.timestamp === sessionStart) || null;
}

function findPreviousSessionCloseBar(allBars, sessionStart) {
  const before = getBarsBeforeSession(allBars, sessionStart);
  if (!before.length) return null;

  const previousSessionStart = getBucketStart(before[before.length - 1].timestamp, 1440);
  const previousSessionBars = before.filter((bar) => sameSession(bar, previousSessionStart));
  const regularCloseBars = previousSessionBars.filter((bar) => {
    const date = new Date(bar.timestamp * 1000);
    return date.getUTCHours() === SESSION_END_HOUR;
  });

  return regularCloseBars[regularCloseBars.length - 1] || previousSessionBars[previousSessionBars.length - 1] || null;
}

function buildNdogAnnotation(anchorBar) {
  if (!anchorBar) {
    return { error: '无法显示 NDOG：未找到点击位置的 K 线' };
  }

  const allBars = store.getBars();
  const displayBars = store.getDisplayBars();
  const sessionStart = getBucketStart(anchorBar.timestamp, 1440);
  const sessionDisplayBars = displayBars.filter((bar) => sameSession(bar, sessionStart));
  const openBar = findSessionOpenBar(displayBars, sessionStart);
  const previousCloseBar = findPreviousSessionCloseBar(allBars, sessionStart);

  if (!sessionDisplayBars.length || !openBar) {
    return { error: '无法显示 NDOG：当前显示范围缺少当日 18:00 open' };
  }

  if (!previousCloseBar) {
    return { error: '无法显示 NDOG：当前加载范围缺少前一日 close' };
  }

  const lastVisibleBar = sessionDisplayBars[sessionDisplayBars.length - 1];
  const topPrice = Math.max(previousCloseBar.close, openBar.open);
  const bottomPrice = Math.min(previousCloseBar.close, openBar.open);
  const sessionDate = formatSessionDate(sessionStart + 24 * 60 * 60);

  return {
    annotation: {
      id: objectiveId(NDOG_TYPE, sessionStart),
      type: NDOG_TYPE,
      source: 'objective',
      anchorTime: openBar.timestamp,
      canonicalTimestamp: sessionStart,
      timestamp: sessionStart,
      startTime: openBar.timestamp,
      endTime: lastVisibleBar.timestamp,
      startTimeTimestamp: openBar.timestamp,
      endTimeTimestamp: lastVisibleBar.timestamp,
      topPrice,
      bottomPrice,
      priceHigh: topPrice,
      priceLow: bottomPrice,
      contexts: [`${sessionDate} NDOG`],
      fillColor: '#42a5f526',
      borderColor: 'transparent',
      textColor: '#90caf9',
    },
  };
}

export function toggleTodayNdog(anchorBar) {
  const sessionStart = anchorBar ? getBucketStart(anchorBar.timestamp, 1440) : null;
  const id = sessionStart === null ? null : objectiveId(NDOG_TYPE, sessionStart);
  const existing = id ? getAnnotations().find((annotation) => annotation.id === id) : null;

  if (existing) {
    removeAnnotation(existing.id);
    bus.emit('status:update', { text: 'NDOG 已隐藏', isError: false });
    return;
  }

  const result = buildNdogAnnotation(anchorBar);
  if (result.error) {
    bus.emit('status:update', { text: result.error, isError: true });
    return;
  }

  addAnnotation(result.annotation);
  bus.emit('status:update', {
    text: `NDOG: ${result.annotation.bottomPrice.toFixed(2)}-${result.annotation.topPrice.toFixed(2)}`,
    isError: false,
  });
}
