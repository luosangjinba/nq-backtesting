import { CALENDAR_OBJECT_TYPES } from '../../calendar/calendar-types.js';
import { getEconomicCalendarFilters } from '../../economic-calendar/economic-calendar-store.js';
import {
  compactUtcTime,
} from '../../utils.js';
import { getCalendarVisibilitySummaryForItems } from './calendar-visibility-actions.js';
import {
  getLiveRecordAllowedNextStatuses,
  getLiveRecordStatusLabel,
  isLiveRecordOpenStatus,
  needsLiveRecordReview,
} from '../../live-record/live-record-lifecycle.js';
import { escapeHtml } from './render-utils.js';
import {
  buildCalendarPanelData,
  getDefaultCalendarDate as getDefaultCalendarDateFromData,
} from './calendar/calendar-panel-data.js';
import { renderCalendarPanelView } from './calendar/calendar-panel-view.js';
import {
  getCalendarDateTimestamp,
  getNextCalendarViewDate as getNextCalendarViewDateFromDailyTime,
} from './calendar/calendar-daily-time-summary.js';
import {
  getEconomicImpactClass,
  getEconomicImpactLabel,
} from './calendar/calendar-day-groups.js';

export { getCalendarDateTimestamp };

function compactTime(timestamp) {
  return compactUtcTime(timestamp, '--:--');
}

function getObjectTimeLabel(item) {
  if (item.type === CALENDAR_OBJECT_TYPES.CHART_NOTE && item.source?.kind === 'range') {
    return [
      compactTime(item.source.startTimestamp || item.timestamp),
      compactTime(item.source.endTimestamp || item.timestamp),
    ].join('-');
  }
  return compactTime(item.timestamp);
}

function getObjectTypeLabel(item) {
  if (item.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP) return 'Setup';
  if (item.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD) return 'Live';
  if (item.type === CALENDAR_OBJECT_TYPES.TIME_REACTION) return 'Time';
  if (item.type === CALENDAR_OBJECT_TYPES.CHART_NOTE) return 'Note';
  if (item.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT) return 'Econ';
  if (item.type === CALENDAR_OBJECT_TYPES.SMT) return 'SMT';
  if (item.type === CALENDAR_OBJECT_TYPES.PDA) return 'PDA';
  if (item.type === CALENDAR_OBJECT_TYPES.SEGMENT) return 'Seg';
  if (item.type === CALENDAR_OBJECT_TYPES.COMPOSITE) return 'Comp';
  if (item.type === CALENDAR_OBJECT_TYPES.KILLZONE) return item.ref?.type === CALENDAR_OBJECT_TYPES.TIME_LINE ? 'Time' : 'KZ';
  return 'Obj';
}

function canToggleObjectVisibility(item) {
  return [
    CALENDAR_OBJECT_TYPES.SMT,
    CALENDAR_OBJECT_TYPES.CHART_NOTE,
    CALENDAR_OBJECT_TYPES.PDA,
    CALENDAR_OBJECT_TYPES.SEGMENT,
    CALENDAR_OBJECT_TYPES.COMPOSITE,
    CALENDAR_OBJECT_TYPES.KILLZONE,
    CALENDAR_OBJECT_TYPES.TIME_LINE,
  ].includes(item.ref?.type);
}

function isCalendarObjectHidden(item) {
  if (item.ref?.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD) {
    return Boolean(item.source?.liveRecord?.display?.hidden || item.source?.display?.hidden);
  }
  if (item.ref?.type === CALENDAR_OBJECT_TYPES.KILLZONE || item.ref?.type === CALENDAR_OBJECT_TYPES.TIME_LINE) {
    return item.source?.enabled === false;
  }
  return Boolean(item.source?.display?.hidden);
}

