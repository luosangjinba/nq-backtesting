import { getSetupSets } from '../order/setup-set.js';
import { dateKeyFromTimestamp } from '../utils.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeInstrument(value) {
  return normalizeText(value).toUpperCase();
}

function setupDateKey(setup = {}) {
  return dateKeyFromTimestamp(
    setup.primaryTimestamp
      ?? setup.orderElements?.entry?.timestamp
      ?? setup.orderElements?.reversal?.timestamp
      ?? setup.orderElements?.result?.timestamp
  );
}

function firstTargetPrice(setup = {}) {
  const targets = Array.isArray(setup.orderElements?.targets) ? setup.orderElements.targets : [];
  return targets.find((target) => target?.price !== undefined && target?.price !== null)?.price ?? null;
}

function scoreCandidate({ matchDate, matchInstrument }) {
  if (matchDate && matchInstrument) return 100;
  if (matchDate) return 80;
  if (matchInstrument) return 40;
  return 10;
}

export function summarizeJournalSetupLinkCandidate(setup = {}, context = {}) {
  const date = setupDateKey(setup);
  const instrument = normalizeInstrument(setup.instrument || 'NQ');
  const contextDate = normalizeText(context.date);
  const contextInstrument = normalizeInstrument(context.instrument);
  const matchDate = Boolean(contextDate && date === contextDate);
  const matchInstrument = Boolean(contextInstrument && instrument === contextInstrument);
  const score = scoreCandidate({ matchDate, matchInstrument });
  return {
    id: setup.id || '',
    orderReviewId: setup.id || '',
    instrument,
    date,
    direction: setup.direction || setup.orderElements?.entry?.direction || 'unknown',
    summary: setup.sourceOrderReview?.summary || setup.orderReview?.summary || '',
    entryPrice: setup.orderElements?.entry?.price ?? null,
    stopPrice: setup.orderElements?.stopLoss?.price ?? null,
    targetPrice: firstTargetPrice(setup),
    result: setup.orderElements?.result?.status || 'unknown',
    primaryTimestamp: setup.primaryTimestamp ?? null,
    matchDate,
    matchInstrument,
    score,
  };
}

export function getJournalSetupLinkCandidates(context = {}, options = {}) {
  const getSetups = typeof options.getSetupSets === 'function' ? options.getSetupSets : getSetupSets;
  const setups = getSetups();
  return (Array.isArray(setups) ? setups : [])
    .map((setup) => summarizeJournalSetupLinkCandidate(setup, context))
    .filter((candidate) => candidate.orderReviewId)
    .sort((a, b) => (
      b.score - a.score
      || String(b.date || '').localeCompare(String(a.date || ''))
      || String(a.instrument || '').localeCompare(String(b.instrument || ''))
      || String(a.orderReviewId || '').localeCompare(String(b.orderReviewId || ''))
    ));
}
