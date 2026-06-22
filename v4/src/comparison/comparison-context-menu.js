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
import { ORDER_EVENT_TYPES } from '../order/order-review-types.js';
import { getActiveReviewSet, updateActiveReviewSet } from '../order/order-review-active.js';
import { handleOrderSetupChartAction } from '../order/order-setup-chart-actions.js';
import { locateTimestampRange } from '../chart/viewport-controller.js';
import { hitTestPdaAnnotations } from '../pda/pda-hit-test.js';
import { hitTestSegments, hitTestSegmentGroups } from '../segment/segment-hit-test.js';
import { initContextMenuSubmenuPositioning } from '../pda/manual-context-menu.js';
import { getComparisonOverlaySyncPolicy } from './comparison-overlay-policy.js';
import { setComparisonOverlaySyncMode } from './comparison-window-store.js';

let menuEl = null;
let contextMenuBar = null;
let contextMenuPrice = null;
let contextMenuPdaHit = null;
let contextMenuSegmentHit = null;
let contextMenuSegmentGroupHit = null;

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

function buildEvidenceNote(bar, price, context) {
  const priceLabel = formatPrice(price);
  return [
    `Comparison ${getContextLabel(context)}`,
    formatContextTime(bar),
    priceLabel ? `@ ${priceLabel}` : '',
  ].filter(Boolean).join(' · ');
}

function getActiveSetupLinkLabel() {
  const active = getActiveReviewSet();
  if (!active) return 'No active setup';
  const direction = active.direction === 'long' ? 'Long' : active.direction === 'short' ? 'Short' : 'Setup';
  return `${direction} · ${String(active.id || '').slice(0, 18)}`;
}

function renderOrderSetupEvidenceItems(bar, hits = {}) {
  const active = getActiveReviewSet();
  const activeDisabled = active ? '' : 'disabled';
  const barDisabled = active && bar ? '' : 'disabled';
  const pdaDisabled = active && hits.pdaHit ? '' : 'disabled';
  const segmentDisabled = active && hits.segmentHit ? '' : 'disabled';
  const compositeDisabled = active && hits.segmentGroupHit ? '' : 'disabled';

  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Order Setup Evidence · ${escapeHtml(getActiveSetupLinkLabel())}</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" data-comparison-action="comparison-order-add-bar-evidence" ${activeDisabled || barDisabled}>Add Comparison Bar Evidence</button>
      <div class="pda-menu-divider"></div>
      <button class="pda-menu-item" data-comparison-action="comparison-order-link-pda" ${activeDisabled || pdaDisabled}>Link PDA To Active Setup</button>
      <button class="pda-menu-item" data-comparison-action="comparison-order-link-segment" ${activeDisabled || segmentDisabled}>Link Segment To Active Setup</button>
      <button class="pda-menu-item" data-comparison-action="comparison-order-link-composite" ${activeDisabled || compositeDisabled}>Link Composite To Active Setup</button>
      </div>
    </div>
  `;
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

function addComparisonBarEvidenceToActiveSetup(bar, price, context) {
  const active = getActiveReviewSet();
  if (!active?.orderReview || !bar) {
    bus.emit('status:update', { text: 'No active setup or comparison bar for evidence', isError: true });
    return false;
  }

  const existingEvents = Array.isArray(active.orderReview.setupThesis?.manualEvents)
    ? active.orderReview.setupThesis.manualEvents
    : [];
  const tfLabel = timeframeToString(context?.timeframe);
  const event = {
    timestamp: bar.timestamp,
    timeframe: tfLabel,
    eventType: ORDER_EVENT_TYPES.OTHER,
    price: Number.isFinite(Number(price)) ? Number(price) : null,
    note: buildEvidenceNote(bar, price, context),
    sourceChartId: context?.chartId || context?.id || 'comparison-window',
    sourceChartLabel: context?.label || 'Comparison',
    sourceInstrument: context?.instrument || 'NQ',
    sourceTimeframe: context?.timeframe,
    sourceTimeframeLabel: tfLabel,
    sourceContext: getContextLabel(context),
  };

  return recordHistory('Add Comparison Bar Evidence', () => {
    const updated = updateActiveReviewSet({
      setupThesis: {
        manualEvents: [...existingEvents, event],
      },
    });
    bus.emit('status:update', {
      text: updated ? 'Comparison bar evidence added to active setup' : 'Comparison bar evidence add failed',
      isError: !updated,
    });
    return updated;
  });
}

function ensureComparisonDrawingCreationEnabled() {
  const policy = getComparisonOverlaySyncPolicy();
  const matches =
    policy.primaryInstrument === policy.comparisonInstrument &&
    policy.primaryTimeframe !== null &&
    policy.comparisonTimeframe !== null &&
    policy.primaryTimeframe === policy.comparisonTimeframe;
  if (!matches) {
    bus.emit('status:update', {
      text: 'Comparison drawings require matching instrument and timeframe',
      isError: true,
    });
    return false;
  }
  if (policy.mode === 'no-sync') {
    setComparisonOverlaySyncMode('sync');
    bus.emit('status:update', {
      text: 'Drawings switched to Sync for comparison drawing',
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

function renderMenu(bar, price, context, hits = {}) {
  const disabled = bar ? '' : 'disabled';
  const contextLabel = getContextLabel(context);
  const priceLabel = formatPrice(price);
  return `
    <div class="pda-menu-title">${escapeHtml(contextLabel)}${bar ? ` · ${escapeHtml(formatContextTime(bar))}` : ''}${priceLabel ? ` · ${escapeHtml(priceLabel)}` : ''}</div>
    <div class="pda-menu-section">
      <button class="pda-menu-item" data-comparison-action="comparison-pda-bsl" ${disabled}>Mark BSL</button>
      <button class="pda-menu-item" data-comparison-action="comparison-pda-ssl" ${disabled}>Mark SSL</button>
      <button class="pda-menu-item" data-comparison-action="comparison-pda-fvg" ${disabled}>Mark FVG</button>
      <button class="pda-menu-item" data-comparison-action="comparison-pda-ifvg" ${disabled}>Mark IFVG</button>
      <button class="pda-menu-item" data-comparison-action="comparison-pda-ob-last-bar" ${bar && priceLabel ? '' : 'disabled'}>Mark OB Last Bar</button>
      <button class="pda-menu-item" data-comparison-action="comparison-pda-wick-ce-upper" ${disabled}>Mark Upper Wick CE</button>
      <button class="pda-menu-item" data-comparison-action="comparison-pda-wick-ce-lower" ${disabled}>Mark Lower Wick CE</button>
    </div>
    <div class="pda-menu-section">
      <button class="pda-menu-item" data-comparison-action="comparison-segment-start-low" ${disabled}>Start Segment from Low</button>
      <button class="pda-menu-item" data-comparison-action="comparison-segment-start-high" ${disabled}>Start Segment from High</button>
      <button class="pda-menu-item" data-comparison-action="comparison-segment-finish-low" ${disabled}>End Segment at Low</button>
      <button class="pda-menu-item" data-comparison-action="comparison-segment-finish-high" ${disabled}>End Segment at High</button>
    </div>
    ${renderOrderSetupEvidenceItems(bar, hits)}
    <div class="pda-menu-section">
      <button class="pda-menu-item" data-comparison-action="comparison-locate-primary" ${disabled}>Locate Time in Primary</button>
      <button class="pda-menu-item" data-comparison-action="comparison-copy-time" ${disabled}>Copy Comparison Time</button>
      <button class="pda-menu-item" data-comparison-action="comparison-copy-price" ${priceLabel ? '' : 'disabled'}>Copy Price ${escapeHtml(priceLabel)}</button>
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
  showComparisonContextMenu(x, y, bar, price, context, hits);
}

