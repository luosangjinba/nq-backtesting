const DEFAULT_STATE = Object.freeze({
  context: null,
  opened: false,
  refreshed: false,
  rowActionVisible: false,
});

function createState(patch = {}) {
  return Object.freeze({
    ...DEFAULT_STATE,
    ...patch,
    context: patch.context ? Object.freeze({ ...patch.context }) : patch.context ?? null,
  });
}

export function createHiddenJournalRowActionHarness({
  createContext,
  openSurface = null,
  refreshSurface = null,
  rowActionVisible = false,
} = {}) {
  if (typeof createContext !== 'function') {
    throw new Error('Hidden Journal row action harness requires a context factory.');
  }
  let state = createState();

  function prepare(session = {}) {
    const context = createContext(session);
    state = createState({
      context,
      opened: false,
      refreshed: false,
      rowActionVisible,
    });
    return state;
  }

  async function open(session = {}) {
    const prepared = prepare(session);
    openSurface?.(prepared.context);
    if (refreshSurface) {
      await refreshSurface(prepared.context);
    }
    state = createState({
      context: prepared.context,
      opened: true,
      refreshed: Boolean(refreshSurface),
      rowActionVisible,
    });
    return state;
  }

  return Object.freeze({
    getState() {
      return state;
    },
    open,
    prepare,
  });
}
