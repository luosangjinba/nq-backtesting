import {
  REPLAY_NAVIGATION_PREFERENCES_COMMANDS,
  REPLAY_NAVIGATION_PREFERENCES_EVENTS,
} from '../contracts/app-contracts.js';
import {
  createReplayNavigationPreferences,
} from '../replay-navigation/replay-navigation-preferences.js';
import {
  DEFAULT_REPLAY_NAVIGATION_ANCHORS,
} from '../replay-navigation/replay-navigation-schedule.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

const FIELD_LABELS = Object.freeze({
  asianSession: 'Asian Session start',
  dayOpen: 'Next Day Open',
  londonSession: 'London Session start',
  newYorkSession: 'New York Session start',
});

export function validateReplayNavigationSettingsDraft(input = {}) {
  try {
    return {
      error: null,
      preferences: createReplayNavigationPreferences(input),
      valid: true,
    };
  } catch (error) {
    return {
      error: error?.message || String(error),
      preferences: null,
      valid: false,
    };
  }
}

export function mountReplayNavigationSettings(root, {
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Replay navigation settings root is required.');
  }
  const openButton = root.querySelector('[data-v6-replay-navigation-settings-open]');
  const dialog = root.querySelector('[data-v6-replay-navigation-settings-dialog]');
  const form = root.querySelector('[data-v6-replay-navigation-settings-form]');
  const fields = [...root.querySelectorAll('[data-v6-replay-navigation-setting]')];
  const closeButtons = [...root.querySelectorAll('[data-v6-replay-navigation-settings-close]')];
  const resetButton = root.querySelector('[data-v6-replay-navigation-settings-reset]');
  const saveButton = root.querySelector('[data-v6-replay-navigation-settings-save]');
  const errorReadout = root.querySelector('[data-v6-replay-navigation-settings-error]');
  const gotoDetails = root.querySelector('[data-v6-rail-goto-details]');
  if (
    !openButton
    || !dialog
    || !form
    || fields.length !== 4
    || !closeButtons.length
    || !resetButton
    || !saveButton
    || !errorReadout
  ) {
    throw new Error('Replay navigation settings controls are incomplete.');
  }

  const abortController = new AbortController();
  const { signal } = abortController;
  const unsubscribeCallbacks = [];
  let current = createReplayNavigationPreferences();
  let draft = { ...current };
  let open = false;
  let saving = false;

  function renderDraft(nextDraft = draft) {
    draft = { ...nextDraft };
    fields.forEach((field) => {
      const key = field.dataset.v6ReplayNavigationSetting;
      field.value = String(draft[key] || '');
    });
    validateDraft();
  }

  function readDraft() {
    return Object.fromEntries(fields.map((field) => [
      field.dataset.v6ReplayNavigationSetting,
      field.value,
    ]));
  }

  function validateDraft() {
    draft = readDraft();
    const result = validateReplayNavigationSettingsDraft(draft);
    fields.forEach((field) => {
      const key = field.dataset.v6ReplayNavigationSetting;
      const fieldValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(draft[key] || ''));
      field.setAttribute('aria-invalid', String(!fieldValid));
      field.setCustomValidity(fieldValid ? '' : `${FIELD_LABELS[key]} must use HH:mm.`);
    });
    errorReadout.textContent = result.error || '';
    saveButton.disabled = saving || !result.valid;
    return result;
  }

  function setOpen(nextOpen, {
    restoreFocus = true,
  } = {}) {
    open = Boolean(nextOpen);
    dialog.hidden = !open;
    openButton.setAttribute('aria-expanded', String(open));
    root.dataset.v6ReplayNavigationSettingsOpen = String(open);
    if (open) {
      gotoDetails.open = false;
      renderDraft(current);
      fields[0]?.focus();
    } else if (restoreFocus) {
      openButton.focus();
    }
    return getState();
  }

  async function openDialog() {
    try {
      current = createReplayNavigationPreferences(
        await dispatchCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.GET_SNAPSHOT),
      );
      setOpen(true, { restoreFocus: false });
    } catch (error) {
      root.dataset.v6ReplayNavigationSettingsError = error?.message || String(error);
    }
  }

  function discard() {
    renderDraft(current);
    setOpen(false);
  }

  function resetDraft() {
    renderDraft(DEFAULT_REPLAY_NAVIGATION_ANCHORS);
  }

  async function save(event) {
    event?.preventDefault?.();
    const validation = validateDraft();
    if (!validation.valid || saving) return null;
    saving = true;
    saveButton.disabled = true;
    try {
      current = createReplayNavigationPreferences(
        await dispatchCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.UPDATE, validation.preferences),
      );
      renderDraft(current);
      setOpen(false);
      return { ...current };
    } catch (error) {
      errorReadout.textContent = error?.message || String(error);
      root.dataset.v6ReplayNavigationSettingsError = errorReadout.textContent;
      return null;
    } finally {
      saving = false;
      saveButton.disabled = !validateDraft().valid;
    }
  }

  function syncPreferences(preferences = {}) {
    current = createReplayNavigationPreferences(preferences);
    if (!open) renderDraft(current);
  }

  function getState() {
    return {
      current: { ...current },
      draft: { ...draft },
      open,
      saving,
    };
  }

  openButton.disabled = false;
  openButton.setAttribute('aria-expanded', 'false');
  openButton.addEventListener('click', () => {
    void openDialog();
  }, { signal });
  closeButtons.forEach((button) => {
    button.addEventListener('click', discard, { signal });
  });
  resetButton.addEventListener('click', resetDraft, { signal });
  form.addEventListener('input', validateDraft, { signal });
  form.addEventListener('submit', save, { signal });
  dialog.addEventListener('pointerdown', (event) => {
    if (event.target === dialog) discard();
  }, { signal });
  root.ownerDocument?.addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      discard();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }, { signal });

  if (typeof subscribeEvent === 'function') {
    unsubscribeCallbacks.push(
      subscribeEvent(REPLAY_NAVIGATION_PREFERENCES_EVENTS.UPDATED, syncPreferences),
      subscribeEvent(REPLAY_NAVIGATION_PREFERENCES_EVENTS.RESET, syncPreferences),
    );
  }

  renderDraft(current);
  Promise.resolve(dispatchCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.GET_SNAPSHOT))
    .then(syncPreferences)
    .catch((error) => {
      root.dataset.v6ReplayNavigationSettingsError = error?.message || String(error);
    });

  return Object.freeze({
    destroy() {
      abortController.abort();
      while (unsubscribeCallbacks.length) unsubscribeCallbacks.pop()();
    },
    getState,
    setOpen,
  });
}
