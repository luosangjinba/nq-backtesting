import {
  DEFAULT_JOURNAL_ACCOUNT_ID,
  getJournalDay,
  updateJournalDay,
} from './journal-store.js';
import * as bus from '../event-bus.js';
import { setActiveReviewSet } from '../order/order-review-active.js';
import { setActiveWorkspace } from '../ui/app-shell.js';
import { getJournalExecutions } from './journal-execution-adapter.js';
import { getJournalExecutionDisplayModels } from './journal-execution-setup-summary.js';
import { getJournalSetupLinkCandidates } from './journal-setup-link-candidates.js';
import { restoreJournalDays, saveJournalDays } from './journal-persistence.js';

const WORKSPACE_ID = 'journal-page';
const ACCOUNT_STORAGE_KEY = 'v4:journal-active-account';
const DATE_STORAGE_KEY = 'v4:journal-active-date';
const DAY_MODE_OPTIONS = [
  ['real_money', 'Real Money'],
  ['simulation', 'Simulation'],
  ['review_only', 'Review Only'],
  ['mixed', 'Mixed'],
  ['no_trade', 'No Trade'],
];
const TRADE_TYPE_OPTIONS = [
  ['real_money', 'Real Money'],
  ['simulation', 'Simulation'],
];
const DIRECTION_OPTIONS = [
  ['unknown', 'Unknown'],
  ['long', 'Long'],
  ['short', 'Short'],
  ['both', 'Both'],
  ['none', 'None'],
];
const TIMING_OPTIONS = [
  ['unknown', 'Unknown'],
  ['good', 'Good'],
  ['early', 'Early'],
  ['late', 'Late'],
  ['unnecessary', 'Unnecessary'],
  ['missed_better_entry', 'Missed Better Entry'],
];
const FOLLOWED_PLAN_OPTIONS = [
  ['not_planned', 'Not Planned'],
  ['yes', 'Yes'],
  ['partial', 'Partial'],
  ['no', 'No'],
];
const FILL_TYPE_OPTIONS = [
  ['entry', 'Entry'],
  ['add', 'Add'],
  ['partial_exit', 'Partial Exit'],
  ['final_exit', 'Final Exit'],
  ['stop_exit', 'Stop Exit'],
  ['manual_exit', 'Manual Exit'],
];

let activeAccountId = DEFAULT_JOURNAL_ACCOUNT_ID;
let activeDate = '';
let initialized = false;
let saveTimers = new Map();
let expandedTradeId = '';

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAccountId(value) {
  const text = String(value ?? '').trim();
  return text || DEFAULT_JOURNAL_ACCOUNT_ID;
}

function normalizeDate(value) {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : todayDateKey();
}

function shiftDate(date, deltaDays) {
  const [year, month, day] = normalizeDate(date).split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return nextDate.toISOString().slice(0, 10);
}

function setActiveDate(date) {
  activeDate = normalizeDate(date);
  expandedTradeId = '';
  writeLocalValue(DATE_STORAGE_KEY, activeDate);
  renderJournalWorkspace();
}

