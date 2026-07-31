import {
  createWorkstationSettings,
  DEFAULT_WORKSTATION_SETTINGS,
} from '../workstation-settings/public.js';
import { populateSettingsDraft, readSettingsDraft } from './settings-dialog-draft.js';
import { createSettingsDialogForm } from './settings-dialog-form.js';
import { element } from './settings-dialog-primitives.js';

function requireDialogPorts({ getSnapshot, onCancelPreview, onPreview, onSave }) {
  if (typeof getSnapshot !== 'function' || typeof onCancelPreview !== 'function'
    || typeof onPreview !== 'function' || typeof onSave !== 'function') {
    throw new TypeError(
      'Workstation Settings dialog requires snapshot, preview, cancel-preview, and save ports.',
    );
  }
}

/** Own one disposable Settings draft and no committed/persistence/chart state. */
export function createWorkstationSettingsDialog({
  getRecentColors = () => [],
  getSnapshot,
  onCancelPreview,
  onPreview,
  onRecordRecentColors = () => {},
  onSave,
}) {
  requireDialogPorts({ getSnapshot, onCancelPreview, onPreview, onSave });
  let touchedColors = [];
  let form;

  function markColorTouched(name) {
    touchedColors = [name, ...touchedColors.filter((candidate) => candidate !== name)];
    previewDraft();
  }

  form = createSettingsDialogForm({ getRecentColors, onColorChange: markColorTouched });
  const { cancel, close, dialog, recovery, reset, save, validation } = form;

  function populate(settings) {
    form.closePickers();
    touchedColors = [];
    populateSettingsDraft(form, settings);
    validation.hidden = true;
    validation.textContent = '';
  }

  function discard() {
    form.closePickers();
    const outcome = onCancelPreview();
    if (outcome?.accepted === true) {
      if (dialog.open) dialog.close();
      return;
    }
    validation.textContent = outcome?.message ?? 'The Settings preview could not be restored.';
    validation.hidden = false;
    cancel.focus();
  }

  function previewDraft() {
    if (!dialog.open) return;
    validation.hidden = true;
    try {
      const outcome = onPreview(readSettingsDraft(form));
      if (outcome?.accepted === true) return;
      validation.textContent = outcome?.message ?? 'Settings preview could not be applied.';
    } catch (error) {
      validation.textContent = error?.message ?? 'Settings preview could not be applied.';
    }
    validation.hidden = false;
  }

  function recordRecentColors() {
    if (touchedColors.length === 0) return;
    try {
      onRecordRecentColors(touchedColors.map((name) => form.pickerByName.get(name).value));
    } catch { /* A convenience history failure cannot roll back accepted Settings. */ }
  }

  function saveDraft() {
    validation.hidden = true;
    let outcome;
    try { outcome = onSave(readSettingsDraft(form)); } catch (error) {
      outcome = Object.freeze({ accepted: false, message: error?.message });
    }
    if (outcome?.accepted === true) {
      recordRecentColors();
      form.closePickers();
      dialog.close();
      return;
    }
    validation.textContent = outcome?.message ?? 'Settings could not be saved.';
    validation.hidden = false;
    save.focus();
  }

  reset.addEventListener('click', () => {
    populate(createWorkstationSettings(DEFAULT_WORKSTATION_SETTINGS));
    previewDraft();
  });
  cancel.addEventListener('click', discard);
  close.addEventListener('click', discard);
  save.addEventListener('click', saveDraft);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    discard();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) discard();
  });
  dialog.addEventListener('input', (event) => {
    if (event.target.matches('input[type="checkbox"], input[type="number"], select')) previewDraft();
  });
  form.selectTab(form.activeTab());

  return Object.freeze({
    dispose() {
      if (dialog.open) onCancelPreview();
      form.disposePickers();
      dialog.remove();
    },
    element: dialog,
    open() {
      const snapshot = getSnapshot();
      populate(snapshot.settings);
      recovery.hidden = snapshot.recoveryCode === null;
      recovery.textContent = snapshot.recoveryCode === null
        ? ''
        : 'Stored Settings were unavailable or invalid. Defaults are active until a successful save.';
      const activeTab = form.activeTab();
      form.selectTab(activeTab);
      dialog.showModal();
      form.focusTab(activeTab);
    },
  });
}

/** Compose the compact launcher with its owned modal without exposing DOM wiring. */
export function createWorkstationSettingsControl(options) {
  const dialog = createWorkstationSettingsDialog(options);
  const root = element('button', {
    className: 'button replay-action-button workstation-settings-open',
    text: 'Settings',
    type: 'button',
  });
  root.setAttribute('aria-label', 'Open Settings');
  root.addEventListener('click', dialog.open);
  return Object.freeze({
    dialog: dialog.element,
    dispose() {
      root.removeEventListener('click', dialog.open);
      dialog.dispose();
    },
    root,
    setDisabled(disabled) { root.disabled = disabled === true; },
  });
}
