import { element, formatNumber, statusBadge } from './dom.js';

/** Resolve only existing Campaign-compatible Pane/plugin sources; never create or configure them. */
export function captureSourceOptions(context, campaign) {
  const panes = context.paneWorkspace?.panes ?? [];
  const contextPanes = panes.filter(({ instrumentId, timeframeId }) => (
    instrumentId === campaign.instrumentId && timeframeId === campaign.contextTimeframeId
  ));
  const executionPanes = panes.filter(({ instrumentId, timeframeId }) => (
    instrumentId === campaign.instrumentId && timeframeId === campaign.executionTimeframeId
  ));
  const sma = context.calculatedPanes.flatMap((pane) => pane.instances
    .filter((instance) => instance.definitionRef.definitionId === 'moving-averages.sma.close'
      && instance.effectiveSettings.length === 20)
    .map((instance) => ({
      label: `${instance.legendLabel} · ${pane.workspacePaneId}`,
      paneId: pane.workspacePaneId,
      value: instance.instanceId,
    })));
  const fvg = context.annotationSources
    .filter(({ typeId, status }) => typeId === 'imbalance.fvg' && status === 'active')
    .map((source) => ({
      label: `${source.direction} · ${source.artifactId}`,
      value: source.artifactId,
    }));
  return Object.freeze({ contextPanes, executionPanes, fvg, sma });
}

function detail(label, value) {
  return element('div', {}, [element('dt', { text: label }), element('dd', { text: value })]);
}

function claimDetails(candidate) {
  const claim = candidate.boundedClaim;
  if (claim.claimKind === 'sma-close-comparison') return [
    detail('Values', `close ${formatNumber(claim.close)} · SMA ${formatNumber(claim.sma)}`),
    detail('Predicate', `${claim.comparison} · ${claim.comparisonPassed ? 'passed' : 'failed'}`),
    detail('SMA length', String(claim.length)),
    detail('Value Bar', new Date(claim.valueBarStartEpochMs).toISOString()),
  ];
  return [
    detail('Direction', claim.direction),
    detail('Prices', `${formatNumber(claim.lowerPrice)}–${formatNumber(claim.upperPrice)}`),
    detail('Predicate', `${claim.acceptance} / ${claim.lifecycle} · ${claim.predicatePassed ? 'passed' : 'failed'}`),
    detail('Evidence Bars', claim.evidenceBarStartEpochMs
      .map((epochMs) => new Date(epochMs).toISOString()).join(' · ')),
  ];
}

function candidateCard(candidate, availability) {
  const role = availability.evidenceRole === 'context-sma' ? 'SMA(close,20)' : 'Manual FVG';
  if (candidate === null) return element('article', {
    className: 'validation-preview-card validation-preview-card-unavailable',
  }, [
    element('header', { className: 'validation-card-heading' }, [
      element('strong', { text: role }),
      statusBadge('Source unavailable', 'warn'),
    ]),
    element('p', { text: availability.reasonCode }),
    element('small', { text: `${availability.providerId}@${availability.providerVersion}` }),
  ]);
  const context = candidate.observationContext;
  const source = candidate.sourceReference;
  return element('article', { className: 'validation-preview-card' }, [
    element('header', { className: 'validation-card-heading' }, [
      element('strong', { text: role }),
      statusBadge('Frozen preview', 'good'),
    ]),
    element('dl', { className: 'validation-evidence-details' }, [
      ...claimDetails(candidate),
      detail('Source', `${source.sourceRecordId} r${source.sourceRecordRevision}`),
      detail('Pane', `${context.paneRole} · ${context.paneId} · ${context.timeframeId}`),
      detail('Replay cutoff', new Date(context.exclusiveReplayCutoffEpochMs).toISOString()),
      detail('Latest eligible Bar', new Date(context.latestEligibleBarStartEpochMs).toISOString()),
      detail('Provider', `${candidate.providerIdentity.providerId}@${candidate.providerIdentity.providerVersion}`),
    ]),
  ]);
}

/** Render the complete human-reviewable decision-time evidence lease. */
export function createCaptureEvidencePreview(preview) {
  return element('section', { className: 'validation-preview', 'aria-live': 'polite' }, [
    element('div', { className: 'validation-card-heading' }, [
      element('div', {}, [
        element('h3', { text: 'Frozen decision-time evidence' }),
        element('p', {
          text: 'Source selectors are locked until this preview is committed or explicitly changed.',
        }),
      ]),
      statusBadge(preview.sharedContext === null ? 'Incomplete' : 'Review required',
        preview.sharedContext === null ? 'warn' : 'neutral'),
    ]),
    element('div', { className: 'validation-preview-grid' }, preview.availability.map((entry, index) => (
      candidateCard(preview.candidates[index], entry)
    ))),
    preview.sharedContext ? element('p', {
      className: 'validation-preview-cutoff',
      text: `Exclusive Replay cutoff: ${new Date(preview.sharedContext.exclusiveReplayCutoffEpochMs).toISOString()}`,
    }) : element('p', {
      className: 'validation-preview-cutoff',
      text: 'One or more sources are unavailable. This preview can only be retained as an incomplete draft.',
    }),
  ]);
}
