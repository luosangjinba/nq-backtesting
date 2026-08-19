import { caseReference } from './campaign-case-model.js';
import { button, element, field } from './dom.js';

function option(value, text) { return element('option', { value, text }); }

/** Own explicit immutable Cohort membership, exclusions, and override reasons. */
export function createCohortFreezeDialog({ onRefresh, runtime }) {
  const dialog = element('dialog', { className: 'validation-dialog validation-cohort-dialog' });
  let returnFocus = null;
  const close = () => {
    dialog.close();
    returnFocus?.focus();
    returnFocus = null;
  };
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });

  function open(campaignId, trigger) {
    returnFocus = trigger ?? null;
    const documentValue = runtime.getCampaign(campaignId);
    const finalized = documentValue.caseRevisions.filter(({ lifecycleState }) => (
      lifecycleState === 'finalized'
    ));
    const name = element('input', {
      name: 'cohortName', value: `Frozen cohort ${documentValue.cohorts.length + 1}`,
    });
    const author = element('input', {
      name: 'cohortAuthor', value: documentValue.campaign.authorLabel,
    });
    const parent = element('select', { name: 'parentCohort' }, [
      option('', 'No parent Cohort'),
      ...documentValue.cohorts.map((entry) => option(
        `${entry.cohortId}:${entry.cohortRevision}`,
        `${entry.name} · ${entry.memberCaseRefs.length} members`,
      )),
    ]);
    const rows = finalized.map((record) => {
      const choice = element('select', { name: `case-${record.caseId}-${record.caseRevision}` }, [
        option('include', 'Include'),
        option('exclude', 'Exclude with reason'),
      ]);
      const reason = element('input', {
        disabled: true,
        placeholder: 'Why is this finalized revision excluded?',
        value: '',
      });
      choice.addEventListener('change', () => { reason.disabled = choice.value !== 'exclude'; });
      return Object.freeze({ choice, reason, record });
    });
    const error = element('p', { className: 'validation-dialog-error', role: 'alert' });
    const submit = button('Freeze Cohort', async () => {
      error.textContent = '';
      try {
        const members = rows.filter(({ choice }) => choice.value === 'include');
        const excluded = rows.filter(({ choice }) => choice.value === 'exclude');
        if (excluded.some(({ reason }) => reason.value.trim().length === 0)) {
          throw new TypeError('Every excluded Case revision needs an explicit reason.');
        }
        const parentEntry = documentValue.cohorts.find((entry) => (
          `${entry.cohortId}:${entry.cohortRevision}` === parent.value
        )) ?? null;
        await runtime.execute({
          authorLabel: author.value,
          campaignId,
          excludedCaseRefs: excluded.map(({ record }) => caseReference(record)),
          expectedDocumentRevision: runtime.getCampaign(campaignId).documentRevision,
          kind: 'freeze-cohort',
          manualOverrideReasons: excluded.map(({ reason, record }) => ({
            caseRef: caseReference(record),
            kind: 'manual-exclude',
            reason: reason.value.trim(),
          })),
          memberCaseRefs: members.map(({ record }) => caseReference(record)),
          name: name.value,
          parentCohortRef: parentEntry === null ? null : {
            cohortContentDigest: parentEntry.contentDigest,
            cohortId: parentEntry.cohortId,
            cohortRevision: parentEntry.cohortRevision,
          },
        });
        close();
        onRefresh();
      } catch (cause) { error.textContent = cause?.message ?? 'Cohort could not be frozen.'; }
    }, 'validation-button validation-button-primary');
    submit.disabled = finalized.length === 0;
    const cases = finalized.length === 0
      ? element('p', { text: 'Finalize at least one Case revision before freezing a Cohort.' })
      : element('div', { className: 'validation-cohort-members' }, rows.map(({ choice, reason, record }) => (
        element('article', { className: 'validation-cohort-member' }, [
          element('div', {}, [
            element('strong', { text: `Case ${record.caseId.slice(0, 8)} r${record.caseRevision}` }),
            element('span', { text: `${record.qualificationClass} · ${record.outcomeObservation.outcomeClass}` }),
          ]),
          field('Disposition', choice),
          field('Override reason', reason),
        ])
      )));
    dialog.replaceChildren(
      element('header', { className: 'validation-dialog-header' }, [
        element('div', {}, [
          element('span', { className: 'validation-eyebrow', text: 'Immutable membership' }),
          element('h2', { text: 'Freeze Cohort' }),
        ]),
        button('Close', close, 'validation-button validation-button-ghost'),
      ]),
      element('form', { className: 'validation-form' }, [
        field('Cohort name', name),
        element('div', { className: 'validation-form-grid' }, [
          field('Author', author),
          field('Parent Cohort', parent),
        ]),
        cases,
        error,
        element('footer', { className: 'validation-dialog-actions' }, [
          button('Cancel', close, 'validation-button validation-button-ghost'),
          submit,
        ]),
      ]),
    );
    if (!dialog.isConnected) document.body.append(dialog);
    dialog.showModal();
  }

  return Object.freeze({ dispose: () => dialog.remove(), open });
}