async function handleMenuClick(event) {
  const action = event.target.closest('[data-comparison-action]')?.dataset.comparisonAction;
  if (!action) return;
  event.stopPropagation();
  const context = getComparisonChartContext();

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
    recordHistory('Start Comparison Segment', () =>
      startSegmentInContext(
        contextMenuBar,
        action === 'comparison-segment-start-high' ? 'swing-high' : 'swing-low',
        context
      )
    );
    hideComparisonContextMenu();
  } else if (action === 'comparison-segment-finish-low' || action === 'comparison-segment-finish-high') {
    await recordHistory('Finish Comparison Segment', () =>
      finishSegmentInContext(
        contextMenuBar,
        action === 'comparison-segment-finish-high' ? 'swing-high' : 'swing-low',
        context
      )
    );
    hideComparisonContextMenu();
  } else if (action === 'comparison-order-add-bar-evidence') {
    addComparisonBarEvidenceToActiveSetup(contextMenuBar, contextMenuPrice, context);
    hideComparisonContextMenu();
  } else if (
    action === 'comparison-order-link-pda' ||
    action === 'comparison-order-link-segment' ||
    action === 'comparison-order-link-composite'
  ) {
    const actionMap = {
      'comparison-order-link-pda': 'order-setup-link-pda',
      'comparison-order-link-segment': 'order-setup-link-segment',
      'comparison-order-link-composite': 'order-setup-link-composite',
    };
    handleOrderSetupChartAction(actionMap[action], {
      bar: contextMenuBar,
      price: contextMenuPrice,
      timeframe: context.timeframe,
      pdaHit: contextMenuPdaHit,
      segmentHit: contextMenuSegmentHit,
      segmentGroupHit: contextMenuSegmentGroupHit,
    });
    hideComparisonContextMenu();
  } else if (action === 'comparison-locate-primary') {
    const range = formatPrimaryLocateRange(contextMenuBar, context);
    if (!range) {
      bus.emit('status:update', { text: 'Primary locate failed: comparison time unavailable', isError: true });
    } else {
      locateTimestampRange(range.start, range.end);
      bus.emit('status:update', { text: `Primary located to ${formatContextTime(contextMenuBar)}`, isError: false });
    }
    hideComparisonContextMenu();
  } else if (action === 'comparison-copy-time') {
    navigator.clipboard?.writeText(String(contextMenuBar?.time || contextMenuBar?.timestamp || ''));
    bus.emit('status:update', { text: 'Comparison time copied', isError: false });
    hideComparisonContextMenu();
  } else if (action === 'comparison-copy-price') {
    navigator.clipboard?.writeText(formatPrice(contextMenuPrice));
    bus.emit('status:update', { text: 'Comparison price copied', isError: false });
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
