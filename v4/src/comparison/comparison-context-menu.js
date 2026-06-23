import * as bus from '../event-bus.js';
import { getComparisonChartContext } from '../chart/chart-context.js';
import {
  addManualFvg,
  addManualObLastBar,
  addManualPoint,
  addManualWickCe,
  findDisplayBarInContext,
  getBarChartTime,
} from '../pda/manual-pda-actions.js';
import { finishSegmentInContext, startSegmentInContext } from '../segment/manual-segment.js';
import { recordHistory } from '../history/history-manager.js';
import { timeframeToString } from '../config.js';
import {
  handleOrderSetupChartAction,
  renderOrderSetupMenuItems,
} from '../order/order-setup-chart-actions.js';
import { hitTestOrderSetupElements } from '../order/order-setup-hit-test.js';
import {
  handleLiveRecordChartAction,
  renderLiveRecordMenuItems,
} from '../live-record/live-record-chart-actions.js';
import { hitTestLiveRecordElements } from '../live-record/live-record-hit-test.js';
import { locateTimestampRange } from '../chart/viewport-controller.js';
import { hitTestPdaAnnotations } from '../pda/pda-hit-test.js';
import { hitTestSegments, hitTestSegmentGroups } from '../segment/segment-hit-test.js';
import {
  initContextMenuSubmenuPositioning,
  renderPdaMenuSection,
} from '../pda/manual-context-menu.js';
import {
  handleManualPdaAction,
  handleManualPdaShiftContext,
} from '../pda/manual-pda-workflow.js';
import { CHART_PANE_IDS, getPaneById, getPaneLabel, setPaneSyncEnabled } from '../chart-panes/chart-pane-store.js';
import { getComparisonOverlaySyncPolicy } from './comparison-overlay-policy.js';
import { setComparisonOverlaySyncMode } from './comparison-window-store.js';

let menuEl = null;
let contextMenuBar = null;
let contextMenuPrice = null;
let contextMenuPdaHit = null;
let contextMenuSegmentHit = null;
let contextMenuSegmentGroupHit = null;
let contextMenuOrderSetupHit = null;
let contextMenuLiveRecordHit = null;
let contextMenuShiftKey = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatContextTime(bar) {
  return bar?.tradingDay || bar?.time || '';
}

function formatPrice(price) {
  return Number.isFinite(Number(price)) ? Number(price).toFixed(2) : '';
}

function getContextLabel(context) {
  return `${context?.instrument || 'NQ'} ${timeframeToString(context?.timeframe)}`;
}

function getPrimaryPaneLabel() {
  return getPaneLabel(CHART_PANE_IDS.PRIMARY);
}

function getComparisonPaneLabel() {
  return getPaneLabel(CHART_PANE_IDS.COMPARISON);
}

function ensurePaneSyncForCreation(paneId) {
  const pane = getPaneById(paneId);
  if (!pane || pane.syncEnabled) return;
  setPaneSyncEnabled(paneId, true);
  bus.emit('status:update', {
    text: `${pane.label} switched to Sync for new chart object`,
    isError: false,
  });
}

function formatPrimaryLocateRange(bar, context) {
  const timestamp = Number(bar?.timestamp);
  const timeframe = Number(context?.timeframe);
  if (!Number.isFinite(timestamp) || !Number.isFinite(timeframe) || timeframe <= 0) return null;
  return {
    start: timestamp,
    end: timestamp + Math.max(60, timeframe * 60) - 60,
  };
}

function ensureComparisonDrawingCreationEnabled() {
  const policy = getComparisonOverlaySyncPolicy();
  const matches = policy.primaryInstrument === policy.comparisonInstrument;
  if (!matches) {
    bus.emit('status:update', {
      text: `${getComparisonPaneLabel()} drawings require matching instrument`,
      isError: true,
    });
    return false;
  }
  if (policy.mode === 'no-sync') {
    setComparisonOverlaySyncMode('sync');
    bus.emit('status:update', {
      text: `Drawings switched to Sync for ${getComparisonPaneLabel()} drawing`,
      isError: false,
    });
  }
  return true;
}

function isDrawingCreationAction(action) {
  return (
    action?.startsWith('comparison-pda-') ||
    action?.startsWith('comparison-segment-start-') ||
    action?.startsWith('comparison-segment-finish-')
  );
}

