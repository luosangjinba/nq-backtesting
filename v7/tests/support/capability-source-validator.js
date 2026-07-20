const ID_NAME = '(?:timeframe|provider|instrument|calendar|indicator|formula)\\w*Id';
const IF_LITERAL_BRANCH = new RegExp(`\\bif\\s*\\([^)]*\\b${ID_NAME}\\s*={2,3}\\s*['\"]`, 'i');
const SWITCH_ID_BRANCH = new RegExp(`\\bswitch\\s*\\([^)]*\\b${ID_NAME}\\b`, 'i');

/** Finds representative concrete capability-id branches forbidden in core owners. */
export function findConcreteCapabilityIdBranches(source) {
  if (typeof source !== 'string') return ['invalid-source'];
  const violations = [];
  if (IF_LITERAL_BRANCH.test(source)) violations.push('concrete-capability-id-if-branch');
  if (SWITCH_ID_BRANCH.test(source)) violations.push('concrete-capability-id-switch-branch');
  return Object.freeze(violations);
}
