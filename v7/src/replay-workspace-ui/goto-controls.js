import { setControlDisabled, setControlsDisabled } from './control-availability.js';
import { QUICK_GOTO_ACTIONS } from '../replay-workspace-composition/public.js';
import { createGotoSettingsDialog } from './goto-settings-dialog.js';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

/** Own only the fixed Quick GoTo actions and their global settings entry. */
export function createGotoControls({
  initialSettings,
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
  menu.append(settings);
  root.append(toggle, menu);

  const settingsDialog = createGotoSettingsDialog({ initialSettings, onSave: onSaveSettings });

  function closeMenu() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
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
  settings.addEventListener('click', () => {
    closeMenu();
    settingsDialog.open();
  });
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);

  return Object.freeze({
    dispose() {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      settingsDialog.dispose();
      root.remove();
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
