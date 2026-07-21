function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  for (const child of children) if (child) node.append(child);
  return node;
}

/** Own product-Pane DOM/host identity without owning Pane or chart state. */
export function createPaneGridView({ onFocus, onReset }) {
  const root = element('div', { className: 'workspace-pane-grid' });
  const records = new Map();

  function createPane(paneId) {
    const symbol = element('strong', { className: 'pane-symbol', text: '—' });
    const timeframe = element('span', { className: 'pane-timeframe', text: '—' });
    const reset = element('button', {
      ariaLabel: `Reset ${paneId} view`, className: 'pane-reset', text: 'Reset', type: 'button',
    });
    const header = element('header', { className: 'workspace-pane-header' }, [
      element('span', { className: 'pane-identity' }, [symbol, timeframe]),
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
    root.append(shell);
    const record = { empty, header, host, reset, shell, symbol, timeframe };
    records.set(paneId, record);
    return record;
  }

  function preparePane(paneId) {
    return (records.get(paneId) ?? createPane(paneId)).host;
  }

  return Object.freeze({
    commitPaneSet({ activePaneId, panes }) {
      root.dataset.count = String(panes.length);
      const accepted = new Set(panes.map(({ paneId }) => paneId));
      for (const pane of panes) {
        const record = records.get(pane.paneId) ?? createPane(pane.paneId);
        root.append(record.shell);
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
      }
    },
    dispose() {
      records.clear();
      root.remove();
    },
    preparePane,
    root,
    setPending(disabled) {
      for (const record of records.values()) record.reset.disabled = disabled;
    },
    setWorkspace({ activePaneId, panes }, labels) {
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
    },
  });
}
