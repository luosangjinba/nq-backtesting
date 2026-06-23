import { getAnnotationById } from './pda-store.js';
import { getPdaType } from './pda-types.js';
import { getSelectedSegment } from '../segment/segment-selection.js';
import { getSegmentById } from '../segment/segment-store.js';
import {
  getDraftSegmentGroupChildIds,
  getDraftSegmentGroupTargetId,
} from '../segment/segment-group-store.js';
import { getSmtDisabledReason } from '../smt/manual-smt.js';
import { CHART_PANE_IDS, getPaneLabel } from '../chart-panes/chart-pane-store.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function clampMenuPosition(containerEl, x, y) {
  const rect = containerEl.parentElement.getBoundingClientRect();
  const menuWidth = 220;
  const submenuWidth = 236;
  const margin = 4;
  const availableHeight = Math.max(160, rect.height - margin * 2);
  const clampedX = Math.min(Math.max(margin, x), Math.max(margin, rect.width - menuWidth - margin));
  let clampedY = y;
  if (y + availableHeight + margin > rect.height) {
    clampedY = Math.max(margin, rect.height - availableHeight - margin);
  }
  return {
    maxHeight: availableHeight,
    submenuDirection: clampedX + menuWidth + submenuWidth + margin > rect.width ? 'left' : 'right',
    x: clampedX,
    y: Math.max(margin, clampedY),
  };
}

export function repositionContextMenu(menuEl, anchorX, anchorY) {
  if (!menuEl) return null;
  const containerEl = menuEl.parentElement;
  const bounds = containerEl?.parentElement?.getBoundingClientRect();
  if (!bounds) return null;

  const margin = 4;
  const submenuWidth = 236;
  const availableHeight = Math.max(160, bounds.height - margin * 2);
  const menuRect = menuEl.getBoundingClientRect();
  const menuWidth = Math.max(220, menuRect.width);
  const naturalHeight = Math.max(1, menuEl.scrollHeight || 0, menuRect.height);
  const visibleHeight = Math.min(naturalHeight, availableHeight);
  const clampedX = Math.min(Math.max(margin, anchorX), Math.max(margin, bounds.width - menuWidth - margin));
  let clampedY = anchorY;
  if (clampedY + visibleHeight + margin > bounds.height) {
    clampedY = Math.max(margin, bounds.height - visibleHeight - margin);
  }

  const constrained = naturalHeight > availableHeight;
  menuEl.classList.toggle('is-scroll-constrained', constrained);
  menuEl.style.left = `${Math.round(clampedX)}px`;
  menuEl.style.top = `${Math.round(Math.max(margin, clampedY))}px`;
  menuEl.style.maxHeight = `${Math.round(availableHeight)}px`;
  menuEl.classList.toggle(
    'pda-menu-submenu-left',
    clampedX + menuWidth + submenuWidth + margin > bounds.width
  );
  menuEl.classList.toggle(
    'pda-menu-submenu-right',
    clampedX + menuWidth + submenuWidth + margin <= bounds.width
  );

  return {
    constrained,
    maxHeight: availableHeight,
    x: clampedX,
    y: Math.max(margin, clampedY),
  };
}