function renderObjectActionButtons(item) {
  const canLocate = Number.isFinite(item.range?.start) && Number.isFinite(item.range?.end);
  const canOpen = ['order-setup', 'live-record', 'time-reaction', 'economic-event', 'pda', 'segment', 'composite', 'smt'].includes(item.ref?.type);
  const canToggleSetup = item.ref?.type === 'order-setup' && item.ref?.id;
  const canManageLiveRecord = item.ref?.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD && item.ref?.id;
  const canDeletePda = item.ref?.type === 'pda' && item.ref?.id;
  const setupHidden = Boolean(item.source?.display?.hidden);
  const liveRecord = item.source?.liveRecord || item.source;
  const liveHidden = Boolean(liveRecord?.display?.hidden);
  const liveLinked = Boolean(liveRecord?.orderSetupId);
  const typeLabel = getObjectTypeLabel(item);
  const locateLabel = item.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT
    ? `${item.source?.title || 'Economic Event'} · ${item.source?.displayTime || '09:30'}`
    : `${typeLabel} ${item.label}`;
  const getLiveStatusActionLabel = (status) => {
    if (status === 'active') return 'Reopen';
    if (status === 'reviewed') return 'Mark Reviewed';
    return getLiveRecordStatusLabel(status);
  };
  const liveStatusButtons = canManageLiveRecord
    ? getLiveRecordAllowedNextStatuses(liveRecord?.status).map((status) => `
        <button
          class="inspector-mini-btn calendar-object-open"
          data-inspector-action="live-record-status"
          data-live-record-id="${escapeHtml(item.ref.id)}"
          data-live-record-status="${escapeHtml(status)}"
          type="button"
        >${escapeHtml(getLiveStatusActionLabel(status))}</button>
      `).join('')
    : '';
  return `
    <button
      class="inspector-mini-btn calendar-object-locate"
      data-inspector-action="calendar-object-locate"
      data-locate-start="${canLocate ? item.range.start : ''}"
      data-locate-end="${canLocate ? item.range.end : ''}"
      data-object-label="${escapeHtml(locateLabel)}"
      data-object-type="${escapeHtml(item.ref?.type || '')}"
      data-object-id="${escapeHtml(item.ref?.id || '')}"
      type="button"
      ${canLocate ? '' : 'disabled'}
    >Locate</button>
    ${
      canOpen
        ? `<button
            class="inspector-mini-btn calendar-object-open"
            data-inspector-action="calendar-object-open"
            data-object-type="${escapeHtml(item.ref.type)}"
            data-object-id="${escapeHtml(item.ref.id)}"
            data-time-reaction-section="${escapeHtml(item.ref.section || '')}"
            type="button"
          >Open</button>`
        : ''
    }
    ${
      canDeletePda
        ? `<button
            class="inspector-mini-btn calendar-pda-delete"
            data-inspector-action="calendar-pda-delete"
            data-object-id="${escapeHtml(item.ref.id)}"
            type="button"
            title="Delete PDA"
            aria-label="Delete PDA"
          >X</button>`
        : ''
    }
    ${
      canToggleSetup
        ? `<button
            class="inspector-mini-btn calendar-object-open"
            data-inspector-action="order-review-toggle-hidden"
            data-order-review-id="${escapeHtml(item.ref.id)}"
            type="button"
          >${setupHidden ? 'Show' : 'Hide'}</button>`
        : ''
    }
    ${
      canToggleSetup
        ? `<button
            class="inspector-mini-btn calendar-object-open calendar-object-delete"
            data-inspector-action="order-review-delete"
            data-order-review-id="${escapeHtml(item.ref.id)}"
            type="button"
          >Delete</button>`
        : ''
    }
    ${
      canManageLiveRecord
        ? `<button
            class="inspector-mini-btn calendar-object-open"
            data-inspector-action="live-record-set-active"
            data-live-record-id="${escapeHtml(item.ref.id)}"
            type="button"
          >Set Active</button>`
        : ''
    }
    ${liveStatusButtons}
    ${
      canManageLiveRecord
        ? `<button
            class="inspector-mini-btn calendar-object-open"
            data-inspector-action="live-record-toggle-hidden"
            data-live-record-id="${escapeHtml(item.ref.id)}"
            type="button"
          >${liveHidden ? 'Show' : 'Hide'}</button>`
        : ''
    }
    ${
      canManageLiveRecord
        ? `<button
            class="inspector-mini-btn calendar-object-open"
            data-inspector-action="${liveLinked ? 'live-record-unlink-setup' : 'live-record-link-active-setup'}"
            data-live-record-id="${escapeHtml(item.ref.id)}"
            type="button"
          >${liveLinked ? 'Unlink Setup' : 'Link Active Setup'}</button>`
        : ''
    }
    ${
      canManageLiveRecord
        ? `<button
            class="inspector-mini-btn calendar-object-open calendar-object-delete"
            data-inspector-action="live-record-delete"
            data-live-record-id="${escapeHtml(item.ref.id)}"
            type="button"
          >Delete</button>`
        : ''
    }
  `;
}

