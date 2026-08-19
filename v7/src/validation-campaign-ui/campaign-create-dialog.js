import { button, element, field } from './dom.js';

/** Own the bounded Campaign-creation modal and nothing else. */
export function createCampaignDialog(runtime, onRefresh) {
  const dialog = element('dialog', { className: 'validation-dialog' });
  let returnFocus = null;
  const form = element('form', { className: 'validation-form' });
  const values = {
    authorLabel: element('input', { name: 'authorLabel', value: 'Local researcher' }),
    contextTimeframeId: element('input', {
      name: 'contextTimeframeId', value: 'timeframe.display-5-minute',
    }),
    direction: element('select', { name: 'direction' }, [
      element('option', { value: 'long', text: 'Long' }),
      element('option', { value: 'short', text: 'Short' }),
    ]),
    executionTimeframeId: element('input', {
      name: 'executionTimeframeId', value: 'timeframe.display-1-minute',
    }),
    instrumentId: element('input', { name: 'instrumentId', value: 'instrument.cme.nq' }),
    sessionHoursId: element('select', { name: 'sessionHoursId' }, [
      element('option', { value: 'session-hours.cme-eth', text: 'CME ETH' }),
      element('option', { value: 'session-hours.cme-rth', text: 'CME RTH' }),
    ]),
    title: element('input', { name: 'title', value: 'SMA + manual FVG validation' }),
  };
  const error = element('p', { className: 'validation-dialog-error', role: 'alert' });
  const close = () => {
    dialog.close();
    returnFocus?.focus();
    returnFocus = null;
  };
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  form.append(
    field('Campaign title', values.title),
    element('div', { className: 'validation-form-grid' }, [
      field('Instrument id', values.instrumentId),
      field('Direction', values.direction),
      field('Context timeframe id', values.contextTimeframeId),
      field('Execution timeframe id', values.executionTimeframeId),
      field('Session Hours', values.sessionHoursId),
      field('Author', values.authorLabel),
    ]),
    element('p', {
      className: 'validation-help',
      text: 'Context and Execution are roles; no universal higher-timeframe rule is imposed.',
    }),
    error,
    element('footer', { className: 'validation-dialog-actions' }, [
      button('Cancel', close, 'validation-button validation-button-ghost'),
      button('Create Campaign', async () => {
        error.textContent = '';
        try {
          await runtime.execute({
            authorLabel: values.authorLabel.value,
            contextTimeframeId: values.contextTimeframeId.value,
            direction: values.direction.value,
            executionTimeframeId: values.executionTimeframeId.value,
            expectedIndexRevision: runtime.snapshot().indexRevision,
            instrumentId: values.instrumentId.value,
            kind: 'create-campaign',
            sessionHoursId: values.sessionHoursId.value,
            title: values.title.value,
          });
          close();
          onRefresh();
        } catch (cause) { error.textContent = cause.message; }
      }, 'validation-button validation-button-primary'),
    ]),
  );
  dialog.append(
    element('header', { className: 'validation-dialog-header' }, [
      element('div', {}, [
        element('span', { className: 'validation-eyebrow', text: 'R14.1 tracer bullet' }),
        element('h2', { text: 'New Validation Campaign' }),
      ]),
      button('Close', close, 'validation-button validation-button-ghost'),
    ]),
    form,
  );
  document.body.append(dialog);
  return Object.freeze({
    dispose: () => dialog.remove(),
    open(trigger = null) {
      returnFocus = trigger;
      dialog.showModal();
      values.title.focus();
    },
  });
}
