import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { buildCePrice } from '../price-utils.js';
import { addAnnotation, getAnnotations, removeAnnotation } from './pda-store.js';
import { getBucketStart } from './pda-context.js';

const NDOG_TYPE = 'ndog';
const NWOG_TYPE = 'nwog';
const SESSION_END_HOUR = 17;
const WEEK_START_HOUR = 18;
const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

function objectiveId(type, bucketStart) {
  return `objective_${type}_${bucketStart}`;
}

function formatSessionDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function sameSession(bar, sessionStart) {
  return getBucketStart(bar.timestamp, 1440) === sessionStart;
}

function getWeekStart(timestamp) {
  const date = new Date(timestamp * 1000);
  const day = date.getUTCDay();
  const sunday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  sunday.setUTCDate(sunday.getUTCDate() - day);
  sunday.setUTCHours(WEEK_START_HOUR, 0, 0, 0);

  let weekStart = Math.floor(sunday.getTime() / 1000);
  if (timestamp < weekStart) {
    weekStart -= SECONDS_PER_WEEK;
  }

  return weekStart;
}

function sameWeek(bar, weekStart) {
  return bar.timestamp >= weekStart && bar.timestamp < weekStart + SECONDS_PER_WEEK;
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

function findWeekOpenBar(displayBars, weekStart) {
  return displayBars.find((bar) => bar.timestamp === weekStart) || null;
}

function findPreviousWeekCloseBar(allBars, weekStart) {
  const before = allBars.filter((bar) => bar.timestamp < weekStart);
  if (!before.length) return null;

  const fridayCloseBars = before.filter((bar) => {
    const date = new Date(bar.timestamp * 1000);
    return date.getUTCDay() === 5 && date.getUTCHours() === SESSION_END_HOUR;
  });

  return fridayCloseBars[fridayCloseBars.length - 1] || before[before.length - 1] || null;
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
      ce: buildCePrice(topPrice, bottomPrice),
      contexts: [`${sessionDate} NDOG`],
      fillColor: '#42a5f526',
      borderColor: 'transparent',
      textColor: '#90caf9',
    },
  };
}

function buildNwogAnnotation(anchorBar) {
  if (!anchorBar) {
    return { error: '无法显示 NWOG：未找到点击位置的 K 线' };
  }

  const allBars = store.getBars();
  const displayBars = store.getDisplayBars();
  const weekStart = getWeekStart(anchorBar.timestamp);
  const weekDisplayBars = displayBars.filter((bar) => sameWeek(bar, weekStart));
  const openBar = findWeekOpenBar(displayBars, weekStart);
  const previousCloseBar = findPreviousWeekCloseBar(allBars, weekStart);

  if (!weekDisplayBars.length || !openBar) {
    return { error: '无法显示 NWOG：当前显示范围缺少本周 Sunday 18:00 open' };
  }

  if (!previousCloseBar) {
    return { error: '无法显示 NWOG：当前加载范围缺少上周 close' };
  }

  const lastVisibleBar = weekDisplayBars[weekDisplayBars.length - 1];
  const topPrice = Math.max(previousCloseBar.close, openBar.open);
  const bottomPrice = Math.min(previousCloseBar.close, openBar.open);
  const weekLabel = formatSessionDate(weekStart);

  return {
    annotation: {
      id: objectiveId(NWOG_TYPE, weekStart),
      type: NWOG_TYPE,
      source: 'objective',
      anchorTime: openBar.timestamp,
      canonicalTimestamp: weekStart,
      timestamp: weekStart,
      startTime: openBar.timestamp,
      endTime: lastVisibleBar.timestamp,
      startTimeTimestamp: openBar.timestamp,
      endTimeTimestamp: lastVisibleBar.timestamp,
      topPrice,
      bottomPrice,
      priceHigh: topPrice,
      priceLow: bottomPrice,
      ce: buildCePrice(topPrice, bottomPrice),
      contexts: [`${weekLabel} NWOG`],
      fillColor: '#7e57c226',
      borderColor: 'transparent',
      textColor: '#b39ddb',
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

export function toggleThisWeekNwog(anchorBar) {
  const weekStart = anchorBar ? getWeekStart(anchorBar.timestamp) : null;
  const id = weekStart === null ? null : objectiveId(NWOG_TYPE, weekStart);
  const existing = id ? getAnnotations().find((annotation) => annotation.id === id) : null;

  if (existing) {
    removeAnnotation(existing.id);
    bus.emit('status:update', { text: 'NWOG 已隐藏', isError: false });
    return;
  }

  const result = buildNwogAnnotation(anchorBar);
  if (result.error) {
    bus.emit('status:update', { text: result.error, isError: true });
    return;
  }

  addAnnotation(result.annotation);
  bus.emit('status:update', {
    text: `NWOG: ${result.annotation.bottomPrice.toFixed(2)}-${result.annotation.topPrice.toFixed(2)}`,
    isError: false,
  });
}
