// Manual PDA annotation entry points. The first pass supports BSL/SSL via chart context menu.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as secondaryChart from '../chart/secondary-chart-manager.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { timeframeToString } from '../config.js';
import { buildCePrice } from '../price-utils.js';
import { addAnnotation, clearAnnotations, getAnnotationById } from './pda-store.js';
import { buildPointContexts, formatContextLabel, getPointCanonicalTimestamp } from './pda-context.js';
import { clearPdaContextDataCache, fetchTradingDaySourceBars } from './pda-context-data.js';
import { identifyFvg } from './fvg-identifier.js';
import { validateManualSwing } from './pda-swing-validator.js';
import { getPdaType } from './pda-types.js';
import { hitTestPdaAnnotations } from './pda-hit-test.js';
import { toggleThisWeekNwog, toggleTodayNdog } from './objective-gaps.js';
import {
  cancelSegmentSelection,
  clearManualSegments,
  finishSegment,
  getSegmentSelectionSummary,
  startSegment,
} from '../segment/manual-segment.js';
import { getSelectedSegment } from '../segment/segment-selection.js';
import { hitTestSegmentGroups, hitTestSegments } from '../segment/segment-hit-test.js';
import { clearAllPdaResponses, getSegmentById, linkPdaResponse } from '../segment/segment-store.js';
import {
  addSegmentToDraftGroup,
  clearDraftSegmentGroup,
  createCompositeMove,
  removeSegmentFromDraftGroup,
  setDraftSegmentGroupTarget,
} from '../segment/segment-group-store.js';
import {
  appendPointToPointSet,
  addPointSetPoint,
  cancelPointSet,
  clearPointSetSelection,
  finishPointSet,
  getPointSetSelectionSummary,
  startPointSet,
} from './point-set-annotation.js';
import { getSelectedPda } from './pda-selection.js';
import { startFvgSmt, startLiquiditySmt } from '../smt/manual-smt.js';
import {
  handleOrderSetupChartAction,
  renderOrderSetupMenuItems,
} from '../order/order-setup-chart-actions.js';
import { recordHistory } from '../history/history-manager.js';
import {
  addKillzone,
  addEventTime,
  clearEventTimes,
  clearKillzones,
  clearKillzoneDraft,
  deleteEventTime,
  deleteKillzone,
  getTimeOverlaySettings,
  normalizeEventTimeValue,
  setKillzoneDraft,
  updateKillzone,
} from '../time-overlays/time-overlay-store.js';
import {
  clampMenuPosition,
  getPdaLabel,
  getSegmentLabel,
  renderManualContextMenu,
  renderSegmentGroupItems,
  renderSegmentPdaLinkItems,
} from './manual-context-menu.js';

let controlsEl = null;
let contextMenuBar = null;
let contextMenuPrice = null;
let contextMenuPdaHit = null;
let contextMenuSegmentHit = null;
let contextMenuSegmentGroupHit = null;
let rangeSelectionState = null;
let fibSelectionState = null;

const DEFAULT_FIB_LEVELS = [
  { value: 1, visible: true, color: '#60636f' },
  { value: 0.79, visible: true, color: '#00a6b4' },
  { value: 0.705, visible: true, color: '#ffa726' },
  { value: 0.62, visible: true, color: '#4caf50' },
  { value: 0.5, visible: true, color: '#ff4d5d' },
  { value: 0.236, visible: true, color: '#ab47bc' },
  { value: 0, visible: true, color: '#60636f' },
];

