import { errorMessage, uiElement } from './ui-elements.js';

/** Own the package-neutral Add Indicator search and provenance surface. */
export function createCalculatedSeriesAddDialog({ dispatch }) {
  const dialog = uiElement('dialog', { className: 'calculated-series-dialog calculated-series-add-dialog' });
  document.body.append(dialog);
  let current = null;
  let returnFocus = null;

  function fallbackFocus() {
    if (!current?.paneId) return null;
    return document.querySelector(
      `.workspace-pane[data-pane-id="${CSS.escape(current.paneId)}"] .calculated-series-add-command`,
    );
  }

  function close() {
    if (dialog.open) dialog.close();
    const target = returnFocus;
    returnFocus = null;
    queueMicrotask(() => (target?.isConnected ? target : fallbackFocus())?.focus());
  }
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });

  function renderCatalog(query = '') {
    const list = dialog.querySelector('[data-indicator-list]');
    if (!list) return;
    list.replaceChildren();
    const matches = current.snapshot.catalog.filter((entry) => (
      `${entry.displayName} ${entry.packageName} ${entry.shortName}`.toLowerCase()
        .includes(query.trim().toLowerCase())
    ));
    if (matches.length === 0) {
      list.append(uiElement('p', { text: 'No enabled Indicator matches this search.' }));
      return;
    }
    for (const definition of matches) {
      const add = uiElement('button', {
        className: 'calculated-series-definition-add', text: 'Add', type: 'button',
      });
      add.addEventListener('click', async () => {
        const status = dialog.querySelector('[data-dialog-status]');
        add.disabled = true;
        status.textContent = 'Adding…';
        try {
          await dispatch({
            definitionRef: definition.definitionRef,
            expectedDocumentRevision: current.snapshot.documentRevision,
            instanceValues: Object.freeze({}),
            kind: 'add-instance',
            workspacePaneId: current.paneId,
          });
          close();
        } catch (error) {
          status.textContent = errorMessage(error);
          add.disabled = false;
        }
      });
      list.append(uiElement('article', { className: 'calculated-series-definition-card' }, [
        uiElement('div', {}, [
          uiElement('strong', { text: definition.displayName }),
          uiElement('span', { text: `${definition.packageName} · ${definition.packageVersion}` }),
          uiElement('span', { text: definition.source }),
        ]),
        add,
      ]));
    }
  }

  return Object.freeze({
    dispose() { dialog.remove(); },
    open({ paneId, snapshot, trigger }) {
      current = { paneId, snapshot };
      returnFocus = trigger;
      const search = uiElement('input', {
        ariaLabel: 'Search enabled Indicators', className: 'calculated-series-search', type: 'search',
      });
      const list = uiElement('div', { className: 'calculated-series-definition-list' });
      list.dataset.indicatorList = 'true';
      const status = uiElement('p', { className: 'calculated-series-dialog-status' });
      status.dataset.dialogStatus = 'true';
      const cancel = uiElement('button', { text: 'Cancel', type: 'button' });
      cancel.addEventListener('click', close);
      search.addEventListener('input', () => renderCatalog(search.value));
      dialog.replaceChildren(
        uiElement('header', {}, [
          uiElement('h2', { text: 'Add Indicator' }),
          uiElement('p', { text: 'Enabled trusted definitions for this Workspace Pane.' }),
        ]),
        search,
        list,
        status,
        uiElement('footer', {}, [cancel]),
      );
      renderCatalog();
      dialog.showModal();
      search.focus();
    },
  });
}