function renderObjectActions(item) {
  const actionButtons = renderObjectActionButtons(item);
  if (!actionButtons.trim()) return '';
  return `
    <details class="calendar-object-menu">
      <summary class="calendar-object-menu-trigger" aria-label="Calendar object actions">...</summary>
      <div class="calendar-object-menu-panel">${actionButtons}</div>
    </details>
  `;
}

function renderSetupVisibilityToggle(item) {
  if (item.ref?.type !== 'order-setup' || !item.ref?.id) return '';
  const hidden = Boolean(item.source?.display?.hidden);
  const label = hidden ? 'Hidden setup. Click to show.' : 'Visible setup. Click to hide.';
  return `
    <button
      class="calendar-setup-visibility ${hidden ? 'is-hidden' : 'is-visible'}"
      data-inspector-action="order-review-toggle-hidden"
      data-order-review-id="${escapeHtml(item.ref.id)}"
      aria-label="${label}"
      title="${label}"
      type="button"
    ></button>
  `;
}

function renderLiveRecordStatusDot(item) {
  if (item.ref?.type !== CALENDAR_OBJECT_TYPES.LIVE_RECORD || !item.ref?.id) return '';
  const hidden = Boolean(item.source?.liveRecord?.display?.hidden || item.source?.display?.hidden);
  const label = hidden ? 'Hidden live record. Click to show.' : 'Visible live record. Click to hide.';
  return `
    <button
      class="calendar-setup-visibility ${hidden ? 'is-hidden' : 'is-visible'}"
      data-inspector-action="live-record-toggle-hidden"
      data-live-record-id="${escapeHtml(item.ref.id)}"
      aria-label="${label}"
      title="${label}"
      type="button"
    ></button>
  `;
}

function renderObjectVisibilityToggle(item) {
  if (!canToggleObjectVisibility(item) || !item.ref?.id) return '';
  const hidden = isCalendarObjectHidden(item);
  const label = hidden ? 'Hidden object. Click to show.' : 'Visible object. Click to hide.';
  return `
    <button
      class="calendar-object-visibility ${hidden ? 'is-hidden' : 'is-visible'}"
      data-inspector-action="calendar-object-toggle-hidden"
      data-object-type="${escapeHtml(item.ref.type)}"
      data-object-id="${escapeHtml(item.ref.id)}"
      aria-label="${label}"
      title="${label}"
      type="button"
    ></button>
  `;
}