function measureSubmenuPanel(panel) {
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

function adjustSubmenuPanel(submenuEl) {
  const panel = submenuEl?.querySelector(':scope > .pda-submenu-panel');
  if (!panel) return;

  panel.style.setProperty('--pda-submenu-offset-y', '-4px');
  panel.style.removeProperty('--pda-submenu-fixed-left');
  panel.style.removeProperty('--pda-submenu-fixed-top');
  const bounds = submenuEl.closest('.pda-menu')?.parentElement?.getBoundingClientRect();
  const panelRect = measureSubmenuPanel(panel);
  const triggerRect = submenuEl.getBoundingClientRect();
  const margin = 8;
  const boundaryLeft = bounds?.left ?? 0;
  const boundaryRight = bounds?.right ?? window.innerWidth;
  const boundaryTop = bounds?.top ?? 0;
  const boundaryBottom = bounds?.bottom ?? window.innerHeight;
  const maxHeight = Math.max(96, boundaryBottom - boundaryTop - margin * 2);
  panel.style.maxHeight = `${Math.min(560, maxHeight)}px`;

  const nested = Boolean(submenuEl.parentElement?.closest('.pda-submenu-panel'));
  if (nested) {
    const menuEl = submenuEl.closest('.pda-menu');
    const opensLeft = menuEl?.classList.contains('pda-menu-submenu-left');
    const naturalLeft = opensLeft ? triggerRect.left - panelRect.width + 2 : triggerRect.right - 2;
    const maxLeft = boundaryRight - panelRect.width - margin;
    const targetLeft = Math.min(Math.max(boundaryLeft + margin, naturalLeft), Math.max(boundaryLeft + margin, maxLeft));
    const naturalTop = triggerRect.top - 4;
    const maxTop = boundaryBottom - Math.min(panelRect.height, maxHeight) - margin;
    const targetTop = Math.min(Math.max(boundaryTop + margin, naturalTop), Math.max(boundaryTop + margin, maxTop));
    panel.style.setProperty('--pda-submenu-fixed-left', `${Math.round(targetLeft)}px`);
    panel.style.setProperty('--pda-submenu-fixed-top', `${Math.round(targetTop)}px`);
    return;
  }

  const overflow = panelRect.bottom - (boundaryBottom - margin);
  if (overflow <= 0) return;

  const naturalTop = triggerRect.top - 4;
  const targetTop = Math.max(boundaryTop + margin, naturalTop - overflow);
  panel.style.setProperty('--pda-submenu-offset-y', `${Math.round(targetTop - triggerRect.top)}px`);
}

function closeSubmenuTree(submenuEl) {
  submenuEl?.classList.remove('is-open');
  submenuEl?.querySelectorAll('.pda-menu-submenu.is-open').forEach((child) => {
    child.classList.remove('is-open');
  });
}

function closeSiblingSubmenus(submenuEl) {
  const parent = submenuEl?.parentElement;
  if (!parent) return;
  Array.from(parent.children).forEach((child) => {
    if (child !== submenuEl && child.classList?.contains('pda-menu-submenu')) {
      closeSubmenuTree(child);
    }
  });
}

function closeDirectSubmenus(levelEl) {
  levelEl?.querySelectorAll(':scope > .pda-menu-submenu.is-open').forEach(closeSubmenuTree);
}

function openSubmenu(submenuEl) {
  closeSiblingSubmenus(submenuEl);
  submenuEl.classList.add('is-open');
  adjustSubmenuPanel(submenuEl);
}

function initSubmenuLevel(levelEl) {
  if (!levelEl) return;
  Array.from(levelEl.children).forEach((child) => {
    if (child.classList?.contains('pda-menu-submenu')) {
      child.addEventListener('mouseenter', () => openSubmenu(child));
      child.addEventListener('focusin', () => openSubmenu(child));
      return;
    }
    child.addEventListener?.('mouseenter', () => closeDirectSubmenus(levelEl));
    child.addEventListener?.('focusin', () => closeDirectSubmenus(levelEl));
  });
}

export function initContextMenuSubmenuPositioning(menuEl) {
  initSubmenuLevel(menuEl);
  menuEl?.querySelectorAll('.pda-submenu-panel').forEach((panelEl) => {
    initSubmenuLevel(panelEl);
  });
}

export function getPdaLabel(annotation) {
  if (!annotation) return 'PDA';
  return getPdaType(annotation.type)?.label || annotation.type?.toUpperCase() || 'PDA';
}

export function getSegmentLabel(segment) {
  if (!segment) return 'Segment';
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} LEG`;
}

export function renderSegmentPdaLinkItems(pdaHit) {
  const selectedSegment = getSelectedSegment();
  if (!selectedSegment || !pdaHit) return '';

  const annotation = getAnnotationById(pdaHit.id);
  const pdaLabel = getPdaLabel(annotation);
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Link ${pdaLabel}</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="respected">Respected</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="swept">Swept</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="approached">Approached</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="rejected">Rejected</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="delivered-through">Delivered Through</button>
      </div>
    </div>
  `;
}

