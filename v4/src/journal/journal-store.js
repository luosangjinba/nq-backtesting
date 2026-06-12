import * as bus from '../event-bus.js';

export const DEFAULT_JOURNAL_ACCOUNT_ID = 'default';
export const JOURNAL_DAY_MODES = Object.freeze(['real_money', 'simulation', 'review_only', 'mixed', 'no_trade']);
export const JOURNAL_ACCOUNT_TYPES = Object.freeze(['real', 'sim', 'eval', 'mixed']);
export const JOURNAL_TRADE_TYPES = Object.freeze(['real_money', 'simulation']);
export const JOURNAL_DIRECTIONS = Object.freeze(['long', 'short', 'both', 'none', 'unknown']);
export const JOURNAL_FILL_TYPES = Object.freeze(['entry', 'add', 'partial_exit', 'final_exit', 'stop_exit', 'manual_exit']);
export const JOURNAL_TIMING_ASSESSMENTS = Object.freeze([
  'good',
  'early',
  'late',
  'unnecessary',
  'missed_better_entry',
  'unknown',
]);
export const JOURNAL_FOLLOWED_PLAN_VALUES = Object.freeze(['yes', 'partial', 'no', 'not_planned']);
export const JOURNAL_IDEAL_TYPES = Object.freeze(['hindsight_optimal', 'plan_valid']);
export const JOURNAL_RELATIONSHIP_VALUES = Object.freeze([
  'matched_actual',
  'actual_was_early',
  'actual_was_late',
  'actual_wrong_direction',
  'missed_trade',
  'no_actual_trade',
  'simulation_only',
]);
export const JOURNAL_NOTICED_VALUES = Object.freeze(['yes', 'no', 'unsure']);
export const JOURNAL_DISCIPLINE_VALUES = Object.freeze(['yes', 'partial', 'no', 'unknown']);

