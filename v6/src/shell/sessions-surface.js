import { SESSION_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { createSessionsSurfaceState } from './sessions-surface-model.js';
import { setWorkflowActionOpen } from './workflow-action-state.js';
import { bindWorkflowPanelClose } from './workflow-panel-close.js';
import { createTextElement, replaceNodeChildren } from './safe-dom-render.js';

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function renderSessionList(root, sessions = []) {
  const list = root.querySelector('[data-v6-sessions-list]');
  if (!list) return;
  const documentRef = root.ownerDocument || globalThis.document;
  const rows = sessions.map((session) => {
    const row = createTextElement(documentRef, { tagName: 'li' });
    row.dataset.v6SessionRow = String(session.id ?? '');
    replaceNodeChildren(row, [
      createTextElement(documentRef, { tagName: 'strong', text: `${session.symbol} ${session.timeframe}` }),
      createTextElement(documentRef, { tagName: 'span', text: session.id }),
    ]);
    return row;
  });
  replaceNodeChildren(list, rows);
}

function renderSessionsSurface(root, state) {
  setText(root, '[data-v6-sessions-count]', `${state.count} replay sessions`);
  setText(root, '[data-v6-sessions-active]', state.activeSessionLabel);
  renderSessionList(root, state.sessions);
}

export function mountSessionsSurface(root, {
  dispatchCommand = dispatchRuntimeCommand,
  onOpen = null,
} = {}) {
  if (!root) {
    throw new Error('Sessions surface root is required.');
  }

  const createButton = root.querySelector('[data-v6-sessions-create]');
  const closeButton = root.querySelector('[data-v6-sessions-close]');
  const refreshButton = root.querySelector('[data-v6-sessions-refresh]');
  const panel = root.querySelector('[data-v6-sessions-panel]');
  const toggle = root.querySelector('[data-v6-sessions-toggle]');
  const unsubscriptions = [];
  let open = Boolean(panel && !panel.hidden);
  let state = createSessionsSurfaceState();

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    if (panel) {
      panel.hidden = !open;
    }
    setWorkflowActionOpen(toggle, open);
    if (open) {
      onOpen?.();
    }
    return getState();
  }

  async function refresh() {
    const [activeSession, sessions] = await Promise.all([
      dispatchCommand(SESSION_COMMANDS.GET_ACTIVE),
      dispatchCommand(SESSION_COMMANDS.LIST),
    ]);
    state = createSessionsSurfaceState({ activeSession, sessions });
    renderSessionsSurface(root, state);
    return state;
  }

  async function createSession() {
    await dispatchCommand(SESSION_COMMANDS.CREATE);
    return refresh();
  }

  if (createButton) {
    const listener = () => createSession();
    createButton.addEventListener('click', listener);
    unsubscriptions.push(() => createButton.removeEventListener('click', listener));
  }
  if (refreshButton) {
    const listener = () => refresh();
    refreshButton.addEventListener('click', listener);
    unsubscriptions.push(() => refreshButton.removeEventListener('click', listener));
  }
  if (toggle) {
    const listener = () => setOpen(!open);
    toggle.addEventListener('click', listener);
    unsubscriptions.push(() => toggle.removeEventListener('click', listener));
  }
  bindWorkflowPanelClose({
    close: () => setOpen(false),
    closeButton,
    root,
    unsubscriptions,
  });

  refresh();

  function getState() {
    return {
      open,
      ...state,
    };
  }

  return Object.freeze({
    createSession,
    getState,
    refresh,
    setOpen,
    unmount() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
  });
}
