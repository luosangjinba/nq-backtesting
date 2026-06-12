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

let activeAccountId = DEFAULT_JOURNAL_ACCOUNT_ID;
let activeDate = '';
let initialized = false;
let saveTimers = new Map();

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

function makeTextarea({ id, label, value, field }) {
  return `
    <label class="journal-field" for="${id}">
      <span class="journal-field-title">${label}</span>
      <textarea id="${id}" data-journal-field="${field}" rows="4">${escapeHtml(value)}</textarea>
    </label>
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
    const field = event.target?.dataset?.journalField;
    if (!field) return;
    scheduleFieldUpdate(field, event.target.value);
  });
  root.addEventListener('change', (event) => {
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