let journalDays = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeDate(value) {
  const text = normalizeString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeEnum(value, allowed, fallback) {
  const text = normalizeString(value, fallback).toLowerCase();
  return allowed.includes(text) ? text : fallback;
}

function normalizeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTimestampText(value) {
  return normalizeString(value);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeId(value, prefix) {
  return normalizeString(value, makeId(prefix));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeAccountId(value) {
  return normalizeString(value, DEFAULT_JOURNAL_ACCOUNT_ID);
}

function normalizeInstrument(value) {
  return normalizeString(value, 'NQ').toUpperCase();
}

function normalizeDisciplineValue(value, fallback = 'unknown') {
  return normalizeEnum(value, JOURNAL_DISCIPLINE_VALUES, fallback);
}

function normalizeTimestamps(input = {}) {
  const createdAt = Number(input.createdAt);
  const updatedAt = Number(input.updatedAt);
  const now = Date.now();
  return {
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : now,
  };
}

function emitChanged(reason, journalDay = null) {
  bus.emit('journal:changed', {
    reason,
    journalDay: journalDay ? clone(journalDay) : null,
    journalDays: getJournalDays(),
  });
}

export function getJournalDayIdentity(input = {}) {
  const accountId = normalizeAccountId(input.accountId);
  const date = normalizeDate(input.date);
  return `${accountId}|${date}`;
}

export function normalizeJournalFill(input = {}) {
  return {
    id: normalizeId(input.id, 'journal_fill'),
    type: normalizeEnum(input.type, JOURNAL_FILL_TYPES, 'entry'),
    time: normalizeTimestampText(input.time),
    price: normalizeNumber(input.price),
    quantity: normalizeNumber(input.quantity),
    reason: normalizeString(input.reason),
  };
}

export function normalizeLiveTradeLog(input = {}, parent = {}) {
  const timestamps = normalizeTimestamps(input);
  return {
    id: normalizeId(input.id, 'journal_trade'),
    date: normalizeDate(input.date) || parent.date || '',
    accountId: normalizeAccountId(input.accountId || parent.accountId),
    instrument: normalizeInstrument(input.instrument),
    tradeType: normalizeEnum(input.tradeType, JOURNAL_TRADE_TYPES, 'real_money'),
    direction: normalizeEnum(input.direction, JOURNAL_DIRECTIONS, 'unknown'),
    fills: Array.isArray(input.fills) ? input.fills.map(normalizeJournalFill) : [],
    stopLoss: normalizeNumber(input.stopLoss),
    target: normalizeNumber(input.target),
    result: normalizeString(input.result),
    positionSize: normalizeNumber(input.positionSize),
    plannedRisk: normalizeNumber(input.plannedRisk),
    riskPerContract: normalizeNumber(input.riskPerContract),
    grossPnl: normalizeNumber(input.grossPnl),
    netPnl: normalizeNumber(input.netPnl),
    rMultipleManual: normalizeNumber(input.rMultipleManual),
    commissions: normalizeNumber(input.commissions),
    beforeEntryThoughts: normalizeString(input.beforeEntryThoughts),
    entryReason: normalizeString(input.entryReason),
    timingAssessment: normalizeEnum(input.timingAssessment, JOURNAL_TIMING_ASSESSMENTS, 'unknown'),
    followedPlan: normalizeEnum(input.followedPlan, JOURNAL_FOLLOWED_PLAN_VALUES, 'not_planned'),
    ruleBreaks: normalizeString(input.ruleBreaks),
    managementNotes: normalizeString(input.managementNotes),
    exitReason: normalizeString(input.exitReason),
    reflection: normalizeString(input.reflection),
    whatWasRight: normalizeString(input.whatWasRight),
    whatWasWrong: normalizeString(input.whatWasWrong),
    linkedOrderSetupIds: normalizeStringArray(input.linkedOrderSetupIds),
    linkedChartNoteIds: normalizeStringArray(input.linkedChartNoteIds),
    ...timestamps,
  };
}

export function normalizeIdealTradeReview(input = {}, parent = {}) {
  const timestamps = normalizeTimestamps(input);
  return {
    id: normalizeId(input.id, 'journal_ideal'),
    date: normalizeDate(input.date) || parent.date || '',
    accountId: normalizeAccountId(input.accountId || parent.accountId),
    instrument: normalizeInstrument(input.instrument),
    idealType: normalizeEnum(input.idealType, JOURNAL_IDEAL_TYPES, 'plan_valid'),
    direction: normalizeEnum(input.direction, JOURNAL_DIRECTIONS, 'unknown'),
    idealEntryTime: normalizeTimestampText(input.idealEntryTime),
    idealEntryPrice: normalizeNumber(input.idealEntryPrice),
    idealStopLoss: normalizeNumber(input.idealStopLoss),
    idealTarget: normalizeNumber(input.idealTarget),
    idealExitTime: normalizeTimestampText(input.idealExitTime),
    idealExitPrice: normalizeNumber(input.idealExitPrice),
    reason: normalizeString(input.reason),
    whyThisWasIdeal: normalizeString(input.whyThisWasIdeal),
    relationshipToActualTrade: normalizeEnum(
      input.relationshipToActualTrade,
      JOURNAL_RELATIONSHIP_VALUES,
      'no_actual_trade'
    ),
    noticedInRealTime: normalizeEnum(input.noticedInRealTime, JOURNAL_NOTICED_VALUES, 'unsure'),
    actualTradeIds: normalizeStringArray(input.actualTradeIds),
    linkedOrderSetupIds: normalizeStringArray(input.linkedOrderSetupIds),
    reviewNotes: normalizeString(input.reviewNotes),
    ...timestamps,
  };
}

export function normalizeDisciplineReview(input = {}) {
  return {
    plannedTradesOnly: normalizeDisciplineValue(input.plannedTradesOnly),
    waitedForSetup: normalizeDisciplineValue(input.waitedForSetup),
    respectedRisk: normalizeDisciplineValue(input.respectedRisk),
    overtraded: normalizeDisciplineValue(input.overtraded, 'no'),
    fomo: normalizeDisciplineValue(input.fomo, 'no'),
    revengeTrading: normalizeDisciplineValue(input.revengeTrading, 'no'),
    hesitatedOnValidTrade: normalizeDisciplineValue(input.hesitatedOnValidTrade),
    tradedWhenShouldNot: normalizeDisciplineValue(input.tradedWhenShouldNot, 'no'),
    failedToTradeWhenShould: normalizeDisciplineValue(input.failedToTradeWhenShould),
    disciplineReflection: normalizeString(input.disciplineReflection),
    oneRuleForTomorrow: normalizeString(input.oneRuleForTomorrow),
  };
}

export function normalizeJournalDay(input = {}) {
  const date = normalizeDate(input.date);
  if (!date) return null;
  const accountId = normalizeAccountId(input.accountId);
  const timestamps = normalizeTimestamps(input);
  const parent = { accountId, date };
  return {
    id: normalizeId(input.id, `journal_day_${accountId}_${date}`),
    date,
    accountId,
    accountType: normalizeEnum(input.accountType, JOURNAL_ACCOUNT_TYPES, 'real'),
    dayMode: normalizeEnum(input.dayMode || input.mode, JOURNAL_DAY_MODES, 'review_only'),
    preMarketPlan: normalizeString(input.preMarketPlan),
    sessionIntent: normalizeString(input.sessionIntent),
    mentalStateBefore: normalizeString(input.mentalStateBefore),
    intradayStateNotes: normalizeString(input.intradayStateNotes),
    postMarketSummary: normalizeString(input.postMarketSummary),
    disciplineSummary: normalizeString(input.disciplineSummary),
    mainMistake: normalizeString(input.mainMistake),
    bestBehavior: normalizeString(input.bestBehavior),
    nextSessionFocus: normalizeString(input.nextSessionFocus),
    liveTrades: Array.isArray(input.liveTrades)
      ? input.liveTrades.map((trade) => normalizeLiveTradeLog(trade, parent))
      : [],
    idealTrades: Array.isArray(input.idealTrades)
      ? input.idealTrades.map((trade) => normalizeIdealTradeReview(trade, parent))
      : [],
    disciplineReview: normalizeDisciplineReview(input.disciplineReview),
    ...timestamps,
  };
}

export function getJournalDays() {
  return journalDays.map(clone);
}

export function getJournalDay(accountId, date) {
  const identity = getJournalDayIdentity({ accountId, date });
  const found = journalDays.find((day) => getJournalDayIdentity(day) === identity);
  return found ? clone(found) : null;
}

export function loadJournalDays(nextDays = [], options = {}) {
  const byIdentity = new Map();
  (Array.isArray(nextDays) ? nextDays : [])
    .map(normalizeJournalDay)
    .filter(Boolean)
    .forEach((day) => {
      byIdentity.set(getJournalDayIdentity(day), day);
    });
  journalDays = Array.from(byIdentity.values())
    .sort((a, b) => a.date.localeCompare(b.date) || a.accountId.localeCompare(b.accountId));
  if (options.emit !== false) emitChanged(options.reason || 'load');
  return getJournalDays();
}

export function upsertJournalDay(input = {}) {
  const normalized = normalizeJournalDay(input);
  if (!normalized) return null;
  const identity = getJournalDayIdentity(normalized);
  const existing = journalDays.find((day) => getJournalDayIdentity(day) === identity);
  if (existing) {
    const updated = {
      ...existing,
      ...normalized,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };
    journalDays = journalDays.map((day) => (getJournalDayIdentity(day) === identity ? updated : day));
    emitChanged('upsert', updated);
    return clone(updated);
  }
  journalDays = [...journalDays, normalized]
    .sort((a, b) => a.date.localeCompare(b.date) || a.accountId.localeCompare(b.accountId));
  emitChanged('upsert', normalized);
  return clone(normalized);
}

export function updateJournalDay(accountId, date, patch = {}) {
  const identity = getJournalDayIdentity({ accountId, date });
  const existing = journalDays.find((day) => getJournalDayIdentity(day) === identity);
  if (!existing) {
    return upsertJournalDay({ ...patch, accountId, date });
  }
  return upsertJournalDay({
    ...existing,
    ...patch,
    accountId: existing.accountId,
    date: existing.date,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  });
}

export function deleteJournalDay(accountId, date) {
  const identity = getJournalDayIdentity({ accountId, date });
  const before = journalDays.length;
  journalDays = journalDays.filter((day) => getJournalDayIdentity(day) !== identity);
  if (journalDays.length === before) return false;
  emitChanged('delete');
  return true;
}

export function clearJournalDays(options = {}) {
  const hadData = journalDays.length > 0;
  journalDays = [];
  if (hadData && options.emit !== false) emitChanged(options.reason || 'clear');
  return hadData;
}
