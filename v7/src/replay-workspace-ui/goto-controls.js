import { createDateTimeControl } from '../calendar-surface/public.js';
import { setControlDisabled, setControlsDisabled } from './control-availability.js';
import { QUICK_GOTO_ACTIONS } from './goto-quick-actions.js';
import { createGotoSettingsDialog } from './goto-settings-dialog.js';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

/** Own Quick GoTo plus the temporary pre-separation Exact GoTo entry. */
export function createGotoControls({
  getExactDefault = () => Date.now(),
  initialSettings,
  onExact,
  onQuick,
  onSaveSettings,
}) {
  const root = element('div', { className: 'goto-anchor' });
  const toggle = element('button', { className: 'button replay-action-button goto-toggle', text: 'Go to', type: 'button' });
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'menu');
  const menu = element('div', { className: 'goto-menu' });
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Go to replay time');
  for (const item of QUICK_GOTO_ACTIONS) {
    const key = item.key === null ? null : element('kbd', { text: item.key });
    const button = element('button', { className: 'goto-menu-item', type: 'button' }, [
      element('span', { text: item.label }), key,
    ]);
    button.dataset.gotoAnchor = item.anchor;
    button.setAttribute('role', 'menuitem');
    button.addEventListener('click', () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      onQuick(item.anchor);
    });
    menu.append(button);
  }
  const settings = element('button', {
    className: 'goto-menu-item goto-settings', text: 'Custom Settings…', type: 'button',
  });
  settings.setAttribute('role', 'menuitem');
  const custom = element('button', { className: 'goto-menu-item goto-custom', text: 'Custom date & time…', type: 'button' });
  custom.setAttribute('role', 'menuitem');
  menu.append(settings, custom);
  root.append(toggle, menu);

  const settingsDialog = createGotoSettingsDialog({ initialSettings, onSave: onSaveSettings });

  const dateTime = createDateTimeControl({
    label: 'Replay target', name: 'goto-target', timeZone: 'America/New_York',
  });
  const validation = element('p', { className: 'goto-validation' });
  validation.hidden = true;
  const dialogTitle = element('h2', { text: 'Go to' });
  dialogTitle.id = 'replay-goto-title';
  const closeButton = element('button', { className: 'goto-dialog-close', text: '×', type: 'button' });
  closeButton.setAttribute('aria-label', 'Close Go to');
  const dialog = element('dialog', { className: 'goto-dialog' }, [
    element('header', { className: 'goto-dialog-header' }, [
      element('div', {}, [
        dialogTitle,
        element('p', { text: 'Choose an exact New York date and time.' }),
      ]),
      closeButton,
    ]),
    element('div', { className: 'goto-dialog-body' }, [dateTime.element, validation]),
    element('footer', { className: 'goto-dialog-actions' }, [
      element('button', { className: 'button goto-cancel', text: 'Cancel', type: 'button' }),
      element('button', { className: 'button goto-submit', text: 'Go to', type: 'button' }),
    ]),
  ]);
  dialog.setAttribute('aria-labelledby', dialogTitle.id);

  function closeMenu() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }
  function closeDialog() {
    dateTime.close();
    if (dialog.open) dialog.close();
  }
  function submit() {
    const epochMs = dateTime.readEpochMs();
    if (!Number.isSafeInteger(epochMs)) {
      validation.textContent = 'Choose a valid date and time.';
      validation.hidden = false;
      return;
    }
    validation.hidden = true;
    closeDialog();
    onExact(epochMs);
  }
  function onDocumentClick(event) {
    if (!root.contains(event.target)) closeMenu();
  }
  function onDocumentKeydown(event) {
    if (event.key === 'Escape') closeMenu();
    if (event.metaKey || event.ctrlKey || event.altKey || event.target?.matches?.('input, textarea, select')) return;
    const match = QUICK_GOTO_ACTIONS.find(({ key }) => key?.toLowerCase() === event.key.toLowerCase());
    if (!match) return;
    event.preventDefault();
    onQuick(match.anchor);
  }
  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  });
  custom.addEventListener('click', () => {
    closeMenu();
    validation.hidden = true;
    const defaultEpochMs = getExactDefault();
    if (Number.isSafeInteger(defaultEpochMs)) dateTime.setEpochMs(defaultEpochMs);
    dialog.showModal();
  });
  settings.addEventListener('click', () => {
    closeMenu();
    settingsDialog.open();
  });
  dialog.querySelector('.goto-dialog-close').addEventListener('click', closeDialog);
  dialog.querySelector('.goto-cancel').addEventListener('click', closeDialog);
  dialog.querySelector('.goto-submit').addEventListener('click', submit);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  document.body.append(dialog);

  return Object.freeze({
    dialog,
    dispose() {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      closeDialog();
      settingsDialog.dispose();
      dialog.remove();
      root.remove();
    },
    openExact(epochMs) {
      dateTime.setEpochMs(epochMs);
      validation.hidden = true;
      dialog.showModal();
    },
    root,
    setDisabled(disabled, preserveVisual = false) {
      const options = { disabled, preserveVisual };
      setControlDisabled(toggle, options);
      setControlsDisabled(menu.querySelectorAll('button'), options);
      settingsDialog.setDisabled(disabled, preserveVisual);
    },
  });
}
