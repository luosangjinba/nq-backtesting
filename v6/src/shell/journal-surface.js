import {
  JOURNAL_COMMANDS,
  JOURNAL_PERSISTENCE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { createJournalSurfaceState } from './journal-surface-model.js';

const DEFAULT_SNAPSHOT_KEY = 'workstation-journal';

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function renderEntryList(root, entries = []) {
  const list = root.querySelector('[data-v6-journal-list]');
  if (!list) return;
  list.innerHTML = entries
    .map((entry) => `<li data-v6-journal-row="${entry.id}"><strong>${entry.symbol} ${entry.side}</strong><span>${entry.quantity}@${entry.entryPrice}</span></li>`)
    .join('');
}

function renderJournalSurface(root, state) {
  setText(root, '[data-v6-journal-count]', `${state.count} entries`);
  setText(root, '[data-v6-journal-pnl]', state.pnlLabel);
  setText(root, '[data-v6-journal-snapshot]', state.snapshotLabel);
  renderEntryList(root, state.entries);
}

function createSampleEntry(sequence) {
  return {
    id: `journal-sample-${String(sequence).padStart(3, '0')}`,
    symbol: 'NQ',
    side: sequence % 2 === 0 ? 'sell' : 'buy',
    quantity: 1,
    entryPrice: 100 + sequence,
    exitPrice: 101 + sequence,
    openedAt: `2026-07-05T09:${String(30 + sequence).padStart(2, '0')}:00.000Z`,
    closedAt: `2026-07-05T09:${String(31 + sequence).padStart(2, '0')}:00.000Z`,
    tags: ['workflow'],
  };
}

export function mountJournalSurface(root, {
  dispatchCommand = dispatchRuntimeCommand,
  snapshotKey = DEFAULT_SNAPSHOT_KEY,
} = {}) {
  if (!root) {
    throw new Error('Journal surface root is required.');
  }

  const addButton = root.querySelector('[data-v6-journal-add]');
  const loadButton = root.querySelector('[data-v6-journal-load]');
  const panel = root.querySelector('[data-v6-journal-panel]');
  const refreshButton = root.querySelector('[data-v6-journal-refresh]');
  const saveButton = root.querySelector('[data-v6-journal-save]');
  const toggle = root.querySelector('[data-v6-journal-toggle]');
  const unsubscriptions = [];
  let lastSnapshot = null;
  let nextSampleSequence = 1;
  let open = Boolean(panel && !panel.hidden);
  let state = createJournalSurfaceState();

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    if (panel) {
      panel.hidden = !open;
    }
    toggle?.setAttribute?.('aria-expanded', String(open));
    return getState();
  }

  async function refresh() {
    const entries = await dispatchCommand(JOURNAL_COMMANDS.LIST_ENTRIES);
    const analytics = await dispatchCommand(JOURNAL_COMMANDS.ANALYZE_RECORDS, { records: entries });
    state = createJournalSurfaceState({ analytics, entries, lastSnapshot });
    renderJournalSurface(root, state);
    return getState();
  }

  async function addSampleEntry() {
    await dispatchCommand(JOURNAL_COMMANDS.ADD_ENTRY, createSampleEntry(nextSampleSequence));
    nextSampleSequence += 1;
    return refresh();
  }

  async function saveSnapshot() {
    lastSnapshot = await dispatchCommand(JOURNAL_PERSISTENCE_COMMANDS.SAVE_SNAPSHOT, { key: snapshotKey });
    return refresh();
  }

  async function loadSnapshot() {
    lastSnapshot = await dispatchCommand(JOURNAL_PERSISTENCE_COMMANDS.LOAD_SNAPSHOT, { key: snapshotKey });
    return refresh();
  }

  const bindings = [
    [addButton, 'click', addSampleEntry],
    [loadButton, 'click', loadSnapshot],
    [refreshButton, 'click', refresh],
    [saveButton, 'click', saveSnapshot],
    [toggle, 'click', () => setOpen(!open)],
  ];
  bindings.forEach(([element, eventName, listener]) => {
    if (!element) return;
    element.addEventListener(eventName, listener);
    unsubscriptions.push(() => element.removeEventListener(eventName, listener));
  });

  refresh();

  function getState() {
    return {
      open,
      ...state,
    };
  }

  return Object.freeze({
    addSampleEntry,
    getState,
    loadSnapshot,
    refresh,
    saveSnapshot,
    setOpen,
    unmount() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
  });
}
