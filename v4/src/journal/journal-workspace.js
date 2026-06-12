import {
  DEFAULT_JOURNAL_ACCOUNT_ID,
  getJournalDay,
  updateJournalDay,
} from './journal-store.js';
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
    mentalStateBefore: '',
    postMarketSummary: '',
    disciplineSummary: '',
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

function formatSummaryValue(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function makeOptions(options, selectedValue) {
  return options.map(([value, label]) => (
    `<option value="${value}"${selectedValue === value ? ' selected' : ''}>${label}</option>`
  )).join('');
}

function makeTextarea({ id, label, value, field }) {
  return `
    <label class="journal-field" for="${id}">
      <span class="journal-field-title">${label}</span>
      <textarea id="${id}" data-journal-field="${field}" rows="4">${escapeHtml(value)}</textarea>
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

function renderTradeDetail(trade) {
  return `
    <div class="journal-trade-detail">
      <div class="journal-trade-grid">
        ${makeTradeSelect({
          label: 'Trade type',
          tradeId: trade.id,
          field: 'tradeType',
          value: trade.tradeType,
          options: TRADE_TYPE_OPTIONS,
        })}
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
    </div>
  `;
}

function renderTradeRow(trade) {
  const isExpanded = trade.id === expandedTradeId;
  const fillCount = Array.isArray(trade.fills) ? trade.fills.length : 0;
  return `
    <article class="journal-trade-row${isExpanded ? ' expanded' : ''}">
      <button type="button" class="journal-trade-summary" data-journal-toggle-trade="${escapeHtml(trade.id)}">
        <span class="journal-trade-pill">${escapeHtml(formatSummaryValue(trade.tradeType))}</span>
        <span>${escapeHtml(formatSummaryValue(trade.instrument))}</span>
        <span>${escapeHtml(formatSummaryValue(trade.direction))}</span>
        <span>${escapeHtml(formatSummaryValue(trade.result, 'No result'))}</span>
        <span>PnL ${escapeHtml(formatSummaryValue(trade.netPnl))}</span>
        <span>R ${escapeHtml(formatSummaryValue(trade.rMultipleManual))}</span>
        <span>Fills ${fillCount}</span>
      </button>
      ${isExpanded ? renderTradeDetail(trade) : ''}
    </article>
  `;
}

function renderActualTradesSection(day) {
  const liveTrades = Array.isArray(day.liveTrades) ? day.liveTrades : [];
  const body = liveTrades.length
    ? liveTrades.map(renderTradeRow).join('')
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
          <label class="journal-control" for="journalDateInput">
            <span>Date</span>
            <input id="journalDateInput" type="date" value="${escapeHtml(activeDate)}" />
          </label>
          <label class="journal-control" for="journalDayModeSelect">
            <span>Day Mode</span>
            <select id="journalDayModeSelect">${modeOptions}</select>
          </label>
        </div>
      </header>
      <section class="journal-section">
        <h2>Plan / State</h2>
        <div class="journal-field-grid">
          ${makeTextarea({
            id: 'journalPreMarketPlan',
            label: 'Pre-market plan',
            value: day.preMarketPlan,
            field: 'preMarketPlan',
          })}
          ${makeTextarea({
            id: 'journalMentalStateBefore',
            label: 'Mental state before',
            value: day.mentalStateBefore,
            field: 'mentalStateBefore',
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
    const tradeId = event.target?.dataset?.journalTradeId;
    const tradeField = event.target?.dataset?.journalTradeField;
    if (tradeId && tradeField) {
      updateTrade(tradeId, { [tradeField]: event.target.value });
      return;
    }
    if (event.target?.id === 'journalDayModeSelect') {
      updateDayMode(event.target.value);
      return;
    }
    if (event.target?.id === 'journalDateInput') {
      activeDate = normalizeDate(event.target.value);
      writeLocalValue(DATE_STORAGE_KEY, activeDate);
      renderJournalWorkspace();
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
    if (event.target?.id === 'journalAddTradeButton') {
      createTrade();
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