function isManualPdaCreationAction(action) {
  return [
    'bsl',
    'ssl',
    'wick-ce-upper',
    'wick-ce-lower',
    'fvg',
    'ifvg',
    'ob-bullish',
    'ob-bearish',
    'ob-last-bar',
    'breaker-bullish',
    'breaker-bearish',
    'fib-start',
  ].includes(action);
}

function isPaneObjectCreationAction(action) {
  return (
    isManualPdaCreationAction(action) ||
    isDrawingCreationAction(action) ||
    action === 'order-setup-create-bullish' ||
    action === 'order-setup-create-bearish' ||
    action === 'live-record-new-here' ||
    action === 'live-record-create-bullish' ||
    action === 'live-record-create-bearish'
  );
}

function renderMenu(bar, price, context, hits = {}) {
  const disabled = bar ? '' : 'disabled';
  const contextLabel = getContextLabel(context);
  const priceLabel = formatPrice(price);
  const comparisonOnlyDisabled = `disabled title="${escapeHtml(getComparisonPaneLabel())} action not wired yet"`;
  return `
    <div class="pda-menu-title">${escapeHtml(contextLabel)}${bar ? ` · ${escapeHtml(formatContextTime(bar))}` : ''}${priceLabel ? ` · ${escapeHtml(priceLabel)}` : ''}</div>
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Locate</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" data-comparison-action="comparison-locate-primary" ${disabled}>Time in ${escapeHtml(getPrimaryPaneLabel())}</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Date in Calendar</button>
      <button class="pda-menu-item" data-comparison-action="comparison-copy-time" ${disabled}>Copy ${escapeHtml(getComparisonPaneLabel())} Time</button>
      <button class="pda-menu-item" data-comparison-action="comparison-copy-price" ${priceLabel ? '' : 'disabled'}>Copy Price ${escapeHtml(priceLabel)}</button>
      </div>
    </div>
    ${renderOrderSetupMenuItems({
      bar,
      pdaHit: hits.pdaHit,
      segmentHit: hits.segmentHit,
      segmentGroupHit: hits.segmentGroupHit,
      orderSetupHit: hits.orderSetupHit,
      isShift: contextMenuShiftKey,
    })}
    ${renderLiveRecordMenuItems({
      bar,
      pdaHit: hits.pdaHit,
      segmentHit: hits.segmentHit,
      segmentGroupHit: hits.segmentGroupHit,
      chartNote: null,
      liveRecordHit: hits.liveRecordHit,
      isShift: contextMenuShiftKey,
    })}
    ${renderPdaMenuSection(disabled)}
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">SMT</div>
      <div class="pda-submenu-panel">
      <div class="pda-menu-subtitle">Use ${escapeHtml(getPrimaryPaneLabel())} SMT actions for now.</div>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Start Bearish Liquidity SMT</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Start Bullish Liquidity SMT</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Mark Bearish FVG SMT</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Mark Bullish FVG SMT</button>
      </div>
    </div>
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Segment</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" data-comparison-action="comparison-segment-start-low" ${disabled}>Start Segment from Low</button>
      <button class="pda-menu-item" data-comparison-action="comparison-segment-start-high" ${disabled}>Start Segment from High</button>
      <button class="pda-menu-item" data-comparison-action="comparison-segment-finish-low" ${disabled}>End Segment at Low</button>
      <button class="pda-menu-item" data-comparison-action="comparison-segment-finish-high" ${disabled}>End Segment at High</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Cancel Segment</button>
      </div>
    </div>
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Point Sets</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Start EQH Set</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Start EQL Set</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Add Point Set Point</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Finish Point Set</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Cancel Set</button>
      </div>
    </div>
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Chart Note</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Add Note Here</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Edit Note</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Delete Note</button>
      <div class="pda-menu-divider"></div>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Start Range Note Here</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Finish Range Note Here</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Edit Range Note</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Delete Range Note</button>
      </div>
    </div>
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Time Overlays</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Add Time Line Here</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Delete Time Line</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Clear Time Lines</button>
      <div class="pda-menu-divider"></div>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Start Killzone Here</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>End Killzone Here</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Rename Killzone Here</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Delete Killzone Here</button>
      </div>
    </div>
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Objective Gaps</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Show/Hide Today NDOG</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Show/Hide This Week NWOG</button>
      </div>
    </div>
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Clear</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Clear PDA</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Clear Segments</button>
      <button class="pda-menu-item" ${comparisonOnlyDisabled}>Clear Killzones</button>
      </div>
    </div>
  `;
}