function normalizeTimeKey(time) {
  if (time && typeof time === 'object') {
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${time.year}-${month}-${day}`;
  }
  return time;
}

function getBarChartTime(bar) {
  return store.getCurrentTimeframe() === 1440 ? bar.tradingDay : bar.timestamp;
}

function getBarEventTime(bar) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return '';
  const date = new Date(Number(bar.timestamp) * 1000);
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function getBarEventDate(bar) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return '';
  const date = new Date(Number(bar.timestamp) * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEventTimeLabel(time) {
  return normalizeEventTimeValue(time, '').replace(':', '').replace(/^0/, '');
}

function getContextEventTime() {
  return normalizeEventTimeValue(getBarEventTime(contextMenuBar), '');
}

function getContextEventDate() {
  return getBarEventDate(contextMenuBar);
}

function getEventTimeAtContextBar() {
  const time = getContextEventTime();
  const date = getContextEventDate();
  if (!time || !date) return null;
  return (
    getTimeOverlaySettings().eventTimes.find(
      (eventTime) => eventTime.date === date && eventTime.time === time
    ) || null
  );
}

function getKillzoneAtContextBar() {
  const time = getContextEventTime();
  const date = getContextEventDate();
  if (!time || !date) return null;
  return (
    (getTimeOverlaySettings().killzones || []).find((killzone) => {
      if (killzone.date !== date || killzone.enabled === false) return false;
      const start = killzone.startTime <= killzone.endTime ? killzone.startTime : killzone.endTime;
      const end = killzone.startTime <= killzone.endTime ? killzone.endTime : killzone.startTime;
      return time >= start && time <= end;
    }) || null
  );
}

function promptKillzoneLabel(defaultLabel = 'Killzone') {
  const value = window.prompt('Killzone name', defaultLabel);
  if (value === null) return null;
  return value.trim() || defaultLabel;
}

function findDisplayBar(time) {
  if (time === undefined || time === null) return null;
  const target = normalizeTimeKey(time);
  return (
    store
      .getDisplayBars()
      .find((bar) => normalizeTimeKey(getBarChartTime(bar)) === target) || null
  );
}

async function addManualPoint(type, bar) {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return;

  const timeframe = store.getCurrentTimeframe();
  let contextBars = store.getDisplayBars();
  try {
    contextBars = await fetchTradingDaySourceBars(bar.timestamp);
  } catch (err) {
    bus.emit('status:update', {
      text: `PDA 1M context source 加载失败，暂用当前显示区间: ${err.message}`,
      isError: true,
    });
  }

  const contexts = buildPointContexts(type, bar, timeframe, contextBars);
  const price = bar[pdaType.priceField];
  const canonicalTimestamp = getPointCanonicalTimestamp(type, bar, timeframe, contextBars);
  const validation = validateManualSwing(type, bar, timeframe, store.getDisplayBars());
  const annotation = {
    id: `manual_${type}_${canonicalTimestamp}_${Date.now()}`,
    type,
    source: 'manual',
    anchorTime: getBarChartTime(bar),
    canonicalTimestamp,
    timestamp: bar.timestamp,
    barTime: bar.time,
    price,
    contexts,
    validation,
  };

  await recordHistory(`Mark ${pdaType.label}`, () => addAnnotation(annotation));
  hideContextMenu();

  const contextLabel = formatContextLabel(contexts);
  const validationPrefix =
    validation.checked && !validation.valid ? `Warning: ${validation.message}; marked anyway. ` : '';
  bus.emit('status:update', {
    text: `${validationPrefix}${pdaType.label}: ${price.toFixed(2)} ${bar.tradingDay || bar.time}${
      contextLabel ? ` · ${contextLabel}` : ''
    }`,
    isError: validation.checked && !validation.valid,
  });
}

function getFvgColors(direction) {
  return direction === 'bullish'
    ? { fillColor: '#26a69a33', borderColor: 'transparent', midlineColor: '#26a69a', textColor: '#b2dfdb' }
    : { fillColor: '#ef535033', borderColor: 'transparent', midlineColor: '#ef5350', textColor: '#ffcdd2' };
}

function getIfvgColors() {
  return {
    fillColor: '#fdd83533',
    borderColor: 'transparent',
    midlineColor: '#fdd835',
    textColor: '#fff9c4',
  };
}

function invertDirection(direction) {
  if (direction === 'bullish') return 'bearish';
  if (direction === 'bearish') return 'bullish';
  return direction;
}

function addManualFvg(bar, type = 'fvg') {
  const pdaType = getPdaType(type);
  if (!pdaType || !bar) return;

  const result = identifyFvg(store.getDisplayBars(), bar);
  if (!result) {
    hideContextMenu();
    bus.emit('status:update', { text: `未识别到 ${pdaType.label} 结构`, isError: true });
    return;
  }

  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const direction = type === 'ifvg' ? invertDirection(result.direction) : result.direction;
  const contexts = [`${tfLabel} ${pdaType.label}`];
  const colors = type === 'ifvg' ? getIfvgColors() : getFvgColors(direction);
  const annotation = {
    id: `manual_${type}_${result.anchorBar.timestamp}_${Date.now()}`,
    type,
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(result.anchorBar),
    canonicalTimestamp: result.anchorBar.timestamp,
    timestamp: result.anchorBar.timestamp,
    barTime: result.anchorBar.time,
    startTime: getBarChartTime(result.startBar),
    endTime: getBarChartTime(result.endBar),
    topPrice: result.topPrice,
    bottomPrice: result.bottomPrice,
    ce: buildCePrice(result.topPrice, result.bottomPrice),
    contexts,
    ...colors,
  };

  recordHistory(`Mark ${pdaType.label}`, () => addAnnotation(annotation));
  hideContextMenu();

  bus.emit('status:update', {
    text: `${pdaType.label}: ${direction} ${result.bottomPrice.toFixed(2)}-${result.topPrice.toFixed(2)} ${result.anchorBar.tradingDay || result.anchorBar.time}`,
    isError: false,
  });
}

function getWickCe(bar, side) {
  if (!bar) return null;
  const open = Number(bar.open);
  const close = Number(bar.close);
  const high = Number(bar.high);
  const low = Number(bar.low);
  if (![open, close, high, low].every(Number.isFinite)) return null;

  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);

  if (side === 'upper') {
    const wickPoints = high - bodyHigh;
    if (wickPoints <= 0) return null;
    return {
      price: (high + bodyHigh) / 2,
      wickSide: 'upper',
      wickPoints,
      bodyHigh,
      bodyLow,
      high,
      low,
    };
  }

  const wickPoints = bodyLow - low;
  if (wickPoints <= 0) return null;
  return {
    price: (low + bodyLow) / 2,
    wickSide: 'lower',
    wickPoints,
    bodyHigh,
    bodyLow,
    high,
    low,
  };
}

function addManualWickCe(side, bar) {
  const pdaType = getPdaType('wick-ce');
  if (!pdaType || !bar) return;

  const wickCe = getWickCe(bar, side);
  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const sideLabel = side === 'upper' ? 'Upper' : 'Lower';
  if (!wickCe) {
    hideContextMenu();
    bus.emit('status:update', { text: `${tfLabel} ${sideLabel} Wick CE 无有效影线`, isError: true });
    return;
  }

  const annotation = {
    id: `manual_wick_ce_${side}_${store.getCurrentTimeframe()}_${bar.timestamp}_${Date.now()}`,
    type: 'wick-ce',
    source: 'manual',
    timeframe: tfLabel,
    wickSide: wickCe.wickSide,
    anchorTime: getBarChartTime(bar),
    canonicalTimestamp: bar.timestamp,
    timestamp: bar.timestamp,
    barTime: bar.time,
    price: wickCe.price,
    wickPoints: wickCe.wickPoints,
    bodyHigh: wickCe.bodyHigh,
    bodyLow: wickCe.bodyLow,
    high: wickCe.high,
    low: wickCe.low,
    contexts: [`${tfLabel} ${sideLabel} Wick CE`],
  };

  recordHistory(`Mark ${sideLabel} Wick CE`, () => addAnnotation(annotation));
  hideContextMenu();

  bus.emit('status:update', {
    text: `${tfLabel} ${sideLabel} Wick CE: ${wickCe.price.toFixed(2)} ${bar.tradingDay || bar.time}`,
    isError: false,
  });
}

function getManualRangeColors(type, direction) {
  if (type === 'breaker') {
    return direction === 'bullish'
      ? { fillColor: '#00acc124', borderColor: 'transparent', textColor: '#ffab91' }
      : { fillColor: '#ff704324', borderColor: 'transparent', textColor: '#ffab91' };
  }

  return direction === 'bullish'
    ? { fillColor: '#26a69a24', borderColor: 'transparent', textColor: '#ffcc80' }
    : { fillColor: '#ef535024', borderColor: 'transparent', textColor: '#ffcc80' };
}

function getDisplayBarIndex(bar) {
  if (!bar) return -1;
  return store.getDisplayBars().findIndex((candidate) => candidate.timestamp === bar.timestamp);
}

function getSelectedRangeBars(startBar, endBar) {
  const displayBars = store.getDisplayBars();
  const startIndex = getDisplayBarIndex(startBar);
  const endIndex = getDisplayBarIndex(endBar);

  if (startIndex < 0 || endIndex < 0) return [];

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return displayBars.slice(from, to + 1);
}

function startManualRange(type, direction, bar) {
  if (!bar) return;
  const pdaType = getPdaType(type);
  if (!pdaType) return;

  fibSelectionState = null;
  rangeSelectionState = {
    type,
    direction,
    startBar: bar,
  };

  hideContextMenu();
  bus.emit('status:update', {
    text: `${direction} ${pdaType.label} 起点已选择，Shift + 右键选择终点`,
    isError: false,
  });
}

function addManualRange(endBar) {
  if (!rangeSelectionState || !endBar) return;

  const rangeBars = getSelectedRangeBars(rangeSelectionState.startBar, endBar);
  const pdaType = getPdaType(rangeSelectionState.type);
  if (!rangeBars.length) {
    rangeSelectionState = null;
    hideContextMenu();
    bus.emit('status:update', { text: `${pdaType?.label || 'Range PDA'} 区间选择失败：未找到 K 线`, isError: true });
    return;
  }

  const timeframe = store.getCurrentTimeframe();
  const tfLabel = timeframeToString(timeframe);
  const type = rangeSelectionState.type;
  const direction = rangeSelectionState.direction;
  const startBar = rangeBars[0];
  const lastBar = rangeBars[rangeBars.length - 1];
  const topPrice = Math.max(...rangeBars.map((bar) => bar.high));
  const bottomPrice = Math.min(...rangeBars.map((bar) => bar.low));
  const contexts = [`${tfLabel} ${direction} ${pdaType?.label || type}`];
  const annotation = {
    id: `manual_${type}_${startBar.timestamp}_${lastBar.timestamp}_${Date.now()}`,
    type,
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(startBar),
    canonicalTimestamp: startBar.timestamp,
    timestamp: startBar.timestamp,
    barTime: startBar.time,
    startTime: getBarChartTime(startBar),
    endTime: getBarChartTime(lastBar),
    startTimeTimestamp: startBar.timestamp,
    endTimeTimestamp: lastBar.timestamp,
    topPrice,
    bottomPrice,
    priceHigh: topPrice,
    priceLow: bottomPrice,
    ce: buildCePrice(topPrice, bottomPrice),
    contexts,
    ...getManualRangeColors(type, direction),
  };

  recordHistory(`Mark ${pdaType?.label || type}`, () => addAnnotation(annotation));
  rangeSelectionState = null;
  hideContextMenu();

  bus.emit('status:update', {
    text: `${pdaType?.label || type}: ${direction} ${bottomPrice.toFixed(2)}-${topPrice.toFixed(2)} (${rangeBars.length}根${tfLabel})`,
    isError: false,
  });
}

function startManualFib(bar) {
  if (!bar) return;

  rangeSelectionState = null;
  fibSelectionState = { startBar: bar };
  hideContextMenu();
  bus.emit('status:update', {
    text: 'Fib 起点已选择，Shift + 右键选择终点',
    isError: false,
  });
}

function addManualFib(endBar) {
  if (!fibSelectionState || !endBar) return;

  const startBar = fibSelectionState.startBar;
  const bullishMove = Math.abs(Number(endBar.high) - Number(startBar.low));
  const bearishMove = Math.abs(Number(startBar.high) - Number(endBar.low));
  const direction = bullishMove >= bearishMove ? 'bullish' : 'bearish';
  const startPrice = direction === 'bullish' ? Number(startBar.low) : Number(startBar.high);
  const endPrice = direction === 'bullish' ? Number(endBar.high) : Number(endBar.low);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice) || startBar.timestamp === endBar.timestamp) {
    fibSelectionState = null;
    hideContextMenu();
    bus.emit('status:update', { text: 'Fib 选择失败：起点/终点无效', isError: true });
    return;
  }

  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const annotation = {
    id: `manual_fib_${startBar.timestamp}_${endBar.timestamp}_${Date.now()}`,
    type: 'fib',
    source: 'manual',
    direction,
    anchorTime: getBarChartTime(startBar),
    canonicalTimestamp: startBar.timestamp,
    timestamp: startBar.timestamp,
    barTime: startBar.time,
    startTime: getBarChartTime(startBar),
    endTime: getBarChartTime(endBar),
    startTimeTimestamp: startBar.timestamp,
    endTimeTimestamp: endBar.timestamp,
    start: {
      time: getBarChartTime(startBar),
      timestamp: startBar.timestamp,
      price: startPrice,
      kind: direction === 'bullish' ? 'low' : 'high',
    },
    end: {
      time: getBarChartTime(endBar),
      timestamp: endBar.timestamp,
      price: endPrice,
      kind: direction === 'bullish' ? 'high' : 'low',
    },
    levels: DEFAULT_FIB_LEVELS.map((level) => ({ ...level })),
    display: {
      showLabels: true,
      showTrendLine: false,
      extend: 'none',
    },
    contexts: [`${tfLabel} ${direction} Fib`],
  };

  recordHistory('Mark Fib', () => addAnnotation(annotation));
  fibSelectionState = null;
  hideContextMenu();

  bus.emit('status:update', {
    text: `Fib: ${direction} ${startPrice.toFixed(2)} → ${endPrice.toFixed(2)}`,
    isError: false,
  });
}

function locateSecondaryAtBar(bar) {
  if (!bar) return;
  if (!secondaryStore.isSecondaryEnabled() || !secondaryStore.getSecondaryDisplayBars().length) {
    bus.emit('status:update', { text: '副图未开启或没有已加载 K 线', isError: true });
    return;
  }

  const secondaryBar = secondaryChart.locateSecondaryTimestamp(
    bar.timestamp,
    secondaryStore.getSecondaryDisplayBars()
  );
  if (!secondaryBar) {
    bus.emit('status:update', { text: '副图定位失败：未找到对应时间', isError: true });
    return;
  }
  secondaryChart.showSecondaryHoverCursor(
    secondaryStore.getSecondaryTimeframe() === 1440 ? secondaryBar.tradingDay : secondaryBar.timestamp
  );
  bus.emit('status:update', { text: `副图已定位到 ${bar.tradingDay || bar.time}`, isError: false });
}

function renderTimeOverlayMenuItems(bar) {
  const time = normalizeEventTimeValue(getBarEventTime(bar), '');
  const date = getBarEventDate(bar);
  const settings = getTimeOverlaySettings();
  const existingEventTime = time
    ? settings.eventTimes.find(
        (eventTime) => eventTime.date === date && eventTime.time === time
      )
    : null;
  const disabled = time && date ? '' : 'disabled';
  const removeDisabled = existingEventTime ? '' : 'disabled';
  const clearDisabled = settings.eventTimes.length ? '' : 'disabled';
  const label = time ? getEventTimeLabel(time) : '';
  const hitKillzone = getKillzoneAtContextBar();
  const killzoneDraft = settings.killzoneDraft;
  const endDisabled = killzoneDraft && date === killzoneDraft.date && time ? '' : 'disabled';
  const editKillzoneDisabled = hitKillzone ? '' : 'disabled';
  const draftLabel = killzoneDraft ? ` · ${killzoneDraft.date} ${getEventTimeLabel(killzoneDraft.startTime)}` : '';
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Time Overlays</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" data-pda-action="time-overlay-add-event" ${disabled}>Add ${label || 'Time'} Line Here</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-delete-event" ${removeDisabled}>Delete ${label || 'Time'} Line</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-clear-events" ${clearDisabled}>Clear Time Lines</button>
      <div class="pda-menu-divider"></div>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-start" ${disabled}>Start Killzone Here</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-end" ${endDisabled}>End Killzone Here${draftLabel}</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-rename" ${editKillzoneDisabled}>Rename Killzone Here</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-delete" ${editKillzoneDisabled}>Delete Killzone Here</button>
      </div>
    </div>
  `;
}

function renderClearMenuItems() {
  const settings = getTimeOverlaySettings();
  const clearKillzonesDisabled = settings.killzones?.length ? '' : 'disabled';
  return `
    <button class="pda-menu-item" data-pda-action="clear">Clear PDA</button>
    <button class="pda-menu-item" data-pda-action="segment-clear">Clear 1H Segments</button>
    <button class="pda-menu-item" data-pda-action="time-overlay-killzone-clear" ${clearKillzonesDisabled}>Clear Killzones</button>
  `;
}

function showContextMenu(x, y, bar, pdaHit = null, segmentHit = null, segmentGroupHit = null) {
  if (!controlsEl) return;
  contextMenuBar = bar;
  contextMenuPdaHit = pdaHit;
  contextMenuSegmentHit = segmentHit;
  contextMenuSegmentGroupHit = segmentGroupHit;
  const { x: left, y: top, maxHeight, submenuDirection } = clampMenuPosition(controlsEl, x, y);
  const disabled = bar ? '' : 'disabled';
  const timeLabel = bar ? bar.tradingDay || bar.time : 'No bar';
  const activeSet = getPointSetSelectionSummary();
  const activeSegment = getSegmentSelectionSummary();
  const selected = getSelectedPda();
  const selectedAnnotation = selected ? getAnnotationById(selected.id) : null;
  const selectedPdaType = selectedAnnotation ? getPdaType(selectedAnnotation.type) : null;
  const segmentPdaLinkItems = renderSegmentPdaLinkItems(pdaHit);
  const segmentGroupItems = renderSegmentGroupItems(segmentHit);
  const selectedSetItem =
    !activeSet && selectedPdaType?.pointSet
      ? `<button class="pda-menu-item" data-pda-action="selected-pointset-add" ${disabled}>Add to Selected ${selectedPdaType.label}</button>`
      : '';
  const pointSetItems = activeSet
    ? `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${activeSet.label} set · ${activeSet.count} point${activeSet.count === 1 ? '' : 's'}</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="pointset-add" ${disabled}>Add ${activeSet.label} Point</button>
        <button class="pda-menu-item" data-pda-action="pointset-finish">Finish ${activeSet.label}</button>
        <button class="pda-menu-item" data-pda-action="pointset-cancel">Cancel Set</button>
        </div>
      </div>
    `
    : `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Point Sets</div>
        <div class="pda-submenu-panel">
        ${selectedSetItem}
        <button class="pda-menu-item" data-pda-action="eqh-start" ${disabled}>Start EQH Set</button>
        <button class="pda-menu-item" data-pda-action="eql-start" ${disabled}>Start EQL Set</button>
        </div>
      </div>
    `;
  const segmentItems = activeSegment
    ? `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${activeSegment.label}</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="segment-finish-high" ${disabled}>End 1H Segment at High</button>
        <button class="pda-menu-item" data-pda-action="segment-finish-low" ${disabled}>End 1H Segment at Low</button>
        <button class="pda-menu-item" data-pda-action="segment-cancel">Cancel 1H Segment</button>
        </div>
      </div>
    `
    : `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">1H Segments</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="segment-start-low" ${disabled}>Start 1H Segment from Low</button>
        <button class="pda-menu-item" data-pda-action="segment-start-high" ${disabled}>Start 1H Segment from High</button>
        </div>
      </div>
    `;

  controlsEl.innerHTML = renderManualContextMenu({
    left,
    top,
    maxHeight,
    submenuDirection,
    timeLabel,
    disabled,
    orderSetupItems: renderOrderSetupMenuItems({ bar, pdaHit, segmentHit, segmentGroupHit }),
    segmentPdaLinkItems,
    segmentGroupItems,
    segmentItems,
    pointSetItems,
    timeOverlayItems: renderTimeOverlayMenuItems(bar),
    clearItems: renderClearMenuItems(),
  });
}

function hideContextMenu() {
  contextMenuBar = null;
  contextMenuPrice = null;
  contextMenuPdaHit = null;
  contextMenuSegmentHit = null;
  contextMenuSegmentGroupHit = null;
  if (controlsEl) {
    controlsEl.innerHTML = '';
  }
}

function handleContextMenu(e) {
  if (e.target.closest('#viewport-controls') || e.target.closest('.pda-menu')) return;

  e.preventDefault();
  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const time = chart.coordinateToTime(x);
  const bar = findDisplayBar(time);
  const price = chart.coordinateToPrice(y);
  contextMenuPrice = price;
  const pdaHit = hitTestPdaAnnotations({ x, y, time, price });
  const segmentHit = hitTestSegments({ x, y });
  const segmentGroupHit = hitTestSegmentGroups({ x, y });

  if (e.shiftKey && fibSelectionState) {
    addManualFib(bar);
    return;
  }

  if (e.shiftKey && rangeSelectionState) {
    addManualRange(bar);
    return;
  }

  showContextMenu(x, y, bar, pdaHit, segmentHit, segmentGroupHit);
}

async function handleControlClick(e) {
  const action = e.target.closest('[data-pda-action]')?.dataset.pdaAction;
  if (!action) return;
  e.stopPropagation();

  if (action === 'bsl' || action === 'ssl') {
    await addManualPoint(action, contextMenuBar);
  } else if (handleOrderSetupChartAction(action, {
    bar: contextMenuBar,
    price: contextMenuPrice,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    pdaHit: contextMenuPdaHit,
    segmentHit: contextMenuSegmentHit,
    segmentGroupHit: contextMenuSegmentGroupHit,
  })) {
    hideContextMenu();
  } else if (action === 'wick-ce-upper' || action === 'wick-ce-lower') {
    addManualWickCe(action === 'wick-ce-upper' ? 'upper' : 'lower', contextMenuBar);
  } else if (action === 'fvg') {
    addManualFvg(contextMenuBar);
  } else if (action === 'ifvg') {
    addManualFvg(contextMenuBar, 'ifvg');
  } else if (action === 'secondary-locate-time') {
    locateSecondaryAtBar(contextMenuBar);
    hideContextMenu();
  } else if (action === 'ob-bullish' || action === 'ob-bearish') {
    startManualRange('ob', action === 'ob-bullish' ? 'bullish' : 'bearish', contextMenuBar);
  } else if (action === 'breaker-bullish' || action === 'breaker-bearish') {
    startManualRange('breaker', action === 'breaker-bullish' ? 'bullish' : 'bearish', contextMenuBar);
  } else if (action === 'fib-start') {
    startManualFib(contextMenuBar);
  } else if (action === 'smt-liquidity-bearish' || action === 'smt-liquidity-bullish') {
    startLiquiditySmt(action === 'smt-liquidity-bullish' ? 'bullish' : 'bearish', contextMenuBar);
    hideContextMenu();
  } else if (action === 'smt-fvg-bearish' || action === 'smt-fvg-bullish') {
    startFvgSmt(action === 'smt-fvg-bullish' ? 'bullish' : 'bearish');
    hideContextMenu();
  } else if (action === 'time-overlay-add-event') {
    const time = getContextEventTime();
    const date = getContextEventDate();
    if (!time || !date) {
      bus.emit('status:update', { text: '无法添加时间线：没有可用 K 线时间', isError: true });
    } else if (getEventTimeAtContextBar()) {
      bus.emit('status:update', { text: `${date} ${getEventTimeLabel(time)} 时间线已存在`, isError: false });
    } else {
      recordHistory('Add Time Line', () => addEventTime({ date, time, label: getEventTimeLabel(time) }));
      bus.emit('status:update', { text: `已添加 ${date} ${getEventTimeLabel(time)} 时间线`, isError: false });
    }
    hideContextMenu();
  } else if (action === 'time-overlay-delete-event') {
    const eventTime = getEventTimeAtContextBar();
    if (!eventTime) {
      bus.emit('status:update', { text: '当前时间没有可删除的时间线', isError: true });
    } else {
      recordHistory('Delete Time Line', () => deleteEventTime(eventTime.id));
      bus.emit('status:update', {
        text: `已删除 ${eventTime.date} ${eventTime.label || getEventTimeLabel(eventTime.time)} 时间线`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'time-overlay-clear-events') {
    const cleared = await recordHistory('Clear Time Lines', () => clearEventTimes());
    bus.emit('status:update', {
      text: cleared ? '已清除所有时间线' : '没有可清除的时间线',
      isError: false,
    });
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-start') {
    const time = getContextEventTime();
    const date = getContextEventDate();
    if (!time || !date) {
      bus.emit('status:update', { text: '无法设置 Killzone：没有可用 K 线时间', isError: true });
    } else {
      recordHistory('Start Killzone', () => setKillzoneDraft({ date, startTime: time }));
      bus.emit('status:update', {
        text: `Killzone 起点: ${date} ${getEventTimeLabel(time)}`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-end') {
    const time = getContextEventTime();
    const date = getContextEventDate();
    const killzoneDraft = getTimeOverlaySettings().killzoneDraft;
    if (!time || !date || !killzoneDraft || killzoneDraft.date !== date) {
      bus.emit('status:update', { text: '无法完成 Killzone：请先在同一天设置起点', isError: true });
    } else if (time === killzoneDraft.startTime) {
      bus.emit('status:update', { text: 'Killzone 起点和终点不能相同', isError: true });
    } else {
      const label = promptKillzoneLabel('Killzone');
      if (label !== null) {
        const killzone = await recordHistory('Create Killzone', () => {
          const nextKillzone = addKillzone({
            date,
            label,
            startTime: killzoneDraft.startTime,
            endTime: time,
          });
          clearKillzoneDraft();
          return nextKillzone;
        });
        bus.emit('status:update', {
          text: killzone
            ? `已创建 Killzone: ${killzone.label} ${date} ${getEventTimeLabel(killzone.startTime)}-${getEventTimeLabel(killzone.endTime)}`
            : 'Killzone 创建失败',
          isError: !killzone,
        });
      }
    }
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-rename') {
    const killzone = getKillzoneAtContextBar();
    if (!killzone) {
      bus.emit('status:update', { text: '当前位置没有 Killzone', isError: true });
    } else {
      const label = promptKillzoneLabel(killzone.label || 'Killzone');
      if (label !== null) {
        recordHistory('Rename Killzone', () => updateKillzone(killzone.id, { label }));
        bus.emit('status:update', { text: `Killzone 已重命名为 ${label}`, isError: false });
      }
    }
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-delete') {
    const killzone = getKillzoneAtContextBar();
    const deleted = killzone ? await recordHistory('Delete Killzone', () => deleteKillzone(killzone.id)) : false;
    bus.emit('status:update', {
      text: deleted ? `已删除 Killzone: ${killzone.label}` : '当前位置没有可删除的 Killzone',
      isError: !deleted,
    });
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-clear') {
    const cleared = await recordHistory('Clear Killzones', () => clearKillzones());
    bus.emit('status:update', {
      text: cleared ? 'Killzones 已清除' : '没有可清除的 Killzone',
      isError: false,
    });
    hideContextMenu();
  } else if (action === 'eqh-start' || action === 'eql-start') {
    recordHistory(`Start ${action === 'eqh-start' ? 'EQH' : 'EQL'} Set`, () =>
      startPointSet(action === 'eqh-start' ? 'eqh' : 'eql', contextMenuBar, getBarChartTime)
    );
    hideContextMenu();
  } else if (action === 'pointset-add') {
    recordHistory('Add Point Set Point', () => addPointSetPoint(contextMenuBar, getBarChartTime));
    hideContextMenu();
  } else if (action === 'pointset-finish') {
    recordHistory('Finish Point Set', () => finishPointSet());
    hideContextMenu();
  } else if (action === 'pointset-cancel') {
    recordHistory('Cancel Point Set', () => cancelPointSet());
    hideContextMenu();
  } else if (action === 'selected-pointset-add') {
    const selected = getSelectedPda();
    if (selected) recordHistory('Add Point To Selected Set', () => appendPointToPointSet(selected.id, contextMenuBar, getBarChartTime));
    hideContextMenu();
  } else if (action === 'segment-start-low' || action === 'segment-start-high') {
    recordHistory('Start 1H Segment', () =>
      startSegment(contextMenuBar, action === 'segment-start-high' ? 'swing-high' : 'swing-low')
    );
    hideContextMenu();
  } else if (action === 'segment-finish-low' || action === 'segment-finish-high') {
    recordHistory('Finish 1H Segment', () =>
      finishSegment(contextMenuBar, action === 'segment-finish-high' ? 'swing-high' : 'swing-low')
    ).catch((err) => {
      console.warn('[manual-annotation] finish segment failed', err);
      bus.emit('status:update', { text: '1H 行情段创建失败', isError: true });
    });
    hideContextMenu();
  } else if (action === 'segment-cancel') {
    recordHistory('Cancel 1H Segment', () => cancelSegmentSelection());
    hideContextMenu();
  } else if (action === 'segment-clear') {
    recordHistory('Clear 1H Segments', () => clearManualSegments());
    hideContextMenu();
  } else if (action === 'segment-link-pda') {
    const selectedSegment = getSelectedSegment();
    const annotation = contextMenuPdaHit ? getAnnotationById(contextMenuPdaHit.id) : null;
    const relation = e.target.closest('[data-relation]')?.dataset.relation;
    if (selectedSegment && annotation && relation) {
      recordHistory('Link PDA To Segment', () =>
        linkPdaResponse(selectedSegment.id, {
          pdaId: annotation.id,
          pdaType: annotation.type,
          relation,
        })
      );
      bus.emit('status:update', {
        text: `${getPdaLabel(annotation)} linked to selected segment as ${relation}`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-add') {
    const segment = contextMenuSegmentHit ? getSegmentById(contextMenuSegmentHit.id) : null;
    if (segment) {
      const draftIds = await recordHistory('Add Segment To Composite Draft', () => addSegmentToDraftGroup(segment.id) || []);
      bus.emit('status:update', {
        text: `${getSegmentLabel(segment)} added to Composite Draft (${draftIds.length})`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-remove') {
    const segment = contextMenuSegmentHit ? getSegmentById(contextMenuSegmentHit.id) : null;
    if (segment) {
      const draftIds = await recordHistory('Remove Segment From Composite Draft', () => removeSegmentFromDraftGroup(segment.id));
      bus.emit('status:update', {
        text: `${getSegmentLabel(segment)} removed from Composite Draft (${draftIds.length})`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-set-target') {
    const segment = contextMenuSegmentHit ? getSegmentById(contextMenuSegmentHit.id) : null;
    if (segment) {
      recordHistory('Set Composite Target', () => setDraftSegmentGroupTarget(segment.id));
      bus.emit('status:update', {
        text: `${getSegmentLabel(segment)} set as Composite Target`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-create') {
    const group = await recordHistory('Create Composite Move', () => createCompositeMove({ outcome: 'pending' }));
    bus.emit('status:update', {
      text: group ? `Composite Move created: ${group.childSegmentIds.length} legs` : 'Composite Move 至少需要 2 个 staged segments',
      isError: !group,
    });
    hideContextMenu();
  } else if (action === 'segment-group-clear') {
    recordHistory('Clear Composite Draft', () => clearDraftSegmentGroup());
    bus.emit('status:update', { text: 'Composite Draft cleared', isError: false });
    hideContextMenu();
  } else if (action === 'toggle-ndog') {
    toggleTodayNdog(contextMenuBar);
    hideContextMenu();
  } else if (action === 'toggle-nwog') {
    toggleThisWeekNwog(contextMenuBar);
    hideContextMenu();
  } else if (action === 'clear') {
    recordHistory('Clear PDA', () => {
      clearAnnotations();
      clearAllPdaResponses();
      rangeSelectionState = null;
      fibSelectionState = null;
      clearPointSetSelection({ silent: true });
    });
    hideContextMenu();
    bus.emit('status:update', { text: 'PDA 标注已清除', isError: false });
  }
}

function handleGlobalClick(e) {
  if (!e.target.closest('.pda-menu')) {
    hideContextMenu();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (rangeSelectionState) {
      const pdaType = getPdaType(rangeSelectionState.type);
      rangeSelectionState = null;
      bus.emit('status:update', { text: `${pdaType?.label || 'Range PDA'} 选择已取消`, isError: false });
    } else if (fibSelectionState) {
      fibSelectionState = null;
      bus.emit('status:update', { text: 'Fib 选择已取消', isError: false });
    } else if (getPointSetSelectionSummary()) {
      clearPointSetSelection();
    } else if (getSegmentSelectionSummary()) {
      cancelSegmentSelection();
    } else if (getTimeOverlaySettings().killzoneDraft) {
      clearKillzoneDraft();
      bus.emit('status:update', { text: 'Killzone 选择已取消', isError: false });
    }
    hideContextMenu();
  }
}

export function initManualAnnotation() {
  controlsEl = document.getElementById('pda-context-menu');
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleControlClick);
  document.getElementById('chart')?.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('bars:loaded', () => {
    rangeSelectionState = null;
    fibSelectionState = null;
    clearKillzoneDraft();
    clearPointSetSelection({ silent: true });
    hideContextMenu();
  });
  bus.on('bars:cleared', () => {
    rangeSelectionState = null;
    fibSelectionState = null;
    clearKillzoneDraft();
    clearPointSetSelection({ silent: true });
    clearPdaContextDataCache();
    hideContextMenu();
  });
}
