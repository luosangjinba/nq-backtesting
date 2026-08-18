import {
  displayIndicatorValue,
  errorMessage,
  sameDefinition,
  uiElement,
} from './ui-elements.js';

function stateText(instance) {
  return {
    empty: 'No values', error: 'Error', hidden: 'Hidden', pending: 'Pending', ready: 'Ready',
    unavailable: 'Unavailable', unresolved: 'Unresolved',
  }[instance.state] ?? instance.state;
}

/** Own only the Indicator command and legend DOM attached to one product Pane. */
export function createCalculatedSeriesPaneView({
  dispatch,
  onAdd,
  onSettings,
  paneId,
  shell,
}) {
  const add = uiElement('button', {
    ariaLabel: `Add Indicator to ${paneId}`,
    className: 'calculated-series-add-command',
    text: 'Indicators',
    type: 'button',
  });
  const legend = uiElement('div', {
    ariaLabel: `Indicators in ${paneId}`, className: 'calculated-series-legend',
  });
  const feedback = uiElement('div', { className: 'calculated-series-pane-feedback' });
  feedback.setAttribute('role', 'status');
  const root = uiElement('section', { className: 'calculated-series-pane-ui' }, [add, legend, feedback]);
  shell.append(root);
  let disabled = false;
  let observation = null;
  let snapshot = null;

  async function command(value, trigger) {
    if (disabled || snapshot?.busy) return;
    feedback.textContent = 'Updating…';
    try {
      await dispatch(value);
      feedback.textContent = '';
    } catch (error) {
      feedback.textContent = errorMessage(error);
      trigger?.focus();
    }
  }

  function commonCommand(instance, kind) {
    return {
      expectedDocumentRevision: snapshot.documentRevision,
      expectedInstanceRevision: instance.instanceRevision,
      instanceId: instance.instanceId,
      kind,
      workspacePaneId: paneId,
    };
  }

  function actionButton(text, action) {
    const button = uiElement('button', { text, type: 'button' });
    button.addEventListener('click', () => action(button));
    return button;
  }

  function renderResolved(instance) {
    const definition = snapshot.catalog.find((entry) => (
      sameDefinition(entry.definitionRef, instance.definitionRef)
    ));
    const details = uiElement('details', { className: 'calculated-series-legend-actions' });
    const menu = uiElement('summary', { text: 'Actions' });
    details.append(menu);
    if (definition) {
      details.append(actionButton('Settings', (trigger) => {
        details.open = false;
        onSettings({ definition, instance, paneId, snapshot, trigger });
      }));
    }
    details.append(actionButton(instance.visibility === 'hidden' ? 'Show' : 'Hide', (trigger) => (
      command({ ...commonCommand(instance, 'set-instance-visibility'),
        visible: instance.visibility === 'hidden' }, trigger)
    )));
    if (instance.placement === 'main') {
      details.append(actionButton('Move to New Region', (trigger) => (
        command(commonCommand(instance, 'move-plot-group-to-new-region'), trigger)
      )));
    } else {
      details.append(actionButton('Move to Main', (trigger) => (
        command(commonCommand(instance, 'move-plot-group-to-main'), trigger)
      )));
    }
    details.append(actionButton('Remove', (trigger) => (
      command(commonCommand(instance, 'remove-instance'), trigger)
    )));
    const value = instance.visibility === 'visible' && instance.state === 'ready'
      ? displayIndicatorValue(instance.latestValue) : '—';
    const row = uiElement('article', { className: 'calculated-series-legend-row' }, [
      uiElement('span', { className: 'calculated-series-legend-name', text: instance.legendLabel }),
      uiElement('output', { className: 'calculated-series-legend-value', text: value }),
      uiElement('span', { className: `calculated-series-legend-state state-${instance.state}`, text: stateText(instance) }),
      details,
    ]);
    row.dataset.instanceId = instance.instanceId;
    row.dataset.regionId = instance.regionId;
    return row;
  }

  function renderUnresolved(instance) {
    const remove = actionButton('Remove', (trigger) => command({
      expectedDocumentRevision: snapshot.documentRevision,
      expectedInstanceRevision: instance.instanceRevision,
      instanceId: instance.instanceId,
      kind: 'remove-instance',
      workspacePaneId: paneId,
    }, trigger));
    const row = uiElement('article', { className: 'calculated-series-legend-row is-unresolved' }, [
      uiElement('span', { className: 'calculated-series-legend-name', text: instance.displayName }),
      uiElement('output', { className: 'calculated-series-legend-value', text: '—' }),
      uiElement('span', { className: 'calculated-series-legend-state state-unresolved', text: 'Unresolved' }),
      remove,
    ]);
    row.title = `${instance.packageName} · ${instance.reasonCode}`;
    row.dataset.instanceId = instance.instanceId;
    return row;
  }

  function render(nextSnapshot, legendView) {
    snapshot = nextSnapshot;
    add.disabled = disabled || snapshot.busy || snapshot.status !== 'ready';
    legend.replaceChildren(
      ...legendView.instances.map(renderResolved),
      ...legendView.unresolvedInstances.map(renderUnresolved),
    );
    root.dataset.instanceCount = String(
      legendView.instances.length + legendView.unresolvedInstances.length,
    );
    root.dataset.runtimeStatus = snapshot.status;
  }

  add.addEventListener('click', () => onAdd({ paneId, snapshot, trigger: add }));
  return Object.freeze({
    dispose() { root.remove(); },
    render,
    setCrosshairObservation(value) { observation = value; },
    readDisplayEpochMs() {
      return observation?.state === 'selected' ? observation.displayEpochMs : null;
    },
    setWorkspaceDisabled(value) {
      disabled = value === true;
      if (snapshot) add.disabled = disabled || snapshot.busy || snapshot.status !== 'ready';
    },
  });
}