function hideComparisonContextMenu() {
  if (!menuEl) return;
  menuEl.hidden = true;
  contextMenuBar = null;
  contextMenuPrice = null;
  contextMenuPdaHit = null;
  contextMenuSegmentHit = null;
  contextMenuSegmentGroupHit = null;
  contextMenuOrderSetupHit = null;
  contextMenuLiveRecordHit = null;
  contextMenuShiftKey = false;
}

function positionMenu(x, y) {
  if (!menuEl) return;
  const host = menuEl.parentElement;
  const bounds = host?.getBoundingClientRect();
  if (!bounds) return;

  const margin = 4;
  const submenuWidth = 236;
  const availableHeight = Math.max(80, bounds.height - margin * 2);
  const menuRect = menuEl.getBoundingClientRect();
  const menuWidth = Math.max(220, menuRect.width);
  const naturalHeight = Math.max(1, menuEl.scrollHeight || 0, menuRect.height);
  const visibleHeight = Math.min(naturalHeight, availableHeight);
  const maxX = Math.max(margin, bounds.width - menuWidth - margin);
  const clampedX = Math.min(Math.max(margin, x), maxX);
  let clampedY = y;
  if (clampedY + visibleHeight + margin > bounds.height) {
    clampedY = Math.max(margin, bounds.height - visibleHeight - margin);
  }

  const constrained = naturalHeight > availableHeight;
  menuEl.classList.toggle('is-scroll-constrained', constrained);
  menuEl.style.left = `${Math.round(clampedX)}px`;
  menuEl.style.top = `${Math.round(Math.max(margin, clampedY))}px`;
  menuEl.style.maxHeight = `${Math.round(availableHeight)}px`;
  menuEl.classList.toggle('pda-menu-submenu-left', clampedX + menuWidth + submenuWidth + margin > bounds.width);
  menuEl.classList.toggle('pda-menu-submenu-right', clampedX + menuWidth + submenuWidth + margin <= bounds.width);
}

function measurePanel(panel) {
  const previousDisplay = panel.style.display;
  const previousVisibility = panel.style.visibility;
  const previousPointerEvents = panel.style.pointerEvents;
  panel.style.display = 'block';
  panel.style.visibility = 'hidden';
  panel.style.pointerEvents = 'none';
  const rect = panel.getBoundingClientRect();
  panel.style.display = previousDisplay;
  panel.style.visibility = previousVisibility;
  panel.style.pointerEvents = previousPointerEvents;
  return rect;
}

function positionComparisonSubmenu(submenuEl) {
  const panel = submenuEl?.querySelector(':scope > .pda-submenu-panel');
  const chartEl = document.getElementById('comparison-chart-canvas');
  if (!panel || !chartEl) return;

  const margin = 8;
  const chartRect = chartEl.getBoundingClientRect();
  const triggerRect = submenuEl.getBoundingClientRect();
  const panelRect = measurePanel(panel);
  const panelWidth = Math.max(236, panelRect.width);
  const maxHeight = Math.max(80, chartRect.height - margin * 2);
  const opensLeft = triggerRect.right + panelWidth + margin > chartRect.right;
  const naturalLeft = opensLeft ? triggerRect.left - panelWidth + 2 : triggerRect.right - 2;
  const maxLeft = chartRect.right - panelWidth - margin;
  const left = Math.min(Math.max(chartRect.left + margin, naturalLeft), Math.max(chartRect.left + margin, maxLeft));
  const visibleHeight = Math.min(panelRect.height || maxHeight, maxHeight);
  const maxTop = chartRect.bottom - visibleHeight - margin;
  const top = Math.min(Math.max(chartRect.top + margin, triggerRect.top - 4), Math.max(chartRect.top + margin, maxTop));

  panel.style.position = 'fixed';
  panel.style.left = `${Math.round(left)}px`;
  panel.style.right = 'auto';
  panel.style.top = `${Math.round(top)}px`;
  panel.style.maxHeight = `${Math.round(maxHeight)}px`;
}

function initComparisonSubmenuPositioning() {
  menuEl?.querySelectorAll('.pda-menu-submenu').forEach((submenuEl) => {
    submenuEl.addEventListener('mouseenter', () => positionComparisonSubmenu(submenuEl));
    submenuEl.addEventListener('focusin', () => positionComparisonSubmenu(submenuEl));
  });
}

