import { createHiddenJournalRowActionHarness } from '../journal/journal-row-action-hidden-harness.js';
import { createJournalRowActionSessionContext } from '../journal/journal-row-action-session-context.js';

export function createJournalRowActionAdapter({
  journalSurface,
  onOpen = null,
} = {}) {
  if (!journalSurface || typeof journalSurface.setOpen !== 'function') {
    throw new Error('Journal row action adapter requires a journal surface.');
  }

  const harness = createHiddenJournalRowActionHarness({
    createContext: createJournalRowActionSessionContext,
    openSurface: (context) => {
      journalSurface.setOpen(true);
      onOpen?.(context);
    },
    refreshSurface: () => journalSurface.refresh?.(),
    rowActionVisible: true,
  });

  return Object.freeze({
    getState: harness.getState,
    open: harness.open,
    prepare: harness.prepare,
  });
}
