import {
  createReplayNavigationSettings,
  DEFAULT_REPLAY_NAVIGATION_SETTINGS,
  readReplayNavigationSettings,
} from '../replay-navigation-settings/public.js';
import { setControlsDisabled } from './control-availability.js';
import { QUICK_GOTO_SETTING_FIELDS } from './goto-quick-actions.js';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

/** Own only the simplified seven-time Quick GoTo settings dialog. */
export function createGotoSettingsDialog({ initialSettings, onSave }) {
  let current = initialSettings;
  readReplayNavigationSettings(current);
  const inputs = new Map();
  const rows = QUICK_GOTO_SETTING_FIELDS.map(({ field, label }) => {
    const input = element('input', { className: 'goto-settings-time', type: 'time' });
    input.name = field;
    input.step = '60';
    input.setAttribute('aria-label', `${label} start in New York time`);
    inputs.set(field, input);
    return element('label', { className: 'goto-settings-row' }, [
      element('span', { text: label }),
      input,
    ]);
  });
  const validation = element('p', { className: 'goto-settings-validation' });
  validation.hidden = true;
  const reset = element('button', { className: 'button goto-settings-reset', text: 'Reset to defaults', type: 'button' });
  const close = element('button', { className: 'goto-dialog-close', text: '×', type: 'button' });
  close.setAttribute('aria-label', 'Close Quick GoTo settings');
  const discard = element('button', { className: 'button goto-settings-discard', text: 'Discard', type: 'button' });
  const save = element('button', { className: 'button goto-settings-save', text: 'Save', type: 'button' });
  const title = element('h2', { text: 'Quick GoTo settings' });
  title.id = 'quick-goto-settings-title';
  const dialog = element('dialog', { className: 'goto-dialog goto-settings-dialog' }, [
    element('header', { className: 'goto-dialog-header' }, [
      element('div', {}, [title, element('p', { text: 'All times use New York time.' })]),
      element('div', { className: 'goto-settings-header-actions' }, [reset, close]),
    ]),
    element('div', { className: 'goto-settings-body' }, [
      element('p', {
        className: 'goto-settings-note',
        text: 'Next Session uses the next Asian, London, or New York Session automatically.',
      }),
      ...rows,
      validation,
    ]),
    element('footer', { className: 'goto-dialog-actions' }, [discard, save]),
  ]);
  dialog.setAttribute('aria-labelledby', title.id);

  function populate(settings) {
    const value = readReplayNavigationSettings(settings);
    for (const [field, input] of inputs) input.value = value[field];
    validation.hidden = true;
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  function saveSettings() {
    let candidate;
    try {
      candidate = createReplayNavigationSettings(Object.fromEntries(
        [...inputs].map(([field, input]) => [field, input.value]),
      ));
    } catch (error) {
      validation.textContent = error?.message ?? 'Choose seven valid times.';
      validation.hidden = false;
      return;
    }
    const outcome = onSave(candidate);
    if (outcome?.accepted === false) {
      validation.textContent = outcome.message ?? 'Quick GoTo settings could not be saved.';
      validation.hidden = false;
      return;
    }
    current = candidate;
    closeDialog();
  }

  reset.addEventListener('click', () => populate(createReplayNavigationSettings(
    DEFAULT_REPLAY_NAVIGATION_SETTINGS,
  )));
  close.addEventListener('click', closeDialog);
  discard.addEventListener('click', closeDialog);
  save.addEventListener('click', saveSettings);
  dialog.addEventListener('close', () => populate(current));
  document.body.append(dialog);

  return Object.freeze({
    dialog,
    dispose() {
      closeDialog();
      dialog.remove();
    },
    open() {
      populate(current);
      dialog.showModal();
    },
    setDisabled(disabled, preserveVisual = false) {
      setControlsDisabled(dialog.querySelectorAll('button, input'), { disabled, preserveVisual });
    },
  });
}
