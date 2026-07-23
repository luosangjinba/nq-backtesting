import { readWorkspacePaneIdentity } from './pane-identity.js';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  for (const child of children) if (child) node.append(child);
  return node;
}

function iconButton({ ariaLabel, className, icon }) {
  const button = element('button', {
    ariaLabel,
    className: `pane-overlay-button ${className}`,
    type: 'button',
  });
  button.innerHTML = icon;
  button.title = ariaLabel;
  return button;
}

function ohlcField(name) {
  const value = element('span', { className: 'pane-ohlc-value', text: '--' });
  const root = element('span', { className: 'pane-ohlc-field' }, [
    element('span', { className: 'pane-ohlc-label', text: name }), value,
  ]);
  root.dataset.field = name.toLowerCase();
  return Object.freeze({ root, value });
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '(--%)';
  const number = Number(value);
  return `(${number > 0 ? '+' : ''}${number.toFixed(2)}%)`;
}

/** Format one optional source-volume value for the compact Pane status line. */
export function formatPaneVolume(value) {
  if (!Number.isFinite(value)) return '—';
  const number = Number(value);
  const units = [
    { divisor: 1_000_000_000, suffix: 'B' },
    { divisor: 1_000_000, suffix: 'M' },
    { divisor: 1_000, suffix: 'K' },
  ];
  const unit = units.find(({ divisor }) => Math.abs(number) >= divisor);
  if (!unit) return String(number);
  return `${(number / unit.divisor).toFixed(2).replace(/\.?0+$/, '')}${unit.suffix}`;
}

export function formatPaneTimeframeLabel(label) {
  const value = String(label ?? '—');
  return /^\d+m$/.test(value) ? value.slice(0, -1) : value;
}

const MAXIMIZE_ICON = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 7V3h4M11 3h4v4M15 11v4h-4M7 15H3v-4"/></svg>';
const RESTORE_ICON = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M7 3H3v4M11 3h4v4M15 11v4h-4M7 15H3v-4"/><path d="M6 6h6v6H6z"/></svg>';
const RESET_ICON = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M5 5H2V2M2.7 5.1A7 7 0 1 1 2 10"/></svg>';

