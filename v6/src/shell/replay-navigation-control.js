import {
  REPLAY_NAVIGATION_COMMANDS,
  REPLAY_NAVIGATION_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import { REPLAY_NAVIGATION_ACTIONS } from '../replay-navigation/replay-navigation-schedule.js';

export const REPLAY_NAVIGATION_SHORTCUTS = Object.freeze({
  i: REPLAY_NAVIGATION_ACTIONS.ASIAN_SESSION,
  l: REPLAY_NAVIGATION_ACTIONS.LONDON_SESSION,
  n: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
  y: REPLAY_NAVIGATION_ACTIONS.NEXT_DAY_OPEN,
  z: REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION,
});

const ACTION_LABELS = Object.freeze({
  [REPLAY_NAVIGATION_ACTIONS.ASIAN_SESSION]: 'Asian Session',
  [REPLAY_NAVIGATION_ACTIONS.LONDON_SESSION]: 'London Session',
  [REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION]: 'New York Session',
  [REPLAY_NAVIGATION_ACTIONS.NEXT_DAY_OPEN]: 'Next Day Open',
  [REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION]: 'Next Session',
});

const REJECTION_MESSAGES = Object.freeze({
  'in-flight': 'Navigation is already running.',
  'navigation-error': 'Navigation failed.',
  'no-forward-candidate': 'No later configured session is available.',
  'no-real-source-bar': 'No later market session was found.',
  'replay-ended': 'Replay has reached its end.',
});

export function normalizeReplayNavigationPaneIds(paneIds = []) {
  return [...new Set((Array.isArray(paneIds) ? paneIds : [])
    .map((paneId) => String(paneId || '').trim())
    .filter(Boolean))];
}

function isEditableTarget(target) {
  const tagName = String(target?.tagName || '').toLowerCase();
  return Boolean(
    target?.isContentEditable
    || tagName === 'input'
    || tagName === 'select'
    || tagName === 'textarea',
  );
}

function hasOpenDialog(root) {
  return [...root.querySelectorAll('[role="dialog"]')]
    .some((dialog) => !dialog.hidden);
}

export function resolveReplayNavigationShortcut(event, {
  root,
} = {}) {
  if (
    !root
    || event?.defaultPrevented
    || event?.repeat
    || event?.altKey
    || event?.ctrlKey
    || event?.metaKey
    || event?.shiftKey
    || isEditableTarget(event?.target)
  ) {
    return null;
  }
  const workstation = root.querySelector('[data-v6-workstation-main]');
  if (!workstation || workstation.hidden || hasOpenDialog(root)) {
    return null;
  }
  return REPLAY_NAVIGATION_SHORTCUTS[String(event?.key || '').toLowerCase()] || null;
}

export function mountReplayNavigationControl(root, {
  dispatchCommand = dispatchRuntimeCommand,
  getVisiblePaneIds = null,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Replay navigation control root is required.');
  }
  const details = root.querySelector('[data-v6-rail-goto-details]');
  const actionButtons = [...root.querySelectorAll('[data-v6-replay-navigation-action]')];
  const status = root.querySelector('[data-v6-replay-navigation-status]');
  if (!details || actionButtons.length !== 5 || !status) {
    throw new Error('Replay navigation menu controls are incomplete.');
  }

  const abortController = new AbortController();
  const { signal } = abortController;
  const unsubscribeCallbacks = [];
  let busy = false;
  let lastOutcome = null;

  function setStatus(message, tone = 'idle') {
    status.textContent = message;
    status.dataset.v6ReplayNavigationTone = tone;
    root.dataset.v6ReplayNavigationStatus = tone;
  }

  function setBusy(nextBusy, action = null) {
    busy = Boolean(nextBusy);
    actionButtons.forEach((button) => {
      button.disabled = busy;
      button.setAttribute('aria-disabled', String(busy));
    });
    details.setAttribute('aria-busy', String(busy));
    if (busy) {
      setStatus(`Navigating to ${ACTION_LABELS[action] || 'session'}…`, 'busy');
    }
  }

  function closeMenu() {
    details.open = false;
  }

  function handleCompleted(result = {}) {
    lastOutcome = { ...result };
    setBusy(false);
    const label = ACTION_LABELS[result.action] || 'Session';
    setStatus(`${label} reached.`, 'success');
    closeMenu();
  }

  function handleRejected(result = {}) {
    lastOutcome = { ...result };
    setBusy(false);
    setStatus(REJECTION_MESSAGES[result.reason] || 'Navigation was rejected.', 'error');
  }

  function visiblePaneIds() {
    if (typeof getVisiblePaneIds !== 'function') return [];
    return normalizeReplayNavigationPaneIds(getVisiblePaneIds());
  }

  async function navigate(action) {
    if (busy) return null;
    setBusy(true, action);
    try {
      const response = await dispatchCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, {
        action,
        paneIds: visiblePaneIds(),
      });
      const result = response?.requestResult || response?.lastResult;
      if (result?.status === 'rejected') {
        handleRejected(result);
      } else if (result?.status === 'completed') {
        handleCompleted(result);
      } else if (busy) {
        setBusy(false);
      }
      return response;
    } catch (error) {
      handleRejected({ reason: 'navigation-error' });
      root.dataset.v6ReplayNavigationError = error?.message || String(error);
      return null;
    }
  }

  actionButtons.forEach((button) => {
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    button.addEventListener('click', () => {
      void navigate(button.dataset.v6ReplayNavigationAction);
    }, { signal });
  });

  root.ownerDocument?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && details.open) {
      closeMenu();
      return;
    }
    const action = resolveReplayNavigationShortcut(event, { root });
    if (!action || busy) return;
    event.preventDefault();
    void navigate(action);
  }, { signal });

  root.ownerDocument?.addEventListener('pointerdown', (event) => {
    if (details.open && !details.contains(event.target)) closeMenu();
  }, { signal });

  if (typeof subscribeEvent === 'function') {
    unsubscribeCallbacks.push(
      subscribeEvent(REPLAY_NAVIGATION_EVENTS.COMPLETED, handleCompleted),
      subscribeEvent(REPLAY_NAVIGATION_EVENTS.REJECTED, handleRejected),
    );
  }

  setStatus('Choose a later replay session.', 'idle');

  return Object.freeze({
    destroy() {
      abortController.abort();
      while (unsubscribeCallbacks.length) unsubscribeCallbacks.pop()();
    },
    getState() {
      return {
        busy,
        lastOutcome: lastOutcome ? { ...lastOutcome } : null,
      };
    },
    navigate,
  });
}