function readLocalValue(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeLocalValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore unavailable storage; runtime state remains valid.
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getActiveJournalDay() {
  return getJournalDay(activeAccountId, activeDate) || {
    accountId: activeAccountId,
    date: activeDate,
    accountType: 'real',
    dayMode: 'review_only',
    preMarketPlan: '',
    sessionIntent: '',
    mentalStateBefore: '',
    intradayStateNotes: '',
    postMarketSummary: '',
    disciplineSummary: '',
    mainMistake: '',
    bestBehavior: '',
    nextSessionFocus: '',
  };
}

function scheduleFieldUpdate(field, value) {
  const accountId = activeAccountId;
  const date = activeDate;
  const key = `${accountId}|${date}|${field}`;
  clearTimeout(saveTimers.get(key));
  saveTimers.set(key, setTimeout(() => {
    updateJournalDay(accountId, date, { [field]: value });
    saveTimers.delete(key);
  }, 180));
}

function updateDayMode(value) {
  updateJournalDay(activeAccountId, activeDate, { dayMode: value });
}

function getLiveTrades() {
  const day = getActiveJournalDay();
  return Array.isArray(day.liveTrades) ? day.liveTrades : [];
}

function setLiveTrades(liveTrades) {
  updateJournalDay(activeAccountId, activeDate, { liveTrades });
}

function createTrade() {
  const id = `journal_trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nextTrade = {
    id,
    date: activeDate,
    accountId: activeAccountId,
    instrument: 'NQ',
    tradeType: 'real_money',
    direction: 'unknown',
    timingAssessment: 'unknown',
    followedPlan: 'not_planned',
    fills: [],
    result: '',
    netPnl: null,
    rMultipleManual: null,
    reflection: '',
  };
  setLiveTrades([...getLiveTrades(), nextTrade]);
  expandedTradeId = id;
  renderJournalWorkspace();
}

function updateTrade(tradeId, patch = {}) {
  const nextTrades = getLiveTrades().map((trade) => (
    trade.id === tradeId ? { ...trade, ...patch } : trade
  ));
  setLiveTrades(nextTrades);
}

function getTrade(tradeId) {
  return getLiveTrades().find((trade) => trade.id === tradeId) || null;
}

function scheduleTradeFieldUpdate(tradeId, field, value) {
  const accountId = activeAccountId;
  const date = activeDate;
  const key = `${accountId}|${date}|${tradeId}|${field}`;
  clearTimeout(saveTimers.get(key));
  saveTimers.set(key, setTimeout(() => {
    const day = getJournalDay(accountId, date);
    const liveTrades = Array.isArray(day?.liveTrades) ? day.liveTrades : [];
    updateJournalDay(accountId, date, {
      liveTrades: liveTrades.map((trade) => (trade.id === tradeId ? { ...trade, [field]: value } : trade)),
    });
    saveTimers.delete(key);
  }, 180));
}

function addFill(tradeId) {
  const trade = getTrade(tradeId);
  if (!trade) return;
  const nextFill = {
    id: `journal_fill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'entry',
    time: '',
    price: null,
    quantity: null,
    reason: '',
  };
  updateTrade(tradeId, {
    fills: [...(Array.isArray(trade.fills) ? trade.fills : []), nextFill],
  });
  renderJournalWorkspace();
}

function updateFill(tradeId, fillId, patch = {}) {
  const trade = getTrade(tradeId);
  if (!trade) return;
  updateTrade(tradeId, {
    fills: (Array.isArray(trade.fills) ? trade.fills : []).map((fill) => (
      fill.id === fillId ? { ...fill, ...patch } : fill
    )),
  });
}

function deleteFill(tradeId, fillId) {
  const trade = getTrade(tradeId);
  if (!trade) return;
  updateTrade(tradeId, {
    fills: (Array.isArray(trade.fills) ? trade.fills : []).filter((fill) => fill.id !== fillId),
  });
  renderJournalWorkspace();
}

function scheduleFillFieldUpdate(tradeId, fillId, field, value) {
  const accountId = activeAccountId;
  const date = activeDate;
  const key = `${accountId}|${date}|${tradeId}|${fillId}|${field}`;
  clearTimeout(saveTimers.get(key));
  saveTimers.set(key, setTimeout(() => {
    const day = getJournalDay(accountId, date);
    const liveTrades = Array.isArray(day?.liveTrades) ? day.liveTrades : [];
    updateJournalDay(accountId, date, {
      liveTrades: liveTrades.map((trade) => {
        if (trade.id !== tradeId) return trade;
        return {
          ...trade,
          fills: (Array.isArray(trade.fills) ? trade.fills : []).map((fill) => (
            fill.id === fillId ? { ...fill, [field]: value } : fill
          )),
        };
      }),
    });
    saveTimers.delete(key);
  }, 180));
}

function openOrderSetupInBacktesting(orderReviewId) {
  const active = setActiveReviewSet(orderReviewId);
  if (!active) {
    bus.emit('status:update', { text: 'Linked Order Setup not found', isError: true });
    return;
  }
  setActiveWorkspace('backtesting');
  bus.emit('status:update', { text: 'Opened linked Order Setup', isError: false });
}

