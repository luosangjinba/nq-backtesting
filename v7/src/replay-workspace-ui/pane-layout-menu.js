import { createPaneLayout, readPaneLayout } from '../pane-layout-domain/public.js';
import { setControlDisabled } from './control-availability.js';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  for (const child of children) if (child) node.append(child);
  return node;
}

function previewNode(node) {
  if (node.kind === 'leaf') return element('span', { className: 'pane-layout-preview-cell' });
  const root = element('span', { className: `pane-layout-preview-split axis-${node.axis}` });
  const first = element('span', { className: 'pane-layout-preview-branch' }, [previewNode(node.first)]);
  const second = element('span', { className: 'pane-layout-preview-branch' }, [previewNode(node.second)]);
  first.style.flexGrow = String(node.ratio);
  second.style.flexGrow = String(1 - node.ratio);
  root.append(first, second);
  return root;
}

function preview(variantId) {
  return element('span', { className: 'pane-layout-preview' }, [
    previewNode(readPaneLayout(createPaneLayout({ variantId })).tree),
  ]);
}

/** Own the layout-picker DOM and dispatch only registered layout ids. */
export function createPaneLayoutMenu({ onChoose, onCrosshairSync, options }) {
  const root = element('div', { className: 'pane-layout-control' });
  const toggle = element('button', {
    ariaLabel: 'Pane layout', className: 'pane-layout-toggle', type: 'button',
  });
  toggle.title = 'Pane layout';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'menu');
  const menu = element('div', { ariaLabel: 'Pane layouts', className: 'pane-layout-menu' });
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  const buttons = new Map();
  let controlDisabled = false;
  let paneCount = 1;

  for (const count of [1, 2, 3, 4]) {
    const choices = options.filter((option) => option.paneCount === count);
    const row = element('section', { ariaLabel: `${count} Pane layouts`, className: 'pane-layout-menu-row' });
    row.append(element('span', { className: 'pane-layout-row-index', text: String(count) }));
    const optionsRoot = element('div', { className: 'pane-layout-options' });
    for (const option of choices) {
      const button = element('button', {
        ariaLabel: option.label, className: 'pane-layout-option', type: 'button',
      }, [preview(option.id)]);
      button.dataset.layoutId = option.id;
      button.setAttribute('role', 'menuitemradio');
      button.setAttribute('aria-checked', 'false');
      button.title = option.label;
      button.addEventListener('click', () => {
        menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        onChoose(option.id);
      });
      buttons.set(option.id, button);
      optionsRoot.append(button);
    }
    row.append(optionsRoot);
    menu.append(row);
  }

  const crosshairSyncInput = element('input', {
    ariaLabel: 'Sync crosshair across Panes', type: 'checkbox',
  });
  const crosshairSync = element('label', { className: 'pane-crosshair-sync' }, [
    element('span', { className: 'pane-layout-sync-label', text: 'Crosshair' }),
    crosshairSyncInput,
    element('span', { className: 'pane-crosshair-sync-track' }),
  ]);
  crosshairSync.title = 'Crosshair is synchronized across all Panes in the layout';
  const syncSection = element('section', { className: 'pane-layout-sync-section' }, [
    element('span', { className: 'pane-layout-sync-title', text: 'SYNC IN LAYOUT' }),
    crosshairSync,
  ]);
  syncSection.setAttribute('aria-label', 'Layout synchronization');
  menu.append(syncSection);

  function updateCrosshairAvailability(preserveVisual = false) {
    setControlDisabled(crosshairSyncInput, {
      disabled: controlDisabled || paneCount < 2,
      preserveVisual: preserveVisual && paneCount >= 2,
    });
  }

  const onToggle = () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  };
  const onDocumentPointerDown = (event) => {
    if (menu.hidden || root.contains(event.target)) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };
  const onDocumentKeydown = (event) => {
    if (event.key !== 'Escape' || menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  };
  toggle.addEventListener('click', onToggle);
  const onCrosshairSyncChange = () => onCrosshairSync(crosshairSyncInput.checked);
  crosshairSyncInput.addEventListener('change', onCrosshairSyncChange);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  document.addEventListener('keydown', onDocumentKeydown);
  root.append(toggle, menu);

  return Object.freeze({
    dispose() {
      toggle.removeEventListener('click', onToggle);
      crosshairSyncInput.removeEventListener('change', onCrosshairSyncChange);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onDocumentKeydown);
      root.remove();
    },
    root,
    setDisabled(nextDisabled, preserveVisual = false) {
      setControlDisabled(toggle, { disabled: nextDisabled, preserveVisual });
      controlDisabled = nextDisabled === true;
      updateCrosshairAvailability(preserveVisual);
    },
    setSync(value) {
      crosshairSyncInput.checked = value.crosshair === true;
      root.dataset.crosshairSync = String(value.crosshair === true);
    },
    setPaneCount(count) {
      paneCount = count;
      updateCrosshairAvailability();
    },
    setValue(variantId) {
      toggle.replaceChildren(preview(variantId));
      for (const [id, button] of buttons) {
        button.setAttribute('aria-checked', String(id === variantId));
      }
    },
  });
}
