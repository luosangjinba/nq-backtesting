import { SESSION_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

function formatSessionMeta(session = {}) {
  const start = session.startTime ? String(session.startTime).slice(0, 10) : 'Start pending';
  const end = session.endTime ? String(session.endTime).slice(0, 10) : 'End pending';
  return `${start} / ${end}`;
}

function sessionLabel(session = {}) {
  return `${session.symbol || 'NQ'} ${session.timeframe || '1m'}`;
}

function renderSessions(root, sessions = []) {
  const list = root.querySelector('[data-v6-dashboard-session-list]');
  const empty = root.querySelector('[data-v6-dashboard-empty]');
  if (!list) return;
  list.innerHTML = sessions.map((session) => `
    <li data-v6-dashboard-session-row="${session.id}">
      <button type="button" data-v6-dashboard-open-session="${session.id}" aria-label="Open ${sessionLabel(session)}">${sessionLabel(session)}</button>
      <strong>${session.id}</strong>
      <span>${formatSessionMeta(session)}</span>
    </li>
  `).join('');
  if (empty) {
    empty.hidden = sessions.length > 0;
  }
}

function setWorkstationHidden(root, hidden) {
  [
    '[data-v6-workstation-header]',
    '[data-v6-workstation-main]',
    '[data-v6-transport]',
    '[data-v6-status-bar]',
  ].forEach((selector) => {
    const element = root.querySelector(selector);
    if (element) {
      element.hidden = hidden;
    }
  });
  if (hidden) {
    [
      '[data-v6-journal-panel]',
      '[data-v6-replay-workflow-panel]',
      '[data-v6-sessions-panel]',
      '[data-v6-settings-panel]',
    ].forEach((selector) => {
      const element = root.querySelector(selector);
      if (element) {
        element.hidden = true;
      }
    });
  }
}

export function mountSessionDashboard(root, {
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!root) {
    throw new Error('Session dashboard root is required.');
  }
  const dashboard = root.querySelector('[data-v6-session-dashboard]');
  const toggle = root.querySelector('[data-v6-dashboard-toggle]');
  const createButton = root.querySelector('[data-v6-dashboard-create-session]');
  const refreshButton = root.querySelector('[data-v6-dashboard-refresh]');
  if (!dashboard || !toggle) {
    throw new Error('Session dashboard controls are required.');
  }

  const unsubscriptions = [];
  let surface = 'session';
  let sessions = [];

  function setSurface(nextSurface) {
    surface = nextSurface === 'workstation' ? 'workstation' : 'session';
    const sessionActive = surface === 'session';
    dashboard.hidden = !sessionActive;
    root.dataset.v6Surface = surface;
    toggle.setAttribute('aria-expanded', String(sessionActive));
    toggle.setAttribute('aria-pressed', String(sessionActive));
    setWorkstationHidden(root, sessionActive);
    if (sessionActive) {
      void refresh();
    }
    return getState();
  }

  function enterSessionSurface() {
    return setSurface('session');
  }

  function enterWorkstation() {
    return setSurface('workstation');
  }

  async function refresh() {
    sessions = await dispatchCommand(SESSION_COMMANDS.LIST);
    renderSessions(root, sessions);
    return getState();
  }

  async function createSession() {
    await dispatchCommand(SESSION_COMMANDS.CREATE);
    await refresh();
    enterWorkstation();
    return getState();
  }

  async function openSession(id) {
    await dispatchCommand(SESSION_COMMANDS.OPEN, id);
    enterWorkstation();
    return getState();
  }

  const toggleListener = () => enterSessionSurface();
  toggle.addEventListener('click', toggleListener);
  unsubscriptions.push(() => toggle.removeEventListener('click', toggleListener));

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

  const list = root.querySelector('[data-v6-dashboard-session-list]');
  if (list) {
    const listener = (event) => {
      const openSessionButton = event.target.closest?.('[data-v6-dashboard-open-session]');
      if (openSessionButton && list.contains(openSessionButton)) {
        void openSession(openSessionButton.dataset.v6DashboardOpenSession);
      }
    };
    list.addEventListener('click', listener);
    unsubscriptions.push(() => list.removeEventListener('click', listener));
  }

  function getState() {
    return {
      open: surface === 'session',
      surface,
      sessionCount: sessions.length,
      sessions: sessions.map((session) => ({ ...session })),
    };
  }

  enterSessionSurface();

  return {
    createSession,
    enterSessionSurface,
    enterWorkstation,
    getState,
    openSession,
    refresh,
    unmount() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
  };
}
