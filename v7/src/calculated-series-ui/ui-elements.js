export function uiElement(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  for (const child of children) if (child) node.append(child);
  return node;
}

export function sameDefinition(left, right) {
  if (!left || !right) return false;
  return ['packageId', 'packageVersion', 'contributionId', 'contributionVersion',
    'definitionId', 'definitionVersion'].every((field) => left[field] === right[field])
    && left.profile?.profileId === right.profile?.profileId
    && left.profile?.profileContractVersion === right.profile?.profileContractVersion;
}

export function displayIndicatorValue(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 8,
  }).format(value) : '—';
}

export function errorMessage(error) {
  return typeof error?.message === 'string' && error.message.length > 0
    ? error.message.slice(0, 240) : 'Indicator update failed.';
}
