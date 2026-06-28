import * as bus from '../../event-bus.js';
import { resetDisplayPreferences, setDisplayPreferences } from '../../display/display-preferences.js';
import { getToolbarSettingsState } from './toolbar-state.js';
import { renderSettingsPopoverContent } from './toolbar-view.js';

function renderSettingsPopover() {
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!popover) return;
  popover.innerHTML = renderSettingsPopoverContent(getToolbarSettingsState().preferences);
}

function positionSettingsPopover() {
  const button = document.getElementById('toolbarSettingsBtn');
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!button || !popover) return;
  const rect = button.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 16);
  popover.style.width = `${width}px`;
  popover.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))}px`;
  popover.style.top = `${rect.bottom + 8}px`;
}

function openSettingsPopover() {
  const button = document.getElementById('toolbarSettingsBtn');
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!button || !popover) return;
  renderSettingsPopover();
  popover.hidden = false;
  button.classList.add('active');
  button.setAttribute('aria-expanded', 'true');
  positionSettingsPopover();
}

function handleSettingsChange(e) {
  const action = e.target.dataset.displayAction;
  if (action === 'ui-scale') {
    setDisplayPreferences({ uiScale: e.target.value });
    bus.emit('status:update', { text: `UI scale ${e.target.value}%`, isError: false });
  } else if (action === 'chart-text-scale') {
    setDisplayPreferences({ chartTextScale: e.target.value });
    bus.emit('status:update', { text: `Chart text ${e.target.value}`, isError: false });
  } else if (action === 'inspector-density') {
    setDisplayPreferences({ inspectorDensity: e.target.value });
    bus.emit('status:update', { text: `Inspector density ${e.target.value}`, isError: false });
  }
}

function handleSettingsClick(e) {
  const actionEl = e.target.closest('[data-display-action]');
  if (actionEl?.dataset.displayAction !== 'reset-defaults') return;
  resetDisplayPreferences();
  bus.emit('status:update', { text: 'Display setup reset', isError: false });
}

export function initToolbarSettingsController({ closePeers = () => {} } = {}) {
  const button = document.getElementById('toolbarSettingsBtn');
  const popover = document.getElementById('toolbarSettingsPopover');

  function close() {
    if (!button || !popover || popover.hidden) return;
    popover.hidden = true;
    button.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    if (!popover || popover.hidden) {
      closePeers();
      openSettingsPopover();
      return;
    }
    close();
  }

  button?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  popover?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  popover?.addEventListener('change', handleSettingsChange);
  popover?.addEventListener('click', handleSettingsClick);
  bus.on('display-preferences:changed', renderSettingsPopover);

  return { close, toggle, render: renderSettingsPopover };
}
