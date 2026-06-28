export const REPLAY_SPEEDS = Object.freeze([
  { label: '1x', ms: 900 },
  { label: '3x', ms: 500 },
  { label: '5x', ms: 300 },
  { label: '7x', ms: 180 },
  { label: '10x', ms: 100 },
]);

export function getReplaySpeed(index) {
  return REPLAY_SPEEDS[Number(index)] || REPLAY_SPEEDS[0];
}

export function getReplayActionFromEvent(event) {
  return event.target.closest('[data-action]')?.dataset.action || '';
}

export function isTextEditingTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
}
