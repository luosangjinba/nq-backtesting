import {
  hexColorOpacityPercent,
  hexColorWithOpacity,
  hexColorWithoutAlpha,
  normalizeHexAlphaColor,
} from '../workstation-settings/public.js';

if (typeof globalThis.HTMLElement !== 'undefined' && typeof globalThis.customElements !== 'undefined') {
  await import('../../node_modules/vanilla-colorful/hex-alpha-color-picker.js');
}

const PALETTE = Object.freeze([
  '#ffffff', '#e8e8e8', '#bdbdbd', '#969696', '#707070', '#525252', '#3b3b3b', '#262626', '#171717', '#000000',
  '#ff5252', '#ff9800', '#ffeb3b', '#4caf50', '#16b5a6', '#00bcd4', '#4285f4', '#7c4dff', '#9c27b0', '#e91e63',
  '#ffcdd2', '#ffe0b2', '#fff9c4', '#c8e6c9', '#b2dfdb', '#b2ebf2', '#bbdefb', '#d1c4e9', '#e1bee7', '#f8bbd0',
  '#ef9a9a', '#ffcc80', '#fff59d', '#a5d6a7', '#80cbc4', '#80deea', '#90caf9', '#b39ddb', '#ce93d8', '#f48fb1',
  '#e57373', '#ffb74d', '#fff176', '#81c784', '#4db6ac', '#4dd0e1', '#64b5f6', '#9575cd', '#ba68c8', '#f06292',
  '#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#26a69a', '#26c6da', '#42a5f5', '#7e57c2', '#ab47bc', '#ec407a',
  '#c62828', '#ef6c00', '#f9a825', '#2e7d32', '#00796b', '#00838f', '#1565c0', '#4527a0', '#6a1b9a', '#ad1457',
]);

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  for (const child of children) if (child) node.append(child);
  return node;
}

function swatch(color, label, onChoose) {
  const button = element('button', { className: 'workstation-color-swatch', type: 'button' });
  button.style.setProperty('--swatch-color', color);
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', () => onChoose(color));
  return button;
}

function subscribePickerEvents(
  button,
  close,
  commit,
  handleDocumentKey,
  handleDocumentPointer,
  hidden,
  isOpen,
  opacity,
  open,
  placePopover,
  precisePanel,
  precisePicker,
  preciseToggle,
  readCurrent,
  render,
  textInput,
) {
  button.addEventListener('click', () => (isOpen() ? close() : open()));
  opacity.addEventListener('input', () => commit(hexColorWithOpacity(readCurrent(), opacity.value)));
  preciseToggle.addEventListener('click', () => {
    precisePanel.hidden = !precisePanel.hidden;
    preciseToggle.textContent = precisePanel.hidden ? '+' : '−';
    preciseToggle.setAttribute('aria-expanded', String(!precisePanel.hidden));
    placePopover();
  });
  precisePicker.addEventListener('color-changed', (event) => commit(event.detail.value));
  textInput.addEventListener('change', () => {
    if (!commit(textInput.value)) render();
  });
  hidden.addEventListener('input', () => commit(hidden.value));
  document.addEventListener('pointerdown', handleDocumentPointer, true);
  document.addEventListener('keydown', handleDocumentKey, true);
  window.addEventListener('resize', close);
  return () => {
    document.removeEventListener('pointerdown', handleDocumentPointer, true);
    document.removeEventListener('keydown', handleDocumentKey, true);
    window.removeEventListener('resize', close);
  };
}

