import { renderArchiveActions } from './archive-panel.js';
import {
  renderEntryContextCatalogEntry,
  renderEntryContextCatalogPanel,
} from './entry-context-catalog-panel.js';
import { renderAnnotationPanel } from './pda-panel.js';
import { renderSegmentPanel } from './segment-panel.js';
import { renderSegmentGroupPanel } from './segment-group-panel.js';
import { renderSmtPanel } from './smt-panel.js';
import { renderOrderReviewDetailPanel } from './order-review-panel.js';
import { renderLiveRecordDetailPanel } from './live-record-panel.js';
import {
  renderDailyTimeReviewPanel,
  renderDailyTimeReviewSectionPanel,
} from './time-reaction-panel.js';
import { renderEconomicEventDetailPanel } from './economic-event-panel.js';
import { renderCalendarPanel } from './calendar-panel.js';

export function renderAnnotationDetail(annotation, { backActionHtml }) {
  return `
    ${backActionHtml}
    ${renderAnnotationPanel(annotation, renderArchiveActions())}
  `;
}

export function renderSegmentDetail(segment, { backActionHtml }) {
  return `
    ${backActionHtml}
    ${renderSegmentPanel(segment)}
  `;
}

export function renderSegmentGroupDetail(segmentGroup, { backActionHtml }) {
  return `
    ${backActionHtml}
    ${renderSegmentGroupPanel(segmentGroup)}
  `;
}

export function renderSmtDetail(records, { backActionHtml, selectedSmtId }) {
  return `
    ${backActionHtml}
    ${renderSmtPanel(records, { selectedSmtId })}
  `;
}

export function renderOrderSetupDetail(order, options = {}) {
  return `
    ${options.backActionHtml}
    ${renderOrderReviewDetailPanel(order, options.orderReviewPanelOptions || {})}
  `;
}

export function renderLiveRecordDetail(record, options = {}) {
  return `
    ${options.backActionHtml}
    ${renderLiveRecordDetailPanel(record, {
      pendingReasonRefPick: options.pendingReasonRefPick,
    })}
  `;
}

export function renderDailyTimeReviewDetail(review, options = {}) {
  const body = options.sectionKey
    ? renderDailyTimeReviewSectionPanel(review, options.sectionKey, {
        pendingRefPick: options.pendingRefPick,
        pendingReasonRefPick: options.pendingReasonRefPick,
      })
    : renderDailyTimeReviewPanel(review, {
        pendingRefPick: options.pendingRefPick,
        pendingReasonRefPick: options.pendingReasonRefPick,
      });
  return `
    ${options.backActionHtml}
    ${body}
  `;
}

export function renderEconomicEventDetail(event, { backActionHtml }) {
  return `
    ${backActionHtml}
    ${renderEconomicEventDetailPanel(event)}
  `;
}

export function renderEntryContextCatalogMaintenance({ backActionHtml }) {
  return `
    ${backActionHtml}
    ${renderEntryContextCatalogPanel()}
  `;
}

export function renderInspectorHome({ selectedDate, viewDate, openGroups }) {
  return `
    ${renderCalendarPanel({ selectedDate, viewDate, openGroups })}
    ${renderEntryContextCatalogEntry()}
    ${renderArchiveActions()}
  `;
}