function renderEconomicEventRow(item) {
  const event = item.source || {};
  const impactLabel = getEconomicImpactLabel(event);
  const dotClass = getEconomicImpactClass(event);
  const timeLabel = event.allDay ? 'All Day' : event.displayTime || compactTime(item.timestamp);
  return `
    <div class="calendar-object-row calendar-economic-row">
      <div class="calendar-economic-main">
        <span class="calendar-economic-dot ${escapeHtml(dotClass)}" title="${escapeHtml(impactLabel)}"></span>
        <span class="calendar-economic-time">${escapeHtml(timeLabel)}</span>
        <span class="calendar-economic-impact">${escapeHtml(impactLabel)}</span>
        <span class="calendar-economic-currency">${escapeHtml(event.currency || 'USD')}</span>
        <span class="calendar-economic-title">${escapeHtml(event.title || item.label)}</span>
      </div>
      ${renderObjectActions(item)}
    </div>
  `;
}

function renderObjectRow(item) {
  if (item.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT) return renderEconomicEventRow(item);
  const isTimeReaction = item.ref?.type === 'time-reaction';
  const timeLabel = getObjectTimeLabel(item);
  const typeLabel = getObjectTypeLabel(item);
  const showTypeLabel = item.ref?.type !== 'pda';
  const isOrderSetup = item.ref?.type === 'order-setup';
  const isLiveRecord = item.ref?.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD;
  const isHidden = isCalendarObjectHidden(item);
  const chartNoteGuidesToggle = item.ref?.type === CALENDAR_OBJECT_TYPES.CHART_NOTE
    ? `<label class="inspector-toggle calendar-chart-note-guides">
        <input
          data-inspector-action="chart-note-toggle-guides"
          data-chart-note-id="${escapeHtml(item.ref.id)}"
          type="checkbox"
          ${item.source?.display?.showGuides ? 'checked' : ''}
        />
        <span>Guides</span>
      </label>`
    : '';
  return `
    <div class="calendar-object-row ${isOrderSetup || isLiveRecord ? 'calendar-object-row-setup' : ''}${isTimeReaction ? ' calendar-object-row-time-reaction' : ''}${isHidden ? ' is-hidden' : ''}">
      <div class="calendar-object-main">
        ${
          isTimeReaction
            ? ''
            : `<div class="calendar-object-meta">
                <span class="calendar-object-time">${escapeHtml(timeLabel)}</span>
                ${showTypeLabel ? `<span class="calendar-object-type">${escapeHtml(typeLabel)}</span>` : ''}
                ${renderSetupVisibilityToggle(item)}
                ${renderLiveRecordStatusDot(item)}
                ${renderObjectVisibilityToggle(item)}
                ${chartNoteGuidesToggle}
              </div>`
        }
        <span class="calendar-object-summary" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
      </div>
      ${renderObjectActions(item)}
    </div>
  `;
}

function renderObjectGroup(group, options = {}) {
  const isEconomicGroup = group.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT;
  const rows = group.rows.length
    ? group.rows.map(renderObjectRow).join('')
    : '<div class="calendar-object-empty">None</div>';
  const isOrderSetupGroup = group.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP;
  const isLiveRecordGroup = group.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD;
  const openGroups = options.openGroups instanceof Set ? options.openGroups : new Set(options.openGroups || []);
  const isOpen = isOrderSetupGroup || isLiveRecordGroup || openGroups.has(group.type);
  const countLabel = `${group.rows.length}`;
  const visibilityControl = renderGroupVisibilityControl(group, options.activeDate || '');
  const liveReviewSummary = isLiveRecordGroup ? renderLiveRecordReviewSummary(group.rows) : '';
  return `
    <details class="calendar-object-group" data-calendar-group-type="${escapeHtml(group.type)}" ${isOpen ? 'open' : ''}>
      <summary class="calendar-object-title">
        ${visibilityControl}
        <span>${escapeHtml(group.label)}</span>
        <span class="calendar-object-count">${escapeHtml(countLabel)}</span>
      </summary>
      <div class="calendar-object-group-body">
        ${isEconomicGroup ? renderEconomicCalendarFilters() : ''}
        ${liveReviewSummary}
        ${rows}
      </div>
    </details>
  `;
}

