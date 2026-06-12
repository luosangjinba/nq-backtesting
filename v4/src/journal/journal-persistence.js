import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import {
  DEFAULT_JOURNAL_ACCOUNT_ID,
  getJournalDays,
  loadJournalDays,
} from './journal-store.js';

const STORAGE_KEY_BASE = 'v4:journal';
const STORAGE_VERSION = 1;

let persistenceByAccount = new Map();

function normalizeAccountId(value) {
  const text = String(value ?? '').trim();
  return text || DEFAULT_JOURNAL_ACCOUNT_ID;
}

function handleStorageError(error, action) {
  const label = action === 'read'
    ? '读取'
    : action === 'remove'
      ? '清除'
      : '保存';
  bus.emit('status:update', {
    text: `Journal 本地${label}失败: ${error.message}`,
    isError: true,
  });
}

export function getJournalStorageKey(accountId = DEFAULT_JOURNAL_ACCOUNT_ID) {
  return `${STORAGE_KEY_BASE}:${normalizeAccountId(accountId)}`;
}

function getJournalPersistence(accountId = DEFAULT_JOURNAL_ACCOUNT_ID) {
  const normalizedAccountId = normalizeAccountId(accountId);
  if (!persistenceByAccount.has(normalizedAccountId)) {
    persistenceByAccount.set(normalizedAccountId, createLocalPersistence({
      key: getJournalStorageKey(normalizedAccountId),
      fallback: { version: STORAGE_VERSION, savedAt: null, journalDays: [] },
      onError: handleStorageError,
    }));
  }
  return persistenceByAccount.get(normalizedAccountId);
}

export function resetJournalPersistenceCache() {
  persistenceByAccount = new Map();
}

export function saveJournalDays(accountId = DEFAULT_JOURNAL_ACCOUNT_ID) {
  const normalizedAccountId = normalizeAccountId(accountId);
  const persistence = getJournalPersistence(normalizedAccountId);
  if (persistence.isRestoring()) return false;
  return persistence.write({
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    journalDays: getJournalDays().filter((day) => day.accountId === normalizedAccountId),
  });
}

export function restoreJournalDays(accountId = DEFAULT_JOURNAL_ACCOUNT_ID) {
  const normalizedAccountId = normalizeAccountId(accountId);
  const persistence = getJournalPersistence(normalizedAccountId);
  const payload = persistence.read();
  const journalDays = Array.isArray(payload?.journalDays) ? payload.journalDays : [];
  persistence.runRestoring(() => {
    loadJournalDays(journalDays, { reason: 'restore' });
  });
  if (journalDays.length) {
    bus.emit('status:update', {
      text: `已恢复 ${journalDays.length} 条本地 Journal Day`,
      isError: false,
    });
  }
  return journalDays.length;
}

export function clearSavedJournalDays(accountId = DEFAULT_JOURNAL_ACCOUNT_ID) {
  const removed = getJournalPersistence(accountId).remove();
  if (removed) {
    bus.emit('status:update', { text: 'Journal 本地保存已清除', isError: false });
  }
  return removed;
}

export function initJournalPersistence(accountId = DEFAULT_JOURNAL_ACCOUNT_ID) {
  restoreJournalDays(accountId);
  bus.on('journal:changed', () => saveJournalDays(accountId));
}
