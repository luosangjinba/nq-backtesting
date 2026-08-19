import { latestCases, revisionsForCase } from './campaign-case-model.js';
import { button, element, formatNumber, statusBadge } from './dom.js';

function verificationHistory(documentValue, record, citation) {
  const entries = documentValue.sourceVerifications.filter((verification) => (
    verification.caseRef.caseId === record.caseId
      && verification.caseRef.caseRevision === record.caseRevision
      && verification.citationRef.citationId === citation.citationId
  )).sort((left, right) => right.checkedAtEpochMs - left.checkedAtEpochMs);
  if (entries.length === 0) {
    return element('p', { className: 'validation-empty-inline', text: 'Not explicitly verified yet.' });
  }
  return element('ul', { className: 'validation-verification-history' }, entries.map((entry) => (
    element('li', {}, [
      statusBadge(entry.result, entry.result === 'match' ? 'good' : 'warn'),
      element('span', {
        text: `${new Date(entry.checkedAtEpochMs).toISOString()} · ${entry.reasonCode}`,
      }),
      element('small', { text: entry.detail }),
    ])
  )));
}

function citationView(documentValue, record, citation, actions) {
  const context = citation.observationContext;
  const claim = citation.boundedClaim;
  const valueText = claim.claimKind === 'sma-close-comparison'
    ? `close ${formatNumber(claim.close)} · SMA ${formatNumber(claim.sma)} · ${claim.comparison}`
    : `${claim.direction} · ${formatNumber(claim.lowerPrice)}–${formatNumber(claim.upperPrice)}`;
  return element('article', {
    className: 'validation-citation',
    dataset: { evidenceRole: citation.evidenceRole },
  }, [
    element('header', { className: 'validation-card-heading' }, [
      element('strong', { text: citation.evidenceRole }),
      statusBadge(citation.sourceAvailabilityAtCapture, 'good'),
    ]),
    element('p', { text: valueText }),
    element('dl', { className: 'validation-evidence-details' }, [
      element('div', {}, [element('dt', { text: 'Source' }), element('dd', {
        text: `${citation.sourceReference.sourceRecordId} r${citation.sourceReference.sourceRecordRevision}`,
      })]),
      element('div', {}, [element('dt', { text: 'Pane' }), element('dd', {
        text: `${context.paneRole} · ${context.paneId} · ${context.timeframeId}`,
      })]),
      element('div', {}, [element('dt', { text: 'Cutoff' }), element('dd', {
        text: new Date(context.exclusiveReplayCutoffEpochMs).toISOString(),
      })]),
      element('div', {}, [element('dt', { text: 'Provider' }), element('dd', {
        text: `${citation.providerIdentity.providerId}@${citation.providerIdentity.providerVersion}`,
      })]),
    ]),
    element('div', { className: 'validation-row-actions' }, [
      button('Verify this source', () => actions.onVerify(record, citation),
        'validation-button validation-button-secondary'),
    ]),
    element('h4', { text: 'Verification history' }),
    verificationHistory(documentValue, record, citation),
  ]);
}

function revisionView(documentValue, record, latestRevision, actions) {
  return element('article', {
    className: 'validation-case-revision',
    dataset: { caseId: record.caseId, caseRevision: record.caseRevision },
  }, [
    element('div', { className: 'validation-card-heading' }, [
      element('div', {}, [
        element('strong', {
          text: `Revision ${record.caseRevision} · ${record.qualificationClass} · ${record.lifecycleState}`,
        }),
        element('p', { text: record.outcomeObservation
          ? `${record.outcomeObservation.outcomeClass} · MFE ${formatNumber(record.outcomeObservation.mfePoints)} · MAE ${formatNumber(record.outcomeObservation.maePoints)}`
          : 'Outcome pending' }),
      ]),
      element('div', { className: 'validation-row-actions' }, [
        record.caseRevision === latestRevision && record.lifecycleState === 'outcome-recorded'
          ? button('Finalize', () => actions.onFinalize(record)) : null,
        record.observationContext
          ? button('Open this raw context', () => actions.onRawContext(record)) : null,
      ]),
    ]),
    record.notes ? element('p', { className: 'validation-case-notes', text: record.notes }) : null,
    record.evidenceCitations.length === 0
      ? element('p', { className: 'validation-empty-inline', text: 'No frozen citations.' })
      : element('div', { className: 'validation-citation-grid' }, record.evidenceCitations.map((citation) => (
        citationView(documentValue, record, citation, actions)
      ))),
  ]);
}

/** Render exact retained Case revisions, citations, and verification history. */
export function createCampaignCaseSection(documentValue, actions) {
  const cases = latestCases(documentValue);
  return element('section', { className: 'validation-section' }, [
    element('div', { className: 'validation-section-heading' }, [
      element('div', {}, [
        element('h2', { text: 'Study Cases' }),
        element('p', { text: `${cases.length} Case identities; every retained revision is inspectable.` }),
      ]),
    ]),
    cases.length === 0
      ? element('p', {
        className: 'validation-empty-inline',
        text: 'Open a Replay Session and use Capture Study Case.',
      })
      : element('div', { className: 'validation-case-list' }, cases.map((latest) => (
        element('details', { className: 'validation-case-history' }, [
          element('summary', {}, [
            element('strong', { text: `${latest.qualificationClass} · ${latest.lifecycleState}` }),
            element('span', {
              text: `Case ${latest.caseId.slice(0, 8)} · latest revision ${latest.caseRevision}`,
            }),
          ]),
          ...revisionsForCase(documentValue, latest.caseId).map((record) => (
            revisionView(documentValue, record, latest.caseRevision, actions)
          )),
        ])
      ))),
  ]);
}
