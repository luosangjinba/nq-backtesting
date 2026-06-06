export const TARGET_PROGRESS_ROLES = Object.freeze(['target1', 'target2', 'target3']);

const TARGET_RESULT_RANK = Object.freeze({
  target1: 1,
  target2: 2,
  target3: 3,
});

export const TARGET_EXECUTION_ACTIONS = Object.freeze({
  NONE: 'none',
  PARTIAL: 'partial',
  FINAL: 'final',
  MANUAL_EXIT: 'manual-exit',
});

export const TARGET_EXECUTION_ACTION_LABELS = Object.freeze({
  [TARGET_EXECUTION_ACTIONS.NONE]: 'None',
  [TARGET_EXECUTION_ACTIONS.PARTIAL]: 'Partial',
  [TARGET_EXECUTION_ACTIONS.FINAL]: 'Final',
  [TARGET_EXECUTION_ACTIONS.MANUAL_EXIT]: 'Manual Exit',
});

export function isTargetResult(result) {
  return TARGET_PROGRESS_ROLES.includes(result);
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTargetRank(role) {
  return TARGET_RESULT_RANK[role] || 0;
}

function derivePoints(targetPrice, entry) {
  const entryPrice = toNumberOrNull(entry?.price);
  const price = toNumberOrNull(targetPrice);
  if (entryPrice === null || price === null) return null;
  if (entry?.direction === 'long') return price - entryPrice;
  if (entry?.direction === 'short') return entryPrice - price;
  return null;
}

function deriveRisk(entry, stopLoss) {
  const entryPrice = toNumberOrNull(entry?.price);
  const stopPrice = toNumberOrNull(stopLoss?.price);
  if (entryPrice === null || stopPrice === null) return null;
  return Math.abs(entryPrice - stopPrice);
}

function deriveR(points, risk) {
  const parsedPoints = toNumberOrNull(points);
  const parsedRisk = toNumberOrNull(risk);
  if (parsedPoints === null || parsedRisk === null || parsedRisk <= 0) return null;
  return parsedPoints / parsedRisk;
}

function normalizeExecutionAction(value) {
  return Object.values(TARGET_EXECUTION_ACTIONS).includes(value)
    ? value
    : TARGET_EXECUTION_ACTIONS.NONE;
}

function getDefaultExecutionAction(role, resultStatus) {
  return role === resultStatus ? TARGET_EXECUTION_ACTIONS.FINAL : TARGET_EXECUTION_ACTIONS.NONE;
}

function getTargetAction(targetActions = {}, role, resultStatus) {
  if (!Object.prototype.hasOwnProperty.call(targetActions || {}, role)) {
    return getDefaultExecutionAction(role, resultStatus);
  }
  const explicit = targetActions?.[role]?.action ?? targetActions?.[role];
  return normalizeExecutionAction(explicit);
}

export function buildTargetProgress({ targets = [], entry = {}, stopLoss = {}, result = {} } = {}) {
  const resultStatus = result?.status || result?.result || 'unknown';
  const resultRank = getTargetRank(resultStatus);
  const targetActions = result?.targetActions || {};
  const risk = deriveRisk(entry, stopLoss);

  return TARGET_PROGRESS_ROLES
    .map((role) => {
      const target = targets.find((item) => item?.role === role);
      if (!target || !target.complete) return null;
      const rank = getTargetRank(role);
      const reached = resultRank >= rank;
      const points = derivePoints(target.price, entry);
      return {
        role,
        label: role.replace(/^target/, 'Target '),
        target,
        price: toNumberOrNull(target.price),
        points,
        r: deriveR(points, risk),
        reached,
        final: resultStatus === role,
        executionAction: getTargetAction(targetActions, role, resultStatus),
      };
    })
    .filter(Boolean);
}
