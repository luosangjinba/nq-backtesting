import {
  cloneJournalEntry,
  createJournalEntry,
  updateJournalEntry,
} from './journal-entry.js';

function cloneEntries(entries = []) {
  return entries.map(cloneJournalEntry);
}

function sortEntries(entries = []) {
  return [...entries].sort((left, right) => {
    const openedOrder = left.openedAt.localeCompare(right.openedAt);
    return openedOrder || left.id.localeCompare(right.id);
  });
}

export function createJournalStore({
  initialEntries = [],
  now = () => new Date().toISOString(),
} = {}) {
  let entries = initialEntries.map((entry) => createJournalEntry(entry, { now }));

  function listEntries() {
    return cloneEntries(sortEntries(entries));
  }

  function getEntry(id) {
    const entryId = String(id || '').trim();
    const entry = entries.find((item) => item.id === entryId);
    return entry ? cloneJournalEntry(entry) : null;
  }

  function addEntry(payload = {}) {
    const entry = createJournalEntry(payload, { now });
    if (entries.some((item) => item.id === entry.id)) {
      throw new Error(`Journal entry "${entry.id}" already exists.`);
    }
    entries = [...entries, entry];
    return cloneJournalEntry(entry);
  }

  function updateEntry(id, patch = {}) {
    const entryId = String(id || '').trim();
    const current = entries.find((item) => item.id === entryId);
    if (!current) {
      throw new Error(`Journal entry "${entryId}" does not exist.`);
    }
    const next = updateJournalEntry(current, patch, { now });
    entries = entries.map((entry) => (entry.id === entryId ? next : entry));
    return cloneJournalEntry(next);
  }

  function removeEntry(id) {
    const entryId = String(id || '').trim();
    const nextEntries = entries.filter((entry) => entry.id !== entryId);
    const removed = nextEntries.length !== entries.length;
    entries = nextEntries;
    return removed;
  }

  function replaceEntries(nextEntries = []) {
    entries = nextEntries.map((entry) => createJournalEntry(entry, { now }));
    return listEntries();
  }

  return {
    addEntry,
    getEntry,
    listEntries,
    removeEntry,
    replaceEntries,
    updateEntry,
  };
}