function formatSummaryValue(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatLinkStatus(value) {
  if (value === 'linked') return 'Linked setup';
  if (value === 'missing-linked-setup') return 'Missing linked setup';
  return 'Unlinked execution';
}

function formatSetupTarget(setupSummary = {}) {
  const targets = Array.isArray(setupSummary.targets) ? setupSummary.targets : [];
  const target = targets.find((item) => item?.price !== undefined && item?.price !== null);
  return target ? target.price : null;
}

function renderSetupSummaryItem(label, value) {
  return `
    <span class="journal-linked-setup-item">
      <span>${label}</span>
      <strong>${escapeHtml(formatSummaryValue(value))}</strong>
    </span>
  `;
}

function getTradeDetailStatusText(linkStatus) {
  if (linkStatus === 'linked') {
    return 'Setup fields are read from Backtesting. Journal edits only execution, fills, PnL, discipline, and reflection.';
  }
  if (linkStatus === 'missing-linked-setup') {
    return 'Linked setup was not found locally. Fallback setup fields remain editable for this execution.';
  }
  return 'No setup is linked. Fallback setup fields remain editable for this execution.';
}

function renderTradeDetailStatus(displayModel = {}) {
  const linkStatus = displayModel?.linkStatus || 'unlinked';
  return `
    <div class="journal-trade-detail-status ${escapeHtml(linkStatus)}">
      <strong>${escapeHtml(formatLinkStatus(linkStatus))}</strong>
      <span>${escapeHtml(getTradeDetailStatusText(linkStatus))}</span>
    </div>
  `;
}

function formatSetupCandidateLabel(candidate = {}) {
  const matchLabel = candidate.matchDate && candidate.matchInstrument
    ? 'Best match'
    : candidate.matchDate
      ? 'Same date'
      : candidate.matchInstrument
        ? 'Same instrument'
        : 'Other setup';
  const parts = [
    matchLabel,
    candidate.date,
    candidate.instrument,
    candidate.direction,
    candidate.entryPrice !== null && candidate.entryPrice !== undefined ? `Entry ${candidate.entryPrice}` : '',
    candidate.targetPrice !== null && candidate.targetPrice !== undefined ? `Target ${candidate.targetPrice}` : '',
    candidate.result && candidate.result !== 'unknown' ? `Result ${candidate.result}` : '',
    candidate.summary,
  ].filter(Boolean);
  return parts.join(' | ') || candidate.orderReviewId || 'Order Setup';
}

function renderSetupLinkSelect(trade, displayModel = {}) {
  if (displayModel?.linkStatus === 'linked') return '';
  const candidates = getJournalSetupLinkCandidates({
    date: trade.date || activeDate,
    instrument: trade.instrument,
  });
  const currentOrderReviewId = displayModel?.orderReviewId || trade.orderReviewId || '';
  const hasCurrentCandidate = candidates.some((candidate) => candidate.orderReviewId === currentOrderReviewId);
  const currentMissingOption = currentOrderReviewId && !hasCurrentCandidate
    ? `<option value="${escapeHtml(currentOrderReviewId)}" selected>Current missing link: ${escapeHtml(currentOrderReviewId)}</option>`
    : '';
  const candidateOptions = candidates.map((candidate) => (
    `<option value="${escapeHtml(candidate.orderReviewId)}"${candidate.orderReviewId === currentOrderReviewId ? ' selected' : ''}>${escapeHtml(formatSetupCandidateLabel(candidate))}</option>`
  )).join('');
  const emptyOption = candidates.length
    ? '<option value="">No linked setup</option>'
    : '<option value="">No setup candidates available</option>';
  return `
    <label class="journal-trade-field journal-setup-link-field">
      <span>Link setup</span>
      <select data-journal-trade-id="${escapeHtml(trade.id)}" data-journal-trade-field="orderReviewId">
        ${emptyOption}
        ${currentMissingOption}
        ${candidateOptions}
      </select>
    </label>
  `;
}

function makeOptions(options, selectedValue) {
  return options.map(([value, label]) => (
    `<option value="${value}"${selectedValue === value ? ' selected' : ''}>${label}</option>`
  )).join('');
}

function makeTextarea({ id, label, value, field, size = 'long' }) {
  return `
    <label class="journal-field" for="${id}">
      <span class="journal-field-title">${label}</span>
      <textarea
        id="${id}"
        class="journal-textarea-${escapeHtml(size)}"
        data-journal-field="${field}"
      >${escapeHtml(value)}</textarea>
    </label>
  `;
}

function makeTradeField({ label, tradeId, field, value, type = 'text' }) {
  return `
    <label class="journal-trade-field">
      <span>${label}</span>
      <input
        type="${type}"
        data-journal-trade-id="${escapeHtml(tradeId)}"
        data-journal-trade-field="${escapeHtml(field)}"
        value="${escapeHtml(value ?? '')}"
      />
    </label>
  `;
}

function makeTradeSelect({ label, tradeId, field, value, options }) {
  return `
    <label class="journal-trade-field">
      <span>${label}</span>
      <select data-journal-trade-id="${escapeHtml(tradeId)}" data-journal-trade-field="${escapeHtml(field)}">
        ${makeOptions(options, value)}
      </select>
    </label>
  `;
}

function renderLinkedSetupSummary(displayModel = {}) {
  const setupSummary = displayModel.setupSummary || {};
  return `
    <div class="journal-linked-setup-summary">
      <div class="journal-linked-setup-header">
        <span>${escapeHtml(formatLinkStatus(displayModel.linkStatus))}</span>
        <strong>${escapeHtml(formatSummaryValue(setupSummary.summary, 'No setup summary'))}</strong>
      </div>
      <div class="journal-linked-setup-grid">
        ${renderSetupSummaryItem('Setup ID', displayModel.orderReviewId)}
        ${renderSetupSummaryItem('Date', setupSummary.date)}
        ${renderSetupSummaryItem('Instrument', setupSummary.instrument)}
        ${renderSetupSummaryItem('Direction', setupSummary.direction)}
        ${renderSetupSummaryItem('Entry', setupSummary.entry?.price)}
        ${renderSetupSummaryItem('Stop', setupSummary.stopLoss?.price)}
        ${renderSetupSummaryItem('Target', formatSetupTarget(setupSummary))}
        ${renderSetupSummaryItem('Result', setupSummary.result?.status)}
      </div>
      <button
        type="button"
        class="journal-action-button journal-open-setup-button"
        data-journal-open-order-setup="${escapeHtml(displayModel.orderReviewId || '')}"
      >Open in Backtesting</button>
    </div>
  `;
}

function renderFallbackSetupFields(trade) {
  return `
    ${makeTradeField({
      label: 'Instrument',
      tradeId: trade.id,
      field: 'instrument',
      value: trade.instrument,
    })}
    ${makeTradeSelect({
      label: 'Direction',
      tradeId: trade.id,
      field: 'direction',
      value: trade.direction,
      options: DIRECTION_OPTIONS,
    })}
    ${makeTradeField({
      label: 'Result',
      tradeId: trade.id,
      field: 'result',
      value: trade.result,
    })}
  `;
}

function renderTradeDetail(trade, displayModel = null) {
  const isLinked = displayModel?.linkStatus === 'linked';
  return `
    <div class="journal-trade-detail">
      ${renderTradeDetailStatus(displayModel)}
      ${isLinked ? renderLinkedSetupSummary(displayModel) : ''}
      ${renderSetupLinkSelect(trade, displayModel)}
      <div class="journal-trade-grid">
        ${makeTradeSelect({
          label: 'Trade type',
          tradeId: trade.id,
          field: 'tradeType',
          value: trade.tradeType,
          options: TRADE_TYPE_OPTIONS,
        })}
        ${isLinked ? '' : renderFallbackSetupFields(trade)}
        ${makeTradeField({
          label: 'Net PnL',
          tradeId: trade.id,
          field: 'netPnl',
          value: trade.netPnl,
          type: 'number',
        })}
        ${makeTradeField({
          label: 'Manual R',
          tradeId: trade.id,
          field: 'rMultipleManual',
          value: trade.rMultipleManual,
          type: 'number',
        })}
        ${makeTradeSelect({
          label: 'Timing',
          tradeId: trade.id,
          field: 'timingAssessment',
          value: trade.timingAssessment,
          options: TIMING_OPTIONS,
        })}
        ${makeTradeSelect({
          label: 'Followed plan',
          tradeId: trade.id,
          field: 'followedPlan',
          value: trade.followedPlan,
          options: FOLLOWED_PLAN_OPTIONS,
        })}
      </div>
      <label class="journal-trade-field journal-trade-textarea">
        <span>Reflection</span>
        <textarea data-journal-trade-id="${escapeHtml(trade.id)}" data-journal-trade-field="reflection" rows="3">${escapeHtml(trade.reflection)}</textarea>
      </label>
      ${renderFillEditor(trade)}
    </div>
  `;
}

function renderFillRow(trade, fill, index) {
  return `
    <div class="journal-fill-row">
      <span class="journal-fill-index">#${index + 1}</span>
      <label class="journal-fill-field">
        <span>Type</span>
        <select
          data-journal-trade-id="${escapeHtml(trade.id)}"
          data-journal-fill-id="${escapeHtml(fill.id)}"
          data-journal-fill-field="type"
        >
          ${makeOptions(FILL_TYPE_OPTIONS, fill.type)}
        </select>
      </label>
      <label class="journal-fill-field">
        <span>Time</span>
        <input
          type="text"
          data-journal-trade-id="${escapeHtml(trade.id)}"
          data-journal-fill-id="${escapeHtml(fill.id)}"
          data-journal-fill-field="time"
          value="${escapeHtml(fill.time)}"
        />
      </label>
      <label class="journal-fill-field">
        <span>Price</span>
        <input
          type="number"
          data-journal-trade-id="${escapeHtml(trade.id)}"
          data-journal-fill-id="${escapeHtml(fill.id)}"
          data-journal-fill-field="price"
          value="${escapeHtml(fill.price ?? '')}"
        />
      </label>
      <label class="journal-fill-field">
        <span>Qty</span>
        <input
          type="number"
          data-journal-trade-id="${escapeHtml(trade.id)}"
          data-journal-fill-id="${escapeHtml(fill.id)}"
          data-journal-fill-field="quantity"
          value="${escapeHtml(fill.quantity ?? '')}"
        />
      </label>
      <label class="journal-fill-field journal-fill-reason">
        <span>Reason</span>
        <input
          type="text"
          data-journal-trade-id="${escapeHtml(trade.id)}"
          data-journal-fill-id="${escapeHtml(fill.id)}"
          data-journal-fill-field="reason"
          value="${escapeHtml(fill.reason)}"
        />
      </label>
      <button
        type="button"
        class="journal-icon-button"
        data-journal-delete-fill="${escapeHtml(fill.id)}"
        data-journal-trade-id="${escapeHtml(trade.id)}"
        title="Delete fill"
      >x</button>
    </div>
  `;
}

function renderFillEditor(trade) {
  const fills = Array.isArray(trade.fills) ? trade.fills : [];
  const fillRows = fills.length
    ? fills.map((fill, index) => renderFillRow(trade, fill, index)).join('')
    : '<p class="journal-empty-state">No fills recorded.</p>';
  return `
    <div class="journal-fill-editor">
      <div class="journal-fill-header">
        <h3>Fills</h3>
        <button
          type="button"
          class="journal-action-button"
          data-journal-add-fill="${escapeHtml(trade.id)}"
        >Add Fill</button>
      </div>
      <div class="journal-fill-list">${fillRows}</div>
    </div>
  `;
}

function renderTradeRow(trade, displayModel = null) {
  const isExpanded = trade.id === expandedTradeId;
  const fillCount = Array.isArray(trade.fills) ? trade.fills.length : 0;
  const setupSummary = displayModel?.setupSummary || {};
  const direction = setupSummary.direction ?? trade.direction;
  const result = setupSummary.result?.status ?? trade.result;
  const entryPrice = setupSummary.entry?.price ?? null;
  const stopPrice = setupSummary.stopLoss?.price ?? null;
  const targetPrice = formatSetupTarget(setupSummary);
  return `
    <article class="journal-trade-row${isExpanded ? ' expanded' : ''}">
      <button type="button" class="journal-trade-summary" data-journal-toggle-trade="${escapeHtml(trade.id)}">
        <span class="journal-trade-pill">${escapeHtml(formatSummaryValue(trade.tradeType))}</span>
        <span>${escapeHtml(formatLinkStatus(displayModel?.linkStatus))}</span>
        <span>${escapeHtml(formatSummaryValue(setupSummary.instrument ?? trade.instrument))}</span>
        <span>${escapeHtml(formatSummaryValue(direction))}</span>
        <span>${escapeHtml(formatSummaryValue(result, 'No result'))}</span>
        <span>Entry ${escapeHtml(formatSummaryValue(entryPrice))}</span>
        <span>Stop ${escapeHtml(formatSummaryValue(stopPrice))}</span>
        <span>Target ${escapeHtml(formatSummaryValue(targetPrice))}</span>
        <span>PnL ${escapeHtml(formatSummaryValue(trade.netPnl))}</span>
        <span>R ${escapeHtml(formatSummaryValue(trade.rMultipleManual))}</span>
        <span>Fills ${fillCount}</span>
      </button>
      ${isExpanded ? renderTradeDetail(trade, displayModel) : ''}
    </article>
  `;
}

function renderActualTradesSection(day) {
  const liveTrades = Array.isArray(day.liveTrades) ? day.liveTrades : [];
  const executions = getJournalExecutions(day);
  const displayModelsById = new Map(
    getJournalExecutionDisplayModels(executions).map((model) => [model.id, model])
  );
  const body = liveTrades.length
    ? liveTrades.map((trade) => renderTradeRow(trade, displayModelsById.get(trade.id))).join('')
    : '<p class="journal-empty-state">No actual trades recorded.</p>';
  return `
    <section class="journal-section">
      <div class="journal-section-header">
        <h2>Actual Trades</h2>
        <button type="button" class="journal-action-button" id="journalAddTradeButton">Add Trade</button>
      </div>
      <div class="journal-trade-list">${body}</div>
    </section>
  `;
}

function renderJournalWorkspace() {
  const root = document.getElementById(WORKSPACE_ID);
  if (!root) return;
  const day = getActiveJournalDay();
  const modeOptions = DAY_MODE_OPTIONS.map(([value, label]) => (
    `<option value="${value}"${day.dayMode === value ? ' selected' : ''}>${label}</option>`
  )).join('');

  root.innerHTML = `
    <div class="journal-layout">
      <header class="journal-header">
        <h1>Journal</h1>
        <div class="journal-controls">
          <label class="journal-control" for="journalAccountInput">
            <span>Account</span>
            <input id="journalAccountInput" type="text" value="${escapeHtml(activeAccountId)}" autocomplete="off" />
          </label>
          <label class="journal-control journal-date-field" for="journalDateInput">
            <span>Date</span>
            <span class="journal-date-control">
              <button type="button" class="journal-icon-button" data-journal-date-shift="-1" title="Previous day">&lsaquo;</button>
              <input id="journalDateInput" type="date" value="${escapeHtml(activeDate)}" />
              <button type="button" class="journal-icon-button" data-journal-date-shift="1" title="Next day">&rsaquo;</button>
              <button type="button" class="journal-action-button journal-today-button" id="journalTodayButton">Today</button>
            </span>
          </label>
          <label class="journal-control" for="journalDayModeSelect">
            <span>Day Mode</span>
            <select id="journalDayModeSelect">${modeOptions}</select>
          </label>
        </div>
      </header>
      <section class="journal-section">
        <h2>Pre-Market</h2>
        <div class="journal-field-grid">
          ${makeTextarea({
            id: 'journalPreMarketPlan',
            label: 'Pre-market plan',
            value: day.preMarketPlan,
            field: 'preMarketPlan',
          })}
          ${makeTextarea({
            id: 'journalSessionIntent',
            label: 'Session intent',
            value: day.sessionIntent,
            field: 'sessionIntent',
            size: 'short',
          })}
          ${makeTextarea({
            id: 'journalMentalStateBefore',
            label: 'Mental state before',
            value: day.mentalStateBefore,
            field: 'mentalStateBefore',
            size: 'short',
          })}
        </div>
      </section>
      <section class="journal-section">
        <h2>During Session</h2>
        <div class="journal-field-grid">
          ${makeTextarea({
            id: 'journalIntradayStateNotes',
            label: 'Intraday state notes',
            value: day.intradayStateNotes,
            field: 'intradayStateNotes',
          })}
        </div>
      </section>
      ${renderActualTradesSection(day)}
      <section class="journal-section">
        <h2>Post Session</h2>
        <div class="journal-field-grid">
          ${makeTextarea({
            id: 'journalPostMarketSummary',
            label: 'Post-market summary',
            value: day.postMarketSummary,
            field: 'postMarketSummary',
          })}
          ${makeTextarea({
            id: 'journalMainMistake',
            label: 'Main mistake',
            value: day.mainMistake,
            field: 'mainMistake',
            size: 'short',
          })}
          ${makeTextarea({
            id: 'journalBestBehavior',
            label: 'Best behavior',
            value: day.bestBehavior,
            field: 'bestBehavior',
            size: 'short',
          })}
          ${makeTextarea({
            id: 'journalNextSessionFocus',
            label: 'Next-session focus',
            value: day.nextSessionFocus,
            field: 'nextSessionFocus',
            size: 'short',
          })}
        </div>
      </section>
      <section class="journal-section">
        <h2>Discipline Review</h2>
        <div class="journal-field-grid">
          ${makeTextarea({
            id: 'journalDisciplineSummary',
            label: 'Discipline summary',
            value: day.disciplineSummary,
            field: 'disciplineSummary',
          })}
        </div>
      </section>
    </div>
  `;
}

function bindJournalWorkspace() {
  const root = document.getElementById(WORKSPACE_ID);
  if (!root) return;
  root.addEventListener('input', (event) => {
    const fillId = event.target?.dataset?.journalFillId;
    const fillField = event.target?.dataset?.journalFillField;
    const fillTradeId = event.target?.dataset?.journalTradeId;
    if (fillTradeId && fillId && fillField) {
      scheduleFillFieldUpdate(fillTradeId, fillId, fillField, event.target.value);
      return;
    }
    const tradeId = event.target?.dataset?.journalTradeId;
    const tradeField = event.target?.dataset?.journalTradeField;
    if (tradeId && tradeField) {
      scheduleTradeFieldUpdate(tradeId, tradeField, event.target.value);
      return;
    }
    const field = event.target?.dataset?.journalField;
    if (!field) return;
    scheduleFieldUpdate(field, event.target.value);
  });
  root.addEventListener('change', (event) => {
    const fillId = event.target?.dataset?.journalFillId;
    const fillField = event.target?.dataset?.journalFillField;
    const fillTradeId = event.target?.dataset?.journalTradeId;
    if (fillTradeId && fillId && fillField) {
      updateFill(fillTradeId, fillId, { [fillField]: event.target.value });
      return;
    }
    const tradeId = event.target?.dataset?.journalTradeId;
    const tradeField = event.target?.dataset?.journalTradeField;
    if (tradeId && tradeField) {
      updateTrade(tradeId, { [tradeField]: event.target.value });
      if (tradeField === 'orderReviewId') renderJournalWorkspace();
      return;
    }
    if (event.target?.id === 'journalDayModeSelect') {
      updateDayMode(event.target.value);
      return;
    }
    if (event.target?.id === 'journalDateInput') {
      setActiveDate(event.target.value);
      return;
    }
    if (event.target?.id === 'journalAccountInput') {
      saveJournalDays(activeAccountId);
      activeAccountId = normalizeAccountId(event.target.value);
      writeLocalValue(ACCOUNT_STORAGE_KEY, activeAccountId);
      restoreJournalDays(activeAccountId);
      renderJournalWorkspace();
    }
  });
  root.addEventListener('click', (event) => {
    if (event.target?.id === 'journalTodayButton') {
      setActiveDate(todayDateKey());
      return;
    }
    const dateShift = event.target?.dataset?.journalDateShift;
    if (dateShift) {
      setActiveDate(shiftDate(activeDate, Number(dateShift)));
      return;
    }
    const addFillTradeId = event.target?.dataset?.journalAddFill;
    if (addFillTradeId) {
      addFill(addFillTradeId);
      return;
    }
    const deleteFillId = event.target?.dataset?.journalDeleteFill;
    const deleteFillTradeId = event.target?.dataset?.journalTradeId;
    if (deleteFillTradeId && deleteFillId) {
      deleteFill(deleteFillTradeId, deleteFillId);
      return;
    }
    if (event.target?.id === 'journalAddTradeButton') {
      createTrade();
      return;
    }
    const openOrderSetupId = event.target?.dataset?.journalOpenOrderSetup;
    if (openOrderSetupId) {
      openOrderSetupInBacktesting(openOrderSetupId);
      return;
    }
    const toggleTradeId = event.target?.closest?.('[data-journal-toggle-trade]')?.dataset?.journalToggleTrade;
    if (toggleTradeId) {
      expandedTradeId = expandedTradeId === toggleTradeId ? '' : toggleTradeId;
      renderJournalWorkspace();
    }
  });
}

export function initJournalWorkspace() {
  if (initialized) return;
  initialized = true;
  activeAccountId = normalizeAccountId(readLocalValue(ACCOUNT_STORAGE_KEY, DEFAULT_JOURNAL_ACCOUNT_ID));
  activeDate = normalizeDate(readLocalValue(DATE_STORAGE_KEY, todayDateKey()));
  if (activeAccountId !== DEFAULT_JOURNAL_ACCOUNT_ID) restoreJournalDays(activeAccountId);
  renderJournalWorkspace();
  bindJournalWorkspace();
}