function renderLiveRecordReviewSummary(rows = []) {
  if (!rows.length) return '';
  const counts = rows.reduce((acc, row) => {
    const record = row.source?.liveRecord || row.source || {};
    if (record.status === 'reviewed') acc.reviewed += 1;
    else if (needsLiveRecordReview(record)) acc.needsReview += 1;
    else if (record.status === 'cancelled') acc.cancelled += 1;
    else if (isLiveRecordOpenStatus(record.status)) acc.open += 1;
    return acc;
  }, { open: 0, needsReview: 0, reviewed: 0, cancelled: 0 });
  return `
    <div class="calendar-live-review-summary">
      <span>Open ${counts.open}</span>
      <span>Needs Review ${counts.needsReview}</span>
      <span>Reviewed ${counts.reviewed}</span>
      <span>Cancelled ${counts.cancelled}</span>
    </div>
  `;
}

function isVisibilityControlGroup(type) {
  return [
    CALENDAR_OBJECT_TYPES.SMT,
    CALENDAR_OBJECT_TYPES.CHART_NOTE,
    CALENDAR_OBJECT_TYPES.PDA,
    CALENDAR_OBJECT_TYPES.SEGMENT,
    CALENDAR_OBJECT_TYPES.COMPOSITE,
    CALENDAR_OBJECT_TYPES.KILLZONE,
  ].includes(type);
}

function renderGroupVisibilityControl(group, activeDate) {
  if (!isVisibilityControlGroup(group.type)) return '<span class="calendar-object-visibility-spacer"></span>';
  const summary = getCalendarVisibilitySummaryForItems(group.rows);
  const checked = summary.state === 'checked';
  const disabled = summary.state === 'disabled';
  const title = disabled
    ? 'No chart objects for this day'
    : `Visible ${summary.visible}/${summary.total}`;
  return `
    <input
      class="calendar-object-visibility-toggle"
      data-inspector-action="calendar-day-group-toggle-hidden"
      data-calendar-visibility-toggle
      data-visibility-state="${escapeHtml(summary.state)}"
      data-calendar-group-type="${escapeHtml(group.type)}"
      data-calendar-date="${escapeHtml(activeDate)}"
      type="checkbox"
      title="${escapeHtml(title)}"
      ${checked ? 'checked' : ''}
      ${disabled ? 'disabled' : ''}
    />
  `;
}

export function hydrateCalendarVisibilityControls(root = document) {
  root.querySelectorAll('[data-calendar-visibility-toggle]').forEach((input) => {
    input.indeterminate = input.dataset.visibilityState === 'mixed';
  });
}

function renderEconomicCalendarFilters() {
  const filters = getEconomicCalendarFilters();
  const items = [
    ['high', 'H'],
    ['medium', 'M'],
    ['low', 'L'],
    ['holiday', 'Holiday'],
  ];
  return `
    <div class="calendar-economic-filters" aria-label="Economic calendar filters">
      ${items.map(([key, label]) => `
        <label class="calendar-economic-filter ${filters[key] ? 'is-active' : ''}">
          <input
            type="checkbox"
            data-inspector-action="economic-calendar-filter"
            data-economic-filter="${escapeHtml(key)}"
            ${filters[key] ? 'checked' : ''}
          />
          <span class="calendar-economic-dot economic-${escapeHtml(key === 'holiday' ? 'holiday' : key)}"></span>
          <span>${escapeHtml(label)}</span>
        </label>
      `).join('')}
    </div>
  `;
}

export function getDefaultCalendarDate() {
  return getDefaultCalendarDateFromData();
}

export function renderCalendarPanel({ selectedDate = '', viewDate = '', openGroups = [] } = {}) {
  return renderCalendarPanelView(
    buildCalendarPanelData({ selectedDate, viewDate, openGroups }),
    { renderObjectGroup }
  );
}

export function getNextCalendarViewDate(currentViewDate, direction) {
  return getNextCalendarViewDateFromDailyTime(currentViewDate, direction);
}
