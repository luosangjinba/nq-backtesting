import { getAnnotationById } from './pda-store.js';
import { getPdaType } from './pda-types.js';
import { getSelectedSegment } from '../segment/segment-selection.js';
import { getSegmentById } from '../segment/segment-store.js';
import {
  getDraftSegmentGroupChildIds,
  getDraftSegmentGroupTargetId,
} from '../segment/segment-group-store.js';

export function clampMenuPosition(containerEl, x, y) {
  const rect = containerEl.parentElement.getBoundingClientRect();
  const menuWidth = 220;
  const margin = 4;
  const availableHeight = Math.max(160, rect.height - margin * 2);
  const estimatedMenuHeight = 760;
  const maxHeight = Math.min(estimatedMenuHeight, availableHeight);
  const clampedX = Math.min(Math.max(margin, x), Math.max(margin, rect.width - menuWidth - margin));
  let clampedY = y;
  if (y + maxHeight + margin > rect.height) {
    clampedY = Math.max(margin, rect.height - maxHeight - margin);
  }
  return {
    maxHeight,
    x: clampedX,
    y: Math.max(margin, clampedY),
  };
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
    <details class="pda-menu-section" open>
      <summary>Link ${pdaLabel}</summary>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="respected">Respected</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="swept">Swept</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="approached">Approached</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="rejected">Rejected</button>
      <button class="pda-menu-item" data-pda-action="segment-link-pda" data-relation="delivered-through">Delivered Through</button>
    </details>
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
    <details class="pda-menu-section">
      <summary>Composite · ${getSegmentLabel(segment)}</summary>
      <button class="pda-menu-item" data-pda-action="${inDraft ? 'segment-group-remove' : 'segment-group-add'}">
        ${inDraft ? 'Remove Segment From Draft' : 'Add Segment To Draft'}
      </button>
      <button class="pda-menu-item" data-pda-action="segment-group-set-target">
        ${isTarget ? 'Target Segment Selected' : 'Set Segment As Target'}
      </button>
      <button class="pda-menu-item" data-pda-action="segment-group-create" ${createDisabled}>Create Composite Move (${draftIds.length})</button>
      <button class="pda-menu-item" data-pda-action="segment-group-clear">Clear Composite Draft</button>
    </details>
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
  segmentItems,
  pointSetItems,
}) {
  return `
    <div class="pda-menu" style="left: ${left}px; top: ${top}px; max-height: ${maxHeight}px;">
      <div class="pda-menu-title">${timeLabel}</div>
      ${orderSetupItems}
      <details class="pda-menu-section" open>
        <summary>PDA</summary>
        <button class="pda-menu-item" data-pda-action="bsl" ${disabled}>Mark BSL</button>
        <button class="pda-menu-item" data-pda-action="ssl" ${disabled}>Mark SSL</button>
        <button class="pda-menu-item" data-pda-action="wick-ce-upper" ${disabled}>Mark Upper Wick CE</button>
        <button class="pda-menu-item" data-pda-action="wick-ce-lower" ${disabled}>Mark Lower Wick CE</button>
        <button class="pda-menu-item" data-pda-action="fvg" ${disabled}>Mark FVG</button>
        <button class="pda-menu-item" data-pda-action="ifvg" ${disabled}>Mark IFVG</button>
        <button class="pda-menu-item" data-pda-action="ob-bullish" ${disabled}>Mark Bullish OB</button>
        <button class="pda-menu-item" data-pda-action="ob-bearish" ${disabled}>Mark Bearish OB</button>
        <button class="pda-menu-item" data-pda-action="breaker-bullish" ${disabled}>Mark Bullish Breaker</button>
        <button class="pda-menu-item" data-pda-action="breaker-bearish" ${disabled}>Mark Bearish Breaker</button>
        <button class="pda-menu-item" data-pda-action="fib-start" ${disabled}>Start Fib</button>
      </details>
      <details class="pda-menu-section">
        <summary>SMT</summary>
        <button class="pda-menu-item" data-pda-action="secondary-locate-time" ${disabled}>Locate Time in Secondary</button>
        <button class="pda-menu-item" data-pda-action="smt-liquidity-bearish" ${disabled}>Start Bearish Liquidity SMT</button>
        <button class="pda-menu-item" data-pda-action="smt-liquidity-bullish" ${disabled}>Start Bullish Liquidity SMT</button>
        <button class="pda-menu-item" data-pda-action="smt-fvg-bearish" ${disabled}>Mark Bearish FVG SMT</button>
        <button class="pda-menu-item" data-pda-action="smt-fvg-bullish" ${disabled}>Mark Bullish FVG SMT</button>
      </details>
      ${segmentPdaLinkItems}
      ${segmentGroupItems}
      ${segmentItems}
      ${pointSetItems}
      <details class="pda-menu-section">
        <summary>Objective Gaps</summary>
        <button class="pda-menu-item" data-pda-action="toggle-ndog" ${disabled}>Show/Hide Today NDOG</button>
        <button class="pda-menu-item" data-pda-action="toggle-nwog" ${disabled}>Show/Hide This Week NWOG</button>
      </details>
      <details class="pda-menu-section">
        <summary>Clear</summary>
        <button class="pda-menu-item" data-pda-action="clear">Clear PDA</button>
      </details>
    </div>
  `;
}