/** Own the DOM-only status and local chart controls over one Pane Canvas. */
export function createPaneOverlayView({ onMaximize, onReset, paneId }) {
  const paneIdentity = readWorkspacePaneIdentity(paneId);
  const paneNumber = element('span', { className: 'pane-number', text: paneIdentity.label });
  const symbol = element('strong', { className: 'pane-symbol', text: '—' });
  const timeframe = element('span', { className: 'pane-timeframe', text: '—' });
  const fields = Object.freeze({
    close: ohlcField('C'),
    high: ohlcField('H'),
    low: ohlcField('L'),
    open: ohlcField('O'),
  });
  const ohlc = element('span', { className: 'pane-ohlc' }, [
    fields.open.root,
    fields.high.root,
    fields.low.root,
    fields.close.root,
  ]);
  ohlc.dataset.state = 'empty';
  const changeValue = element('span', { className: 'pane-change-value', text: '--' });
  const changePercent = element('span', { className: 'pane-change-percent', text: '(--%)' });
  const change = element('span', { className: 'pane-change' }, [changeValue, changePercent]);
  change.dataset.direction = 'empty';
  const volumeValue = element('span', { className: 'pane-volume-value', text: '—' });
  const volume = element('span', { className: 'pane-volume' }, [
    element('span', { className: 'pane-volume-label', text: 'Vol ' }), volumeValue,
  ]);
  volume.hidden = true;

  const maximize = iconButton({
    ariaLabel: `Maximize Pane ${paneIdentity.number} chart`, className: 'pane-maximize', icon: MAXIMIZE_ICON,
  });
  maximize.setAttribute('aria-pressed', 'false');
  const reset = iconButton({
    ariaLabel: `Reset Pane ${paneIdentity.number} view`, className: 'pane-reset', icon: RESET_ICON,
  });
  const controls = element('span', { className: 'pane-overlay-controls' }, [maximize, reset]);
  const header = element('header', { className: 'workspace-pane-header' }, [
    element('span', { className: 'pane-status-line' }, [
      element('span', { className: 'pane-identity' }, [paneNumber, symbol, timeframe]),
      ohlc,
      change,
      volume,
    ]),
  ]);
  const root = element('div', { className: 'pane-overlay-layer' }, [header, controls]);
  let observation = Object.freeze({ bar: null, change: null, state: 'empty' });
  let pricePresentation = Object.freeze({
    format: (value) => Number.isFinite(value) ? Number(value).toFixed(2) : '--',
    formatSigned(value) {
      if (!Number.isFinite(value)) return '--';
      const number = Number(value);
      return `${number > 0 ? '+' : ''}${number.toFixed(2)}`;
    },
  });

  function renderOhlc() {
    const { bar, change: changeObservation, state } = observation;
    const direction = !bar ? 'empty'
      : bar.close > bar.open ? 'up' : bar.close < bar.open ? 'down' : 'flat';
    ohlc.dataset.direction = direction;
    ohlc.dataset.state = state;
    for (const field of ['open', 'high', 'low', 'close']) {
      fields[field].value.textContent = pricePresentation.format(bar?.[field]);
    }
    change.dataset.direction = !changeObservation ? 'empty'
      : changeObservation.value > 0 ? 'up' : changeObservation.value < 0 ? 'down' : 'flat';
    changeValue.textContent = pricePresentation.formatSigned(changeObservation?.value);
    changePercent.textContent = formatPercent(changeObservation?.percent);
    volumeValue.textContent = formatPaneVolume(bar?.volume);
  }

  maximize.addEventListener('click', (event) => {
    event.stopPropagation();
    onMaximize(paneId);
  });
  reset.addEventListener('click', (event) => {
    event.stopPropagation();
    onReset(paneId);
  });

  return Object.freeze({
    root,
    setControlVisibility(value) {
      if (!['always', 'hidden', 'hover'].includes(value)) {
        throw new TypeError('Pane controls require hover, always, or hidden visibility.');
      }
      controls.dataset.visibility = value;
    },
    setControlState({ maximized, multiPane, pending }) {
      const maximizeLabel = `${maximized ? 'Restore' : 'Maximize'} Pane ${paneIdentity.number} chart`;
      maximize.hidden = !multiPane;
      maximize.disabled = pending;
      maximize.setAttribute('aria-label', maximizeLabel);
      maximize.setAttribute('aria-pressed', String(maximized));
      maximize.innerHTML = maximized ? RESTORE_ICON : MAXIMIZE_ICON;
      maximize.title = maximizeLabel;
      reset.disabled = pending;
    },
    setLabels({ instrument, timeframe: timeframeLabel }) {
      symbol.textContent = instrument;
      timeframe.textContent = formatPaneTimeframeLabel(timeframeLabel);
    },
    setOhlc(value) {
      observation = Object.freeze({ bar: value.bar, change: value.change, state: value.state });
      renderOhlc();
    },
    setPricePresentation(value) {
      if (typeof value?.format !== 'function' || typeof value?.formatSigned !== 'function') {
        throw new TypeError('Pane price presentation requires format() and formatSigned().');
      }
      pricePresentation = value;
      renderOhlc();
    },
    setReadoutPresentation(value) {
      if (!value || typeof value.ohlcVisible !== 'boolean'
        || typeof value.changeVisible !== 'boolean'
        || typeof value.volumeVisible !== 'boolean') {
        throw new TypeError('Pane readout presentation requires three visibility values.');
      }
      ohlc.hidden = !value.ohlcVisible;
      change.hidden = !value.changeVisible;
      volume.hidden = !value.volumeVisible;
      root.dataset.changeVisible = String(value.changeVisible);
      root.dataset.ohlcVisible = String(value.ohlcVisible);
      root.dataset.volumeVisible = String(value.volumeVisible);
    },
  });
}
