import { resolveReplayTransportPeriodNavigation } from './replay-transport-period-navigation.js';

function isDisabledOption(option) {
  return Boolean(option?.disabled || option?.getAttribute?.('aria-disabled') === 'true');
}

export function mountReplayTransportPeriodMenuController(root, {
  onSelect = () => {},
  signal,
} = {}) {
  if (!root) throw new Error('Replay transport period menu root is required.');

  function details() {
    return root.querySelector('[data-v6-transport-period-details]');
  }

  function options() {
    return Array.from(root.querySelectorAll('[data-v6-transport-period-option]'))
      .filter((option) => !isDisabledOption(option));
  }

  function handleKeydown(event = {}) {
    const menu = details();
    if (!menu) return false;
    const targetIsInMenu = root.contains(event.target) && menu.contains?.(event.target);
    if (!targetIsInMenu) return false;
    const focusableOptions = options();
    const navigation = resolveReplayTransportPeriodNavigation({
      activeIndex: focusableOptions.indexOf(root.ownerDocument?.activeElement),
      key: event.key,
      open: menu.open,
      optionCount: focusableOptions.length,
    });
    if (!navigation.handled) return false;
    event.preventDefault?.();
    menu.open = navigation.open;
    if (navigation.focusTrigger) {
      root.querySelector('[data-v6-transport-period-toggle]')?.focus?.();
    } else if (navigation.focusIndex !== null) {
      focusableOptions[navigation.focusIndex]?.focus?.();
    }
    return true;
  }

  function handleClick(event = {}) {
    const option = event.target?.closest?.('[data-v6-transport-period-option]');
    if (!option || !root.contains(option) || isDisabledOption(option)) return;
    onSelect(option.dataset.v6TransportPeriodOption);
    const menu = details();
    if (menu) menu.open = false;
  }

  root.addEventListener('click', handleClick, { signal });

  return Object.freeze({
    handleKeydown,
    isOpen() {
      return Boolean(details()?.open);
    },
  });
}