export function renderSegmentGroupItems(segmentHit) {
  if (!segmentHit) return '';
  const segment = getSegmentById(segmentHit.id);
  if (!segment) return '';

  const draftIds = getDraftSegmentGroupChildIds();
  const targetId = getDraftSegmentGroupTargetId();
  const inDraft = draftIds.includes(segment.id);
  const isTarget = targetId === segment.id;
  const createDisabled = draftIds.length >= 2 ? '' : 'disabled';
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Composite · ${getSegmentLabel(segment)}</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" data-pda-action="${inDraft ? 'segment-group-remove' : 'segment-group-add'}">
        ${inDraft ? 'Remove Segment From Draft' : 'Add Segment To Draft'}
      </button>
      <button class="pda-menu-item" data-pda-action="segment-group-set-target">
        ${isTarget ? 'Target Segment Selected' : 'Set Segment As Target'}
      </button>
      <button class="pda-menu-item" data-pda-action="segment-group-create" ${createDisabled}>Create Composite Move (${draftIds.length})</button>
      <button class="pda-menu-item" data-pda-action="segment-group-clear">Clear Composite Draft</button>
      </div>
    </div>
  `;
}

export function renderManualContextMenu({
  left,
  top,
  maxHeight,
  timeLabel,
  disabled,
  orderSetupItems,
  segmentPdaLinkItems,
  segmentGroupItems,
  liveRecordItems,
  segmentItems,
  pointSetItems,
  chartNoteItems,
  timeOverlayItems,
  clearItems,
  submenuDirection = 'right',
}) {
  const smtDisabledReason = getSmtDisabledReason();
  const smtDisabled = disabled || smtDisabledReason ? 'disabled' : '';
  const smtTitle = smtDisabledReason ? ` title="${smtDisabledReason}"` : '';
  const smtReasonItem = smtDisabledReason
    ? `<div class="pda-menu-subtitle">${smtDisabledReason}</div>`
    : '';

  return `
    <div class="pda-menu pda-menu-submenu-${submenuDirection}" style="left: ${left}px; top: ${top}px; max-height: ${maxHeight}px;">
      <div class="pda-menu-title">${timeLabel}</div>
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Locate</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="calendar-locate-date" ${disabled}>Date in Calendar</button>
        <button class="pda-menu-item" data-pda-action="comparison-locate-time" ${disabled}>Time in ${escapeHtml(getPaneLabel(CHART_PANE_IDS.COMPARISON))}</button>
        </div>
      </div>
      ${orderSetupItems}
      ${liveRecordItems || ''}
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">PDA</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="bsl" ${disabled}>Mark BSL</button>
        <button class="pda-menu-item" data-pda-action="ssl" ${disabled}>Mark SSL</button>
        <button class="pda-menu-item" data-pda-action="wick-ce-upper" ${disabled}>Mark Upper Wick CE</button>
        <button class="pda-menu-item" data-pda-action="wick-ce-lower" ${disabled}>Mark Lower Wick CE</button>
        <button class="pda-menu-item" data-pda-action="fvg" ${disabled}>Mark FVG</button>
        <button class="pda-menu-item" data-pda-action="ifvg" ${disabled}>Mark IFVG</button>
        <button class="pda-menu-item" data-pda-action="ob-bullish" ${disabled}>Mark Bullish OB</button>
        <button class="pda-menu-item" data-pda-action="ob-bearish" ${disabled}>Mark Bearish OB</button>
        <button class="pda-menu-item" data-pda-action="ob-last-bar" ${disabled}>Mark OB Last Bar</button>
        <button class="pda-menu-item" data-pda-action="breaker-bullish" ${disabled}>Mark Bullish Breaker</button>
        <button class="pda-menu-item" data-pda-action="breaker-bearish" ${disabled}>Mark Bearish Breaker</button>
        <button class="pda-menu-item" data-pda-action="fib-start" ${disabled}>Start Fib</button>
        </div>
      </div>
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">SMT</div>
        <div class="pda-submenu-panel">
        ${smtReasonItem}
        <button class="pda-menu-item" data-pda-action="smt-liquidity-bearish" ${smtDisabled}${smtTitle}>Start Bearish Liquidity SMT</button>
        <button class="pda-menu-item" data-pda-action="smt-liquidity-bullish" ${smtDisabled}${smtTitle}>Start Bullish Liquidity SMT</button>
        <button class="pda-menu-item" data-pda-action="smt-fvg-bearish" ${smtDisabled}${smtTitle}>Mark Bearish FVG SMT</button>
        <button class="pda-menu-item" data-pda-action="smt-fvg-bullish" ${smtDisabled}${smtTitle}>Mark Bullish FVG SMT</button>
        </div>
      </div>
      ${segmentPdaLinkItems}
      ${segmentGroupItems}
      ${segmentItems}
      ${pointSetItems}
      ${chartNoteItems}
      ${timeOverlayItems}
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Objective Gaps</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="toggle-ndog" ${disabled}>Show/Hide Today NDOG</button>
        <button class="pda-menu-item" data-pda-action="toggle-nwog" ${disabled}>Show/Hide This Week NWOG</button>
        </div>
      </div>
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Clear</div>
        <div class="pda-submenu-panel">
        ${clearItems}
        </div>
      </div>
    </div>
  `;
}
