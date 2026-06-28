import { escapeHtml, section } from '../render-utils.js';

const WEEKDAYS = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const MONTHS = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

function renderCalendarDayOverview(overview) {
  if (!overview.indicators.length) return '';
  const dots = overview.indicators
    .map(
      (indicator) =>
        `<span class="calendar-object-dot ${escapeHtml(indicator.className)}" title="${escapeHtml(`${indicator.label}: ${indicator.count}`)}"></span>`
    )
    .join('');
  return `
    <span class="calendar-day-overview" aria-label="${escapeHtml(`${overview.indicators.length} calendar event markers`)}">
      <span class="calendar-object-dots">${dots}</span>
    </span>
  `;
}

function getCalendarDayTitle(dateKey, overview) {
  if (!overview.total) return dateKey;
  const parts = [];
  if (overview.setupCount) parts.push(`Order Setups: ${overview.setupCount}`);
  if (overview.liveRecordCount) parts.push(`Live Records: ${overview.liveRecordCount}`);
  overview.indicators.forEach((indicator) => {
    parts.push(`${indicator.label}: ${indicator.count}`);
  });
  return `${dateKey} · ${parts.join(' · ')}`;
}

function renderDailyRegimeSummary(summaryText) {
  return `
    <div class="calendar-daily-regime" title="${escapeHtml(summaryText)}">
      <span class="calendar-daily-regime-label">${escapeHtml(summaryText)}</span>
    </div>
  `;
}

export function renderCalendarPanelView(data, { renderObjectGroup }) {
  if (!data?.hasData) {
    return section('Calendar', '<div class="inspector-empty">Load chart data to show calendar.</div>');
  }

  const {
    range,
    activeDate,
    activeViewDate,
    parsedViewDate,
    cells,
    openGroups,
    objectGroups,
    overlaySelectedDate,
    overlayFilterLabel,
    dayChartObjectCount,
    dailyRegimeSummary,
  } = data;
  const title = parsedViewDate ? `${MONTHS[parsedViewDate.monthIndex]} ${parsedViewDate.year}` : 'Calendar';

  const calendarHtml = `
    <div class="inspector-calendar" data-calendar-selected="${escapeHtml(activeDate)}" data-calendar-view="${escapeHtml(activeViewDate)}">
      <div class="inspector-calendar-range">${escapeHtml(range.start)} - ${escapeHtml(range.end)}</div>
      <div class="inspector-calendar-header">
        <button class="inspector-mini-btn" data-inspector-action="calendar-prev-month" type="button">&lt;</button>
        <div class="inspector-calendar-title">${escapeHtml(title)}</div>
        <button class="inspector-mini-btn" data-inspector-action="calendar-next-month" type="button">&gt;</button>
      </div>
      <div class="inspector-calendar-weekdays">
        ${WEEKDAYS.map((day) => `<div>${day}</div>`).join('')}
      </div>
      <div class="inspector-calendar-grid">
        ${cells
          .map((cell) => {
            if (cell.empty) return '<div class="inspector-calendar-day empty"></div>';
            const classes = ['inspector-calendar-day'];
            if (!cell.inRange) classes.push('disabled');
            if (cell.dateKey === activeDate) classes.push('selected');
            const overview = cell.overview;
            const hasOrderSetup = overview.setupCount > 0;
            const hasLiveRecord = overview.liveRecordCount > 0;
            if (hasOrderSetup) classes.push('has-order-setup');
            if (hasLiveRecord) classes.push('has-live-record');
            if (overview.total) classes.push('has-calendar-objects');
            return `
              <button class="${classes.join(' ')}" data-inspector-action="calendar-select-date" data-calendar-date="${cell.dateKey}" type="button" title="${escapeHtml(getCalendarDayTitle(cell.dateKey, overview))}" ${cell.inRange ? '' : 'disabled'}>
                <span class="calendar-day-number">${cell.day}</span>
                ${hasOrderSetup ? '<span class="calendar-order-badge" aria-label="Order Setup"></span>' : ''}
                ${hasLiveRecord ? '<span class="calendar-live-badge" aria-label="Live Record"></span>' : ''}
                ${renderCalendarDayOverview(overview)}
              </button>
            `;
          })
          .join('')}
      </div>
      <div class="inspector-calendar-selected">
        <span>Selected: ${escapeHtml(activeDate)} 09:30</span>
        <span class="inspector-calendar-overlay-state">${escapeHtml(overlayFilterLabel)}</span>
        ${
          overlaySelectedDate
            ? `<button class="inspector-mini-btn" data-inspector-action="calendar-show-all-days" type="button">All loaded days</button>`
            : ''
        }
      </div>
      ${renderDailyRegimeSummary(dailyRegimeSummary)}
      <div class="calendar-day-visibility-actions">
        <button
          class="inspector-mini-btn"
          data-inspector-action="calendar-day-show-chart-objects"
          data-calendar-date="${escapeHtml(activeDate)}"
          type="button"
          ${dayChartObjectCount ? '' : 'disabled'}
        >Show Day Objects${dayChartObjectCount ? ` (${dayChartObjectCount})` : ''}</button>
        <button
          class="inspector-mini-btn"
          data-inspector-action="calendar-day-hide-chart-objects"
          data-calendar-date="${escapeHtml(activeDate)}"
          type="button"
          ${dayChartObjectCount ? '' : 'disabled'}
        >Hide Day Objects${dayChartObjectCount ? ` (${dayChartObjectCount})` : ''}</button>
      </div>
      <div class="calendar-object-list">
        ${objectGroups.map((group) => renderObjectGroup(group, { activeDate, openGroups })).join('')}
      </div>
    </div>
  `;

  return section('Calendar', calendarHtml);
}