function showComparisonContextMenu(x, y, bar, price, context, hits = {}) {
  if (!menuEl) return;
  contextMenuBar = bar;
  contextMenuPrice = price;
  contextMenuPdaHit = hits.pdaHit || null;
  contextMenuSegmentHit = hits.segmentHit || null;
  contextMenuSegmentGroupHit = hits.segmentGroupHit || null;
  contextMenuOrderSetupHit = hits.orderSetupHit || null;
  contextMenuLiveRecordHit = hits.liveRecordHit || null;
  menuEl.innerHTML = renderMenu(bar, price, context, hits);
  menuEl.hidden = false;
  initContextMenuSubmenuPositioning(menuEl);
  initComparisonSubmenuPositioning();
  positionMenu(x, y);
}

function getComparisonContextHits(x, y, context) {
  return {
    pdaHit: hitTestPdaAnnotations({ x, y, context }),
    segmentHit: hitTestSegments({ x, y, context }),
    segmentGroupHit: hitTestSegmentGroups({ x, y, context }),
    orderSetupHit: hitTestOrderSetupElements({ x, y, context }),
    liveRecordHit: hitTestLiveRecordElements({ x, y, context }),
  };
}

function handleContextMenu(event) {
  if (event.target.closest('.pda-menu')) return;
  const chartEl = document.getElementById('comparison-chart-canvas');
  if (!chartEl) return;
  const context = getComparisonChartContext();
  if (!context.enabled) return;

  event.preventDefault();
  const rect = chartEl.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const time = context.coordinateToTime(x);
  const bar = findDisplayBarInContext(context, time);
  const price = context.coordinateToPrice(y);
  const hits = getComparisonContextHits(x, y, context);
  contextMenuShiftKey = event.shiftKey;
  if (event.shiftKey && handleManualPdaShiftContext({ bar, context, hideContextMenu: hideComparisonContextMenu })) {
    return;
  }
  showComparisonContextMenu(x, y, bar, price, context, hits);
}

