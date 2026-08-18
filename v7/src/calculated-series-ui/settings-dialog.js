import { createCalculatedSeriesFieldControl } from './field-control.js';
import { errorMessage, uiElement } from './ui-elements.js';

function instanceTabs(schema) {
  return schema.tabs.map((tab) => Object.freeze({
    fields: tab.source.kind === 'settings'
      ? tab.source.fields.filter(({ scopes }) => scopes.includes('instance')) : [],
    id: tab.id,
  })).filter(({ fields }) => fields.length > 0);
}

/** Own one reusable host-rendered instance settings dialog. */
export function createCalculatedSeriesSettingsDialog({ dispatch }) {
  const dialog = uiElement('dialog', { className: 'calculated-series-dialog calculated-series-settings-dialog' });
  document.body.append(dialog);
  let current = null;
  let dirty = false;
  let discardArmed = false;
  let draft = {};
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

  function requestClose() {
    if (dirty && !discardArmed) {
      discardArmed = true;
      const status = dialog.querySelector('[data-dialog-status]');
      if (status) status.textContent = 'Unsaved changes. Choose Discard changes or Apply.';
      const cancel = dialog.querySelector('[data-dialog-cancel]');
      if (cancel) cancel.textContent = 'Discard changes';
      return;
    }
    close();
  }

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });

  function render() {
    const { definition, instance, paneId, snapshot } = current;
    const tabs = instanceTabs(definition.parameterSchema);
    const status = uiElement('p', { className: 'calculated-series-dialog-status' });
    status.dataset.dialogStatus = 'true';
    const tabList = uiElement('div', {
      ariaLabel: 'Indicator setting categories', className: 'calculated-series-tabs',
    });
    tabList.setAttribute('role', 'tablist');
    const panels = [];
    tabs.forEach((tab, index) => {
      const button = uiElement('button', {
        className: 'calculated-series-tab', text: tab.id[0].toUpperCase() + tab.id.slice(1), type: 'button',
      });
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(index === 0));
      const panel = uiElement('section', { className: 'calculated-series-tab-panel' });
      panel.setAttribute('role', 'tabpanel');
      panel.hidden = index !== 0;
      for (const field of tab.fields) {
        const control = createCalculatedSeriesFieldControl({
          effectiveValue: instance.inheritedSettings[field.id],
          field,
          onChange(fieldId, value) {
            draft[fieldId] = value;
            dirty = JSON.stringify(draft) !== JSON.stringify(instance.instanceValues);
            discardArmed = false;
          },
          onReset(fieldId) {
            delete draft[fieldId];
            dirty = JSON.stringify(draft) !== JSON.stringify(instance.instanceValues);
            discardArmed = false;
          },
          overrideValue: draft[field.id],
          resetSource: instance.inheritedSettingSources[field.id],
          source: draft[field.id] === undefined
            ? instance.inheritedSettingSources[field.id] : 'instance',
        });
        panel.append(control.row);
      }
      button.addEventListener('click', () => {
        for (const [candidateIndex, candidate] of panels.entries()) {
          candidate.panel.hidden = candidateIndex !== index;
          candidate.button.setAttribute('aria-selected', String(candidateIndex === index));
        }
        panel.querySelector('input, select, button')?.focus();
      });
      panels.push({ button, panel });
      tabList.append(button);
    });
    const reset = uiElement('button', { text: 'Reset all', type: 'button' });
    reset.addEventListener('click', () => {
      draft = {};
      dirty = JSON.stringify(draft) !== JSON.stringify(instance.instanceValues);
      discardArmed = false;
      render();
    });
    const cancel = uiElement('button', { text: 'Cancel', type: 'button' });
    cancel.dataset.dialogCancel = 'true';
    cancel.addEventListener('click', requestClose);
    const apply = uiElement('button', {
      className: 'is-primary', text: 'Apply', type: 'button',
    });
    apply.addEventListener('click', async () => {
      const invalid = dialog.querySelector('[aria-invalid="true"]');
      if (invalid) {
        status.textContent = 'Correct the highlighted value before applying.';
        invalid.focus();
        return;
      }
      apply.disabled = true;
      status.textContent = 'Applying…';
      try {
        await dispatch({
          expectedDocumentRevision: snapshot.documentRevision,
          expectedInstanceRevision: instance.instanceRevision,
          instanceId: instance.instanceId,
          instanceValues: Object.freeze({ ...draft }),
          kind: 'apply-instance-settings',
          workspacePaneId: paneId,
        });
        dirty = false;
        close();
      } catch (error) {
        status.textContent = errorMessage(error);
        apply.disabled = false;
      }
    });
    dialog.replaceChildren(
      uiElement('header', {}, [
        uiElement('div', {}, [
          uiElement('h2', { text: instance.displayName }),
          uiElement('p', { text: `${definition.packageName} · ${definition.packageVersion} · ${definition.source}` }),
        ]),
      ]),
      tabList,
      ...panels.map(({ panel }) => panel),
      status,
      uiElement('footer', {}, [reset, cancel, apply]),
    );
  }

  return Object.freeze({
    dispose() { dialog.remove(); },
    open({ definition, instance, paneId, snapshot, trigger }) {
      current = { definition, instance, paneId, snapshot };
      draft = { ...instance.instanceValues };
      dirty = false;
      discardArmed = false;
      returnFocus = trigger;
      render();
      dialog.showModal();
      dialog.querySelector('[role="tab"]')?.focus();
    },
  });
}
