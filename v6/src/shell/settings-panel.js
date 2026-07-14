import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand } from '../runtime/commands.js';
import { subscribeEvent } from '../runtime/events.js';
import { setWorkflowActionOpen } from './workflow-action-state.js';
import { bindWorkflowPanelClose } from './workflow-panel-close.js';

function readFieldValue(field) {
  if (field.type === 'checkbox') {
    return field.checked;
  }
  return field.value;
}

function applySettingsToFields(root, settings = {}) {
  root.querySelectorAll('[data-v6-settings-field]').forEach((field) => {
    const key = field.dataset.v6SettingsField;
    if (!Object.hasOwn(settings, key)) return;
    if (field.type === 'checkbox') {
      field.checked = Boolean(settings[key]);
      return;
    }
    field.value = String(settings[key]);
  });
}

export function mountSettingsPanel(root, {
  onOpen = null,
} = {}) {
  if (!root) {
    throw new Error('Settings panel root is required.');
  }
  const toggle = root.querySelector('[data-v6-settings-toggle]');
  const panel = root.querySelector('[data-v6-settings-panel]');
  const closeButton = root.querySelector('[data-v6-settings-close]');
  const cancelButton = root.querySelector('[data-v6-settings-close-secondary]');
  const okButton = root.querySelector('[data-v6-settings-ok]');
  const resetButton = root.querySelector('[data-v6-settings-reset-draft]');
  const tabButtons = [...root.querySelectorAll('[data-v6-settings-tab]')];
  const tabPanels = [...root.querySelectorAll('[data-v6-settings-tab-panel]')];
  if (!toggle || !panel) {
    throw new Error('Settings panel controls are required.');
  }

  const fieldListeners = [];
  const unsubscriptions = [];
  let committedSettings = {};
  let draftSettings = {};
  let open = false;
  let activeTab = 'canvas';

  function setActiveTab(tabId) {
    const normalized = String(tabId || '').trim();
    if (!tabPanels.some((panelElement) => panelElement.dataset.v6SettingsTabPanel === normalized)) {
      return activeTab;
    }
    activeTab = normalized;
    tabButtons.forEach((button) => {
      const selected = button.dataset.v6SettingsTab === activeTab;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    tabPanels.forEach((panelElement) => {
      panelElement.hidden = panelElement.dataset.v6SettingsTabPanel !== activeTab;
    });
    return activeTab;
  }

  function readDraftFromFields() {
    return Object.fromEntries([...panel.querySelectorAll('[data-v6-settings-field]')]
      .map((field) => [field.dataset.v6SettingsField, readFieldValue(field)]));
  }

  function setCommittedSettings(settings = {}, { updateDraft = !open } = {}) {
    committedSettings = { ...settings };
    if (updateDraft) {
      draftSettings = { ...committedSettings };
      applySettingsToFields(panel, draftSettings);
    }
    return { ...committedSettings };
  }

  async function refreshCommittedSettings() {
    const settings = await dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT);
    return setCommittedSettings(settings, { updateDraft: true });
  }

  function setOpen(nextOpen) {
    const normalizedOpen = Boolean(nextOpen);
    if (!normalizedOpen && open) {
      draftSettings = { ...committedSettings };
      applySettingsToFields(panel, draftSettings);
    }
    open = normalizedOpen;
    panel.hidden = !open;
    setWorkflowActionOpen(toggle, open);
    if (open) {
      refreshCommittedSettings();
      onOpen?.();
    }
    return getState();
  }

  function getState() {
    return {
      open,
      committedSettings: { ...committedSettings },
      settings: { ...draftSettings },
      activeTab,
    };
  }

  function discardAndClose() {
    draftSettings = { ...committedSettings };
    applySettingsToFields(panel, draftSettings);
    return setOpen(false);
  }

  async function commitAndClose() {
    draftSettings = {
      ...committedSettings,
      ...readDraftFromFields(),
    };
    const settings = await dispatchCommand(SETTINGS_COMMANDS.UPDATE, draftSettings);
    setCommittedSettings(settings, { updateDraft: true });
    return setOpen(false);
  }

  async function resetDraft() {
    const defaults = await dispatchCommand(SETTINGS_COMMANDS.GET_DEFAULTS);
    const activePanel = tabPanels.find(
      (panelElement) => panelElement.dataset.v6SettingsTabPanel === activeTab,
    );
    const activeKeys = [...(activePanel?.querySelectorAll('[data-v6-settings-field]') || [])]
      .map((field) => field.dataset.v6SettingsField);
    draftSettings = {
      ...draftSettings,
      ...Object.fromEntries(activeKeys.map((key) => [key, defaults[key]])),
    };
    applySettingsToFields(panel, draftSettings);
    return getState();
  }

  const toggleListener = () => setOpen(!open);
  toggle.addEventListener('click', toggleListener);
  const closeUnsubscriptions = [];
  bindWorkflowPanelClose({
    close: discardAndClose,
    closeButton,
    root,
    unsubscriptions: closeUnsubscriptions,
  });
  if (cancelButton) {
    const listener = discardAndClose;
    cancelButton.addEventListener('click', listener);
    closeUnsubscriptions.push(() => cancelButton.removeEventListener('click', listener));
  }
  if (okButton) {
    const listener = () => commitAndClose();
    okButton.addEventListener('click', listener);
    closeUnsubscriptions.push(() => okButton.removeEventListener('click', listener));
  }
  if (resetButton) {
    const listener = () => resetDraft();
    resetButton.addEventListener('click', listener);
    closeUnsubscriptions.push(() => resetButton.removeEventListener('click', listener));
  }
  const backdropListener = (event) => {
    if (event.target === panel) {
      discardAndClose();
    }
  };
  panel.addEventListener('click', backdropListener);
  closeUnsubscriptions.push(() => panel.removeEventListener('click', backdropListener));
  tabButtons.forEach((button) => {
    const listener = () => setActiveTab(button.dataset.v6SettingsTab);
    button.addEventListener('click', listener);
    closeUnsubscriptions.push(() => button.removeEventListener('click', listener));
  });

  panel.querySelectorAll('[data-v6-settings-field]').forEach((field) => {
    const listener = () => {
      const key = field.dataset.v6SettingsField;
      draftSettings = {
        ...draftSettings,
        [key]: readFieldValue(field),
      };
    };
    field.addEventListener('change', listener);
    fieldListeners.push([field, listener]);
  });

  refreshCommittedSettings();
  setActiveTab(activeTab);
  unsubscriptions.push(
    subscribeEvent(SETTINGS_EVENTS.UPDATED, (settings) => setCommittedSettings(settings)),
    subscribeEvent(SETTINGS_EVENTS.RESET, (settings) => setCommittedSettings(settings)),
  );

  return {
    getState,
    setOpen,
    unmount() {
      toggle.removeEventListener('click', toggleListener);
      while (closeUnsubscriptions.length) {
        closeUnsubscriptions.pop()();
      }
      fieldListeners.forEach(([field, listener]) => {
        field.removeEventListener('change', listener);
      });
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
  };
}
