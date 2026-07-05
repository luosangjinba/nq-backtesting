import { SESSION_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { createSessionsSurfaceState } from './sessions-surface-model.js';

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function renderSessionList(root, sessions = []) {
  const list = root.querySelector('[data-v6-sessions-list]');
  if (!list) return;
  list.innerHTML = sessions
    .map((session) => `<li data-v6-session-row="${session.id}"><strong>${session.symbol} ${session.timeframe}</strong><span>${session.id}</span></li>`)
    .join('');
}

function renderSessionsSurface(root, state) {
  setText(root, '[data-v6-sessions-count]', `${state.count} sessions`);
  setText(root, '[data-v6-sessions-active]', state.activeSessionLabel);
  renderSessionList(root, state.sessions);
}

export function mountSessionsSurface(root, {
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!root) {
    throw new Error('Sessions surface root is required.');
  }

  const createButton = root.querySelector('[data-v6-sessions-create]');
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
    toggle?.setAttribute?.('aria-expanded', String(open));
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
