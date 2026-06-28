import { timeframeToString } from '../../config.js';

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderRangeHistory({ history, formatHistoryItemLabel }) {
  const content = history.length
    ? history
        .map((item, index) => {
          const label = formatHistoryItemLabel(item);
          const tfLabel = item.timeframe ? timeframeToString(item.timeframe) : 'TF';
          return `
            <div class="toolbar-calendar-history-row">
              <button
                class="toolbar-calendar-history-load"
                data-calendar-action="load-history"
                data-history-index="${index}"
                type="button"
                title="Load ${escapeHtml(tfLabel)} ${escapeHtml(label)}"
              >
                <span class="toolbar-calendar-history-range">${escapeHtml(label)}</span>
                <span class="toolbar-calendar-history-tf">${escapeHtml(tfLabel)}</span>
              </button>
              <button
                class="toolbar-calendar-history-remove"
                data-calendar-action="remove-history"
                data-history-index="${index}"
                type="button"
                title="Remove history range"
              >X</button>
            </div>
          `;
        })
        .join('')
    : '<div class="toolbar-calendar-history-empty">No history ranges</div>';

  return `
    <details class="toolbar-calendar-history" open>
      <summary>History ranges</summary>
      <div class="toolbar-calendar-history-list">
        ${content}
      </div>
      ${
        history.length
          ? '<button class="toolbar-calendar-history-clear" data-calendar-action="clear-history" type="button">Clear history</button>'
          : ''
      }
    </details>
  `;
}

export function renderMonth({ dateKey, parseDateKey, getMonthCells, getCellClasses }) {
  const parsed = parseDateKey(dateKey);
  const title = parsed ? `${MONTHS[parsed.monthIndex]} ${parsed.year}` : 'Calendar';
  const cells = getMonthCells(dateKey);
  return `
    <div class="toolbar-calendar-month">
      <div class="toolbar-calendar-title">${title}</div>
      <div class="toolbar-calendar-weekdays">
        ${WEEKDAYS.map((day) => `<div>${day}</div>`).join('')}
      </div>
      <div class="toolbar-calendar-grid">
        ${cells
          .map((cell) => {
            if (cell.empty) return '<div class="toolbar-calendar-day empty"></div>';
            return `
              <button class="${getCellClasses(cell.dateKey).join(' ')}" data-calendar-action="select" data-date="${cell.dateKey}" type="button">
                ${cell.day}
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function renderCalendarPopover({
  viewDateKey,
  nextMonth,
  selectedLabel,
  canLoadRange,
  history,
  formatHistoryItemLabel,
  parseDateKey,
  getMonthCells,
  getCellClasses,
}) {
  return `
    <div class="toolbar-calendar-header range-header">
      <button class="toolbar-calendar-nav" data-calendar-action="prev-year" type="button" title="Previous year">&lt;&lt;</button>
      <button class="toolbar-calendar-nav" data-calendar-action="prev" type="button" title="Previous month">&lt;</button>
      <div class="toolbar-calendar-heading">
        <div class="toolbar-calendar-heading-title">Date Range</div>
        <div class="toolbar-calendar-heading-subtitle">${selectedLabel}</div>
      </div>
      <button class="toolbar-calendar-nav" data-calendar-action="next" type="button" title="Next month">&gt;</button>
      <button class="toolbar-calendar-nav" data-calendar-action="next-year" type="button" title="Next year">&gt;&gt;</button>
    </div>
    <div class="toolbar-calendar-months">
      ${renderMonth({ dateKey: viewDateKey, parseDateKey, getMonthCells, getCellClasses })}
      ${renderMonth({ dateKey: nextMonth, parseDateKey, getMonthCells, getCellClasses })}
    </div>
    <div class="toolbar-calendar-actions">
      <button class="toolbar-calendar-action" data-calendar-action="load-range" type="button" ${canLoadRange ? '' : 'disabled'}>Load Range</button>
      <button class="toolbar-calendar-action" data-calendar-action="load-week" type="button">Load Week</button>
      <button class="toolbar-calendar-action" data-calendar-action="jump-day" type="button">Jump 09:30</button>
      <button class="toolbar-calendar-action secondary" data-calendar-action="clear-range" type="button">Clear</button>
    </div>
    ${renderRangeHistory({ history, formatHistoryItemLabel })}
    <details class="toolbar-calendar-manual">
      <summary>Manual time range</summary>
      <div class="toolbar-calendar-manual-grid">
        <label>
          <span>Start</span>
          <input id="dateRangeManualStart" class="toolbar-input toolbar-calendar-input" type="text" placeholder="YYYY-MM-DD HH:mm" />
        </label>
        <label>
          <span>End</span>
          <input id="dateRangeManualEnd" class="toolbar-input toolbar-calendar-input" type="text" placeholder="YYYY-MM-DD HH:mm" />
        </label>
        <button class="toolbar-calendar-action" data-calendar-action="load-manual" type="button">Load Manual</button>
      </div>
    </details>
  `;
}