async function handleMenuClick(event) {
  const comparisonAction = event.target.closest('[data-comparison-action]')?.dataset.comparisonAction;
  const pdaAction = event.target.closest('[data-pda-action]')?.dataset.pdaAction;
  const action = comparisonAction || pdaAction;
  if (!action) return;
  event.stopPropagation();
  const context = getComparisonChartContext();
  const timeframe = timeframeToString(context.timeframe);
  if (isPaneObjectCreationAction(action)) {
    ensurePaneSyncForCreation(CHART_PANE_IDS.COMPARISON);
  }

  if (pdaAction && isManualPdaCreationAction(pdaAction)) {
    if (!ensureComparisonDrawingCreationEnabled()) {
      hideComparisonContextMenu();
      return;
    }
    if (await handleManualPdaAction(pdaAction, {
      bar: contextMenuBar,
      context,
      price: contextMenuPrice,
      hideContextMenu: hideComparisonContextMenu,
    })) {
      return;
    }
  }

  if (pdaAction && handleLiveRecordChartAction(pdaAction, {
    bar: contextMenuBar,
    price: contextMenuPrice,
    timeframe,
    sourceChartId: context.chartId,
    sourceChartLabel: context.label,
    sourceInstrument: context.instrument,
    sourceTimeframe: context.timeframe,
    sourceTimeframeLabel: timeframe,
    sourceContext: getContextLabel(context),
    pdaHit: contextMenuPdaHit,
    segmentHit: contextMenuSegmentHit,
    segmentGroupHit: contextMenuSegmentGroupHit,
    chartNote: null,
    liveRecordId: event.target.closest('[data-live-record-id]')?.dataset.liveRecordId || '',
    liveRecordElement: event.target.closest('[data-live-record-element]')?.dataset.liveRecordElement || '',
  })) {
    hideComparisonContextMenu();
    return;
  }

  if (pdaAction && handleOrderSetupChartAction(pdaAction, {
    bar: contextMenuBar,
    price: contextMenuPrice,
    priceToCoordinate: context.priceToCoordinate,
    timeframe,
    sourceChartId: context.chartId,
    sourceChartLabel: context.label,
    sourceInstrument: context.instrument,
    sourceTimeframe: context.timeframe,
    sourceTimeframeLabel: timeframe,
    sourceContext: getContextLabel(context),
    pdaHit: contextMenuPdaHit,
    segmentHit: contextMenuSegmentHit,
    segmentGroupHit: contextMenuSegmentGroupHit,
    orderSetupId: event.target.closest('[data-order-setup-id]')?.dataset.orderSetupId || '',
    orderSetupElement: event.target.closest('[data-order-setup-element]')?.dataset.orderSetupElement || '',
  })) {
    hideComparisonContextMenu();
    return;
  }

  if (isDrawingCreationAction(action) && !ensureComparisonDrawingCreationEnabled()) {
    hideComparisonContextMenu();
    return;
  }

  if (action === 'comparison-pda-bsl' || action === 'comparison-pda-ssl') {
    await addManualPoint(action === 'comparison-pda-bsl' ? 'bsl' : 'ssl', contextMenuBar, context, {
      source: 'manual',
      sourceChartLabel: context.label,
    });
    hideComparisonContextMenu();
  } else if (action === 'comparison-pda-fvg') {
    addManualFvg(contextMenuBar, context);
    hideComparisonContextMenu();
  } else if (action === 'comparison-pda-ifvg') {
    addManualFvg(contextMenuBar, context, 'ifvg');
    hideComparisonContextMenu();
  } else if (action === 'comparison-pda-ob-last-bar') {
    await addManualObLastBar(contextMenuBar, context, contextMenuPrice);
    hideComparisonContextMenu();
  } else if (action === 'comparison-pda-wick-ce-upper' || action === 'comparison-pda-wick-ce-lower') {
    addManualWickCe(action === 'comparison-pda-wick-ce-upper' ? 'upper' : 'lower', contextMenuBar, context);
    hideComparisonContextMenu();
  } else if (action === 'comparison-segment-start-low' || action === 'comparison-segment-start-high') {
    recordHistory(`Start ${getComparisonPaneLabel()} Segment`, () =>
      startSegmentInContext(
        contextMenuBar,
        action === 'comparison-segment-start-high' ? 'swing-high' : 'swing-low',
        context
      )
    );
    hideComparisonContextMenu();
  } else if (action === 'comparison-segment-finish-low' || action === 'comparison-segment-finish-high') {
    await recordHistory(`Finish ${getComparisonPaneLabel()} Segment`, () =>
      finishSegmentInContext(
        contextMenuBar,
        action === 'comparison-segment-finish-high' ? 'swing-high' : 'swing-low',
        context
      )
    );
    hideComparisonContextMenu();
  } else if (action === 'comparison-locate-primary') {
    const range = formatPrimaryLocateRange(contextMenuBar, context);
    if (!range) {
      bus.emit('status:update', { text: `${getPrimaryPaneLabel()} locate failed: ${getComparisonPaneLabel()} time unavailable`, isError: true });
    } else {
      locateTimestampRange(range.start, range.end);
      bus.emit('status:update', { text: `${getPrimaryPaneLabel()} located to ${formatContextTime(contextMenuBar)}`, isError: false });
    }
    hideComparisonContextMenu();
  } else if (action === 'comparison-copy-time') {
    navigator.clipboard?.writeText(String(contextMenuBar?.time || contextMenuBar?.timestamp || ''));
    bus.emit('status:update', { text: `${getComparisonPaneLabel()} time copied`, isError: false });
    hideComparisonContextMenu();
  } else if (action === 'comparison-copy-price') {
    navigator.clipboard?.writeText(formatPrice(contextMenuPrice));
    bus.emit('status:update', { text: `${getComparisonPaneLabel()} price copied`, isError: false });
    hideComparisonContextMenu();
  }
}

export function initComparisonContextMenu() {
  menuEl = document.getElementById('comparison-context-menu');
  const chartEl = document.getElementById('comparison-chart-canvas');
  if (!menuEl || !chartEl) return;
  chartEl.addEventListener('contextmenu', handleContextMenu);
  menuEl.addEventListener('click', handleMenuClick);
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#comparison-context-menu')) hideComparisonContextMenu();
  });
  bus.on('comparison-bars:cleared', hideComparisonContextMenu);
  bus.on('comparison-window:changed', ({ enabled }) => {
    if (!enabled) hideComparisonContextMenu();
  });
}
