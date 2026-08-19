import { button, element, formatNumber } from './dom.js';

const COUNT_ROWS = Object.freeze([
  Object.freeze(['Total Cases', 'total', 'count.total']),
  Object.freeze(['Qualified', 'qualified', 'count.qualification.qualified']),
  Object.freeze(['Rejected', 'rejected', 'count.qualification.rejected']),
  Object.freeze(['Ambiguous classification', 'ambiguous', 'count.qualification.ambiguous']),
  Object.freeze(['Incomplete classification', 'incomplete', 'count.qualification.incomplete']),
  Object.freeze(['Target first', 'targetFirst', 'count.outcome.target-first']),
  Object.freeze(['Invalidation first', 'invalidationFirst', 'count.outcome.invalidation-first']),
  Object.freeze(['Same-Bar ambiguous', 'sameBarAmbiguous', 'count.outcome.same-bar-ambiguous']),
  Object.freeze(['Horizon expired', 'horizonExpired', 'count.outcome.horizon-expired']),
  Object.freeze(['Incomplete data', 'incompleteData', 'count.outcome.incomplete-data']),
  Object.freeze(['Source unavailable', 'sourceUnavailableCount', 'count.source-unavailable']),
]);

const MEDIAN_ROWS = Object.freeze([
  Object.freeze(['Median MFE points', 'mfePoints', 'median.mfe-points']),
  Object.freeze(['Median MAE points', 'maePoints', 'median.mae-points']),
  Object.freeze([
    'Median Bars to first touch', 'timeToFirstTouchBars', 'median.time-to-first-touch-bars',
  ]),
]);

function cohortSummary(cohort) {
  if (!cohort) return element('p', {
    className: 'validation-empty-inline',
    text: 'No immutable Cohort has been frozen yet.',
  });
  return element('article', { className: 'validation-cohort-summary' }, [
    element('div', {}, [
      element('strong', { text: cohort.name }),
      element('span', {
        text: `Cohort ${cohort.cohortId.slice(0, 8)} r${cohort.cohortRevision}`,
      }),
    ]),
    element('dl', { className: 'validation-evidence-details' }, [
      element('div', {}, [
        element('dt', { text: 'Members' }),
        element('dd', { text: String(cohort.memberCaseRefs.length) }),
      ]),
      element('div', {}, [
        element('dt', { text: 'Excluded' }),
        element('dd', { text: String(cohort.excludedCaseRefs.length) }),
      ]),
      element('div', {}, [
        element('dt', { text: 'Selection' }),
        element('dd', { text: cohort.selectionPolicy }),
      ]),
      element('div', {}, [
        element('dt', { text: 'Frozen' }),
        element('dd', { text: new Date(cohort.createdAtEpochMs).toISOString() }),
      ]),
    ]),
  ]);
}

function statisticRow(label, value, metricId, analysis, actions, detail = null) {
  let inspect;
  inspect = button('Inspect exact members', () => actions.onDrilldown(
    analysis, metricId, inspect,
  ), 'validation-button validation-button-secondary');
  return element('tr', {}, [
    element('th', { scope: 'row', text: label }),
    element('td', {}, [element('strong', { text: String(value) }),
      detail ? element('small', { text: detail }) : null]),
    element('td', {}, [inspect]),
  ]);
}

function statisticsTable(analysis, actions) {
  const rate = analysis.rates.targetFirstRate;
  return element('div', { className: 'validation-statistics-wrap' }, [
    element('table', { className: 'validation-statistics' }, [
      element('caption', {
        text: `Analysis ${analysis.analysisRunId.slice(0, 8)} r${analysis.analysisRunRevision}`,
      }),
      element('thead', {}, [element('tr', {}, [
        element('th', { scope: 'col', text: 'Metric' }),
        element('th', { scope: 'col', text: 'Frozen value' }),
        element('th', { scope: 'col', text: 'Lineage' }),
      ])]),
      element('tbody', {}, [
        statisticRow(
          'Target-first rate',
          rate.value === null ? '—' : `${(rate.value * 100).toFixed(1)}%`,
          'rate.target-first',
          analysis,
          actions,
          `${rate.numerator} / ${rate.denominator} resolved first touches`,
        ),
        ...COUNT_ROWS.map(([label, fieldName, metricId]) => statisticRow(
          label, analysis.counts[fieldName], metricId, analysis, actions,
        )),
        ...MEDIAN_ROWS.map(([label, fieldName, metricId]) => statisticRow(
          label,
          formatNumber(analysis.medians[fieldName].value),
          metricId,
          analysis,
          actions,
          `${analysis.medians[fieldName].eligibleCaseRefs.length} eligible Cases`,
        )),
      ]),
    ]),
  ]);
}

/** Render immutable Cohort identity and the complete fixed Analysis metric set. */
export function createCampaignAnalysisSection(documentValue, actions) {
  const latestCohort = documentValue.cohorts.at(-1) ?? null;
  const latestAnalysis = documentValue.analysisRuns.at(-1) ?? null;
  let freeze;
  freeze = button('Freeze Cohort…', () => actions.onFreezeCohort(freeze),
    'validation-button validation-button-secondary');
  return element('section', { className: 'validation-section' }, [
    element('div', { className: 'validation-section-heading' }, [
      element('div', {}, [
        element('h2', { text: 'Frozen Cohort & descriptives' }),
        element('p', {
          text: 'Every count, denominator, exclusion, and source-unavailable Case stays visible.',
        }),
      ]),
      element('div', { className: 'validation-row-actions' }, [
        freeze,
        latestCohort ? button('Run analysis', () => actions.onRunAnalysis(latestCohort),
          'validation-button validation-button-primary') : null,
      ]),
    ]),
    cohortSummary(latestCohort),
    latestAnalysis ? statisticsTable(latestAnalysis, actions) : element('p', {
      className: 'validation-empty-inline',
      text: 'Freeze an explicit set of finalized Case revisions, then run the fixed metric set.',
    }),
  ]);
}