/** Own one draft-only picker shell; durable Settings and color history remain external. */
export function createColorPickerControl({
  getRecentColors = () => [],
  label,
  name,
  onChange = () => {},
  onOpen = () => {},
}) {
  const hidden = element('input', { type: 'hidden' });
  hidden.name = name;
  const preview = element('span', { className: 'workstation-color-picker-preview' });
  const button = element('button', {
    className: 'workstation-color-picker-button', type: 'button',
  }, [preview]);
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-expanded', 'false');
  button.title = label;
  const palette = element('div', { className: 'workstation-color-palette' });
  palette.setAttribute('aria-label', 'Color palette');
  for (const color of PALETTE) {
    palette.append(swatch(color, `Choose ${color}`, chooseBaseColor));
  }
  const recentLabel = element('span', { className: 'workstation-color-picker-section-label', text: 'Recent' });
  const recent = element('div', { className: 'workstation-color-recent' });
  const recentSection = element('section', { className: 'workstation-color-recent-section' }, [recentLabel, recent]);
  const opacity = element('input', { type: 'range' });
  opacity.min = '0';
  opacity.max = '100';
  opacity.step = '1';
  opacity.setAttribute('aria-label', 'Opacity');
  const opacityValue = element('output', { className: 'workstation-color-opacity-value' });
  const preciseToggle = element('button', {
    className: 'workstation-color-precise-toggle', text: '+', type: 'button',
  });
  preciseToggle.setAttribute('aria-label', 'Open precise color controls');
  preciseToggle.setAttribute('aria-expanded', 'false');
  const precisePicker = document.createElement('hex-alpha-color-picker');
  precisePicker.className = 'workstation-color-precise-picker';
  const textInput = element('input', { className: 'workstation-color-hex-input', type: 'text' });
  textInput.setAttribute('aria-label', 'Hex color with alpha');
  textInput.autocomplete = 'off';
  textInput.spellcheck = false;
  const precisePanel = element('div', { className: 'workstation-color-precise-panel' }, [
    precisePicker,
    textInput,
  ]);
  precisePanel.hidden = true;
  const popover = element('div', { className: 'workstation-color-picker-popover' }, [
    palette,
    recentSection,
    element('div', { className: 'workstation-color-picker-tools' }, [preciseToggle]),
    element('div', { className: 'workstation-color-opacity' }, [
      element('span', { text: 'Opacity' }), opacity, opacityValue,
    ]),
    precisePanel,
  ]);
  popover.hidden = true;
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `${label} picker`);
  const root = element('span', { className: 'workstation-color-picker' }, [hidden, button, popover]);
  let current = '#000000ff';
  let opened = false;

  function render() {
    hidden.value = current;
    preview.style.backgroundColor = current;
    opacity.value = String(hexColorOpacityPercent(current));
    opacityValue.value = `${opacity.value}%`;
    precisePicker.color = current;
    textInput.value = current.toUpperCase();
    for (const item of palette.children) {
      item.setAttribute('aria-pressed', String(
        normalizeHexAlphaColor(item.style.getPropertyValue('--swatch-color'))?.slice(0, 7)
          === current.slice(0, 7),
      ));
    }
  }

  function commit(value, emit = true) {
    const normalized = normalizeHexAlphaColor(value);
    if (normalized === null || normalized === current) return false;
    current = normalized;
    render();
    if (emit) onChange(current);
    return true;
  }

  function chooseBaseColor(value) {
    const base = hexColorWithoutAlpha(value);
    if (base !== null) commit(hexColorWithOpacity(base, opacity.value));
  }

  function populateRecent() {
    recent.replaceChildren();
    const values = getRecentColors();
    recentSection.hidden = !Array.isArray(values) || values.length === 0;
    if (!Array.isArray(values)) return;
    for (const color of values) {
      const normalized = normalizeHexAlphaColor(color);
      if (normalized !== null) recent.append(swatch(
        normalized,
        `Choose recent color ${normalized}`,
        () => commit(normalized),
      ));
    }
  }

  function placePopover() {
    const rect = button.getBoundingClientRect();
    const width = 294;
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width));
    const preferredTop = rect.bottom + 8;
    const estimatedHeight = precisePanel.hidden ? 315 : 515;
    const top = Math.max(12, Math.min(preferredTop, window.innerHeight - estimatedHeight - 12));
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function open() {
    if (opened) return;
    onOpen();
    opened = true;
    populateRecent();
    popover.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    placePopover();
  }

  function close({ restoreFocus = false } = {}) {
    if (!opened) return;
    opened = false;
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  }

  function handleDocumentPointer(event) {
    if (opened && !root.contains(event.target)) close();
  }

  function handleDocumentKey(event) {
    if (opened && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close({ restoreFocus: true });
    }
  }

  const disposeEvents = subscribePickerEvents(button, close, commit, handleDocumentKey,
    handleDocumentPointer, hidden, () => opened, opacity, open, placePopover, precisePanel,
    precisePicker, preciseToggle, () => current, render, textInput);
  render();

  return Object.freeze({
    close,
    dispose() {
      disposeEvents();
      root.remove();
    },
    focus: () => button.focus(),
    input: hidden,
    root,
    get value() { return current; },
    set value(value) {
      const normalized = normalizeHexAlphaColor(value);
      if (normalized === null) throw new TypeError(`${label} requires a hex color.`);
      current = normalized;
      render();
    },
  });
}
