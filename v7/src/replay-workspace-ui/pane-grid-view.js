import {
  createPaneLayout,
  readPaneLayout,
  resizePaneLayout,
} from '../pane-layout-domain/public.js';

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  for (const child of children) if (child) node.append(child);
  return node;
}

function ohlcField(name) {
  const value = element('span', { className: 'pane-ohlc-value', text: '--' });
  const root = element('span', { className: 'pane-ohlc-field' }, [
    element('span', { className: 'pane-ohlc-label', text: name }), value,
  ]);
  root.dataset.field = name.toLowerCase();
  return Object.freeze({ root, value });
}

function formatPrice(value) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : '--';
}

/** Own product-Pane DOM/host identity plus a DOM-only resizable split tree. */
export function createPaneGridView({ initialLayout, onFocus, onLayoutResize, onReset }) {
  const root = element('div', { className: 'workspace-pane-grid' });
  const records = new Map();
  const splitRecords = new Map();
  let layout = initialLayout ?? createPaneLayout();
  let paneIds = ['pane-main'];
  let pending = false;

  function applyRatio(splitId, ratio) {
    const record = splitRecords.get(splitId);
    if (!record) return;
    record.first.style.flexGrow = String(ratio);
    record.second.style.flexGrow = String(1 - ratio);
    record.divider.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  }

  function applyRatios() {
    const value = readPaneLayout(layout);
    for (const [splitId, ratio] of Object.entries(value.ratios)) applyRatio(splitId, ratio);
    root.dataset.layoutId = value.variantId;
  }

  function updateLayout(next) {
    layout = next;
    applyRatios();
  }

  function resizeFromPosition(splitId, record, clientPosition) {
    const rect = record.split.getBoundingClientRect();
    const size = record.axis === 'x' ? rect.width : rect.height;
    const start = record.axis === 'x' ? rect.left : rect.top;
    const dividerSize = record.axis === 'x'
      ? record.divider.getBoundingClientRect().width
      : record.divider.getBoundingClientRect().height;
    updateLayout(resizePaneLayout({
      containerSizePx: size,
      layout,
      ratio: (clientPosition - start - dividerSize / 2) / (size - dividerSize),
      splitId,
    }));
  }

  function bindDivider(divider, splitId, record) {
    const finish = (event, commit) => {
      if (!divider.hasPointerCapture?.(event.pointerId)) return;
      divider.releasePointerCapture(event.pointerId);
      root.dataset.resizing = 'false';
      if (commit) onLayoutResize(layout);
    };
    divider.addEventListener('pointerdown', (event) => {
      if (pending || event.button !== 0) return;
      event.preventDefault();
      divider.setPointerCapture(event.pointerId);
      root.dataset.resizing = 'true';
    });
    divider.addEventListener('pointermove', (event) => {
      if (!divider.hasPointerCapture?.(event.pointerId)) return;
      resizeFromPosition(splitId, record, record.axis === 'x' ? event.clientX : event.clientY);
    });
    divider.addEventListener('pointerup', (event) => finish(event, true));
    divider.addEventListener('pointercancel', (event) => finish(event, false));
    divider.addEventListener('keydown', (event) => {
      if (pending) return;
      const keys = record.axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const current = readPaneLayout(layout).ratios[splitId];
      const direction = event.key === keys[0] ? -1 : 1;
      const rect = record.split.getBoundingClientRect();
      updateLayout(resizePaneLayout({
        containerSizePx: record.axis === 'x' ? rect.width : rect.height,
        layout,
        ratio: current + direction * 0.05,
        splitId,
      }));
      onLayoutResize(layout);
    });
  }

  function renderNode(node) {
    if (node.kind === 'leaf') {
      const branch = element('div', { className: 'workspace-pane-branch workspace-pane-leaf' });
      branch.dataset.paneSlot = String(node.slot + 1);
      const record = records.get(paneIds[node.slot]);
      if (record) branch.append(record.shell);
      return branch;
    }
    const splitRoot = element('div', { className: `workspace-pane-split axis-${node.axis}` });
    splitRoot.dataset.splitId = node.id;
    const first = element('div', { className: 'workspace-pane-branch' }, [renderNode(node.first)]);
    const divider = element('div', {
      ariaLabel: `Resize Pane boundary ${node.id}`,
      className: 'workspace-pane-divider',
    });
    divider.dataset.axis = node.axis;
    divider.dataset.splitId = node.id;
    divider.setAttribute('aria-orientation', node.axis === 'x' ? 'vertical' : 'horizontal');
    divider.setAttribute('aria-valuemin', '5');
    divider.setAttribute('aria-valuemax', '95');
    divider.setAttribute('role', 'separator');
    divider.tabIndex = pending ? -1 : 0;
    const second = element('div', { className: 'workspace-pane-branch' }, [renderNode(node.second)]);
    splitRoot.append(first, divider, second);
    const record = { axis: node.axis, divider, first, second, split: splitRoot };
    splitRecords.set(node.id, record);
    bindDivider(divider, node.id, record);
    return splitRoot;
  }

  function renderLayout() {
    splitRecords.clear();
    root.replaceChildren(renderNode(readPaneLayout(layout).tree));
    applyRatios();
  }

  function createPane(paneId) {
    const symbol = element('strong', { className: 'pane-symbol', text: '—' });
    const timeframe = element('span', { className: 'pane-timeframe', text: '—' });
    const ohlcFields = Object.freeze({
      close: ohlcField('C'),
      high: ohlcField('H'),
      low: ohlcField('L'),
      open: ohlcField('O'),
    });
    const ohlc = element('span', { className: 'pane-ohlc' }, [
      ohlcFields.open.root,
      ohlcFields.high.root,
      ohlcFields.low.root,
      ohlcFields.close.root,
    ]);
    ohlc.dataset.state = 'empty';
    const reset = element('button', {
      ariaLabel: `Reset ${paneId} view`, className: 'pane-reset', text: 'Reset', type: 'button',
    });
    const header = element('header', { className: 'workspace-pane-header' }, [
      element('span', { className: 'pane-status-line' }, [
        element('span', { className: 'pane-identity' }, [symbol, timeframe]),
        ohlc,
      ]),
      reset,
    ]);
    const host = element('div', {
      ariaLabel: `${paneId} replay chart`, className: 'lightweight-chart-host',
    });
    host.dataset.paneId = paneId;
    host.setAttribute('role', 'application');
    host.tabIndex = 0;
    const empty = element('div', { className: 'pane-empty-state', text: 'No eligible source bars' });
    empty.hidden = true;
    const shell = element('section', { className: 'workspace-pane is-prepared' }, [header, host, empty]);
    shell.dataset.paneId = paneId;
    shell.setAttribute('aria-hidden', 'true');
    shell.addEventListener('pointerdown', () => onFocus(paneId), true);
    shell.addEventListener('focusin', () => onFocus(paneId));
    reset.addEventListener('click', (event) => {
      event.stopPropagation();
      onReset(paneId);
    });
    const record = {
      empty, header, host, ohlc, ohlcFields, reset, shell, symbol, timeframe,
    };
    records.set(paneId, record);
    renderLayout();
    return record;
  }

  function preparePane(paneId) {
    return (records.get(paneId) ?? createPane(paneId)).host;
  }

  renderLayout();

  return Object.freeze({
    commitPaneSet({ activePaneId, panes }) {
      const nextPaneIds = panes.map(({ paneId }) => paneId);
      const membershipChanged = nextPaneIds.length !== paneIds.length
        || nextPaneIds.some((paneId, index) => paneId !== paneIds[index]);
      paneIds = nextPaneIds;
      root.dataset.count = String(panes.length);
      const accepted = new Set(paneIds);
      let recordChanged = false;
      for (const pane of panes) {
        let record = records.get(pane.paneId);
        if (!record) {
          record = createPane(pane.paneId);
          recordChanged = true;
        }
        record.shell.classList.remove('is-prepared');
        record.shell.classList.toggle('is-active', pane.paneId === activePaneId);
        record.shell.setAttribute('aria-hidden', 'false');
        record.empty.hidden = pane.status !== 'empty';
        record.empty.textContent = pane.reason === 'no-source-data'
          ? 'No source data for this Pane' : 'No eligible bars at this Replay time';
      }
      for (const [paneId, record] of records) {
        if (accepted.has(paneId)) continue;
        record.shell.remove();
        records.delete(paneId);
        recordChanged = true;
      }
      if (membershipChanged || recordChanged) renderLayout();
    },
    dispose() {
      records.clear();
      splitRecords.clear();
      root.remove();
    },
    preparePane,
    root,
    setLayout(nextLayout, nextPaneIds = paneIds) {
      const value = readPaneLayout(nextLayout);
      if (value.paneCount !== nextPaneIds.length) {
        throw new TypeError('Pane layout leaf count must match the planned Pane set.');
      }
      const unchanged = nextLayout === layout && nextPaneIds.length === paneIds.length
        && nextPaneIds.every((paneId, index) => paneId === paneIds[index]);
      layout = nextLayout;
      paneIds = [...nextPaneIds];
      if (unchanged) applyRatios();
      else renderLayout();
    },
    setPending(disabled) {
      pending = disabled === true;
      for (const record of records.values()) record.reset.disabled = pending;
      for (const { divider } of splitRecords.values()) {
        divider.setAttribute('aria-disabled', String(pending));
        divider.tabIndex = pending ? -1 : 0;
      }
    },
    setPaneOhlc(panes) {
      for (const pane of panes) {
        const record = records.get(pane.paneId);
        if (!record) continue;
        const bar = pane.bar;
        record.ohlc.dataset.state = pane.state;
        record.shell.dataset.ohlcState = pane.state;
        record.ohlc.dataset.direction = !bar ? 'empty'
          : bar.close > bar.open ? 'up' : bar.close < bar.open ? 'down' : 'flat';
        for (const field of ['open', 'high', 'low', 'close']) {
          record.ohlcFields[field].value.textContent = formatPrice(bar?.[field]);
        }
      }
    },
    setTruncationSelection(active) {
      root.dataset.truncationSelection = active === true ? 'active' : 'inactive';
    },
    setWorkspace({ activePaneId, panes }, labels) {
      const nextPaneIds = panes.map(({ paneId }) => paneId);
      const membershipChanged = nextPaneIds.length !== paneIds.length
        || nextPaneIds.some((paneId, index) => paneId !== paneIds[index]);
      paneIds = nextPaneIds;
      root.dataset.activePaneId = activePaneId;
      root.dataset.count = String(panes.length);
      for (const pane of panes) {
        const record = records.get(pane.paneId) ?? createPane(pane.paneId);
        record.symbol.textContent = labels.instrument(pane.instrumentId);
        record.timeframe.textContent = labels.timeframe(pane.timeframeId);
        record.shell.classList.toggle('is-active', pane.paneId === activePaneId);
        record.shell.dataset.instrumentId = pane.instrumentId;
        record.shell.dataset.timeframeId = pane.timeframeId;
      }
      if (membershipChanged) renderLayout();
    },
  });
}
