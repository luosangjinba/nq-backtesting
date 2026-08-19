import { button, element, formatNumber, statusBadge } from './dom.js';

function outcomeText(record) {
  const outcome = record.outcomeObservation;
  return outcome === null ? 'Outcome pending' : [
    outcome.outcomeClass,
    `MFE ${formatNumber(outcome.mfePoints)}`,
    `MAE ${formatNumber(outcome.maePoints)}`,
  ].join(' · ');
}

/** Own exact Analysis member drill-down and raw-context handoff. */
export function createAnalysisDrilldownDialog({ onRawContextIntent, runtime }) {
  const dialog = element('dialog', {
    className: 'validation-dialog validation-drilldown-dialog',
  });
  let returnFocus = null;
  const close = () => {
    dialog.close();
    returnFocus?.focus();
    returnFocus = null;
  };
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });

  function open(campaignId, analysis, metricId, trigger) {
    returnFocus = trigger ?? null;
    const detail = runtime.readAnalysisDrilldown(campaignId, analysis.analysisRunId, metricId);
    const error = element('p', { className: 'validation-dialog-error', role: 'alert' });
    const records = detail.caseRefs.map((reference) => ({
      record: runtime.readCase(campaignId, reference.caseId, reference.caseRevision),
      reference,
    }));
    const members = records.length === 0 ? element('p', {
      className: 'validation-empty-inline', text: 'This exact metric subset contains no Cases.',
    }) : element('div', { className: 'validation-drilldown-members' }, records.map(({
      record, reference,
    }) => {
      const numerator = metricId === 'rate.target-first'
        && record.outcomeObservation?.outcomeClass === 'target-first';
      return element('article', { className: 'validation-drilldown-member' }, [
        element('div', {}, [
          element('strong', {
            text: `Case ${reference.caseId.slice(0, 8)} r${reference.caseRevision}`,
          }),
          statusBadge(record.qualificationClass,
            record.qualificationClass === 'qualified' ? 'good' : 'neutral'),
          metricId === 'rate.target-first'
            ? statusBadge(numerator ? 'Numerator + denominator' : 'Denominator only') : null,
          element('span', { text: outcomeText(record) }),
        ]),
        record.observationContext ? button('Open exact raw context', async () => {
          error.textContent = '';
          try {
            const intent = runtime.prepareRawContextIntent({
              campaignId,
              caseId: reference.caseId,
              caseRevision: reference.caseRevision,
              contextRole: 'observation',
            });
            await onRawContextIntent(intent);
            close();
          } catch (cause) {
            error.textContent = cause?.message ?? 'Raw context is unavailable.';
          }
        }, 'validation-button validation-button-secondary') : null,
      ]);
    }));
    dialog.replaceChildren(
      element('header', { className: 'validation-dialog-header' }, [
        element('div', {}, [
          element('span', { className: 'validation-eyebrow', text: 'Immutable metric lineage' }),
          element('h2', { text: metricId }),
          element('p', { text: `${records.length} exact Case revision(s)` }),
        ]),
        button('Close', close, 'validation-button validation-button-ghost'),
      ]),
      element('section', { className: 'validation-dialog-content' }, [members, error]),
    );
    if (!dialog.isConnected) document.body.append(dialog);
    dialog.showModal();
  }

  return Object.freeze({ dispose: () => dialog.remove(), open });
}
