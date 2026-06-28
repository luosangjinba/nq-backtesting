let sidebarEl = null;
let bodyEl = null;

export function createInspectorShell({
  onClose,
  onChange,
  onClick,
  onFocusOut,
} = {}) {
  sidebarEl = document.createElement('aside');
  sidebarEl.id = 'inspector-sidebar';
  sidebarEl.innerHTML = `
    <div class="inspector-header">
      <div class="inspector-title">Inspector</div>
      <button class="inspector-close" type="button" title="Close inspector">X</button>
    </div>
    <div class="inspector-body"></div>
  `;
  document.getElementById('workspace')?.appendChild(sidebarEl);
  bodyEl = sidebarEl.querySelector('.inspector-body');
  sidebarEl.querySelector('.inspector-close')?.addEventListener('click', onClose);
  if (onChange) sidebarEl.addEventListener('change', onChange);
  if (onClick) sidebarEl.addEventListener('click', onClick);
  if (onFocusOut) sidebarEl.addEventListener('focusout', onFocusOut);
  return { sidebarEl, bodyEl };
}

export function getInspectorSidebarElement() {
  return sidebarEl;
}

export function getInspectorBodyElement() {
  return bodyEl;
}

export function openInspectorShell() {
  sidebarEl?.classList.add('open');
}

export function closeInspectorShell() {
  sidebarEl?.classList.remove('open');
}

export function isInspectorShellOpen() {
  return Boolean(sidebarEl?.classList.contains('open'));
}

export function setInspectorShellBody(html, hydrate = () => {}) {
  if (!bodyEl) return;
  bodyEl.innerHTML = html;
  hydrate(bodyEl);
}

export function focusInspectorBodySelector(selector) {
  const element = bodyEl?.querySelector(selector);
  element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function clickInspectorBodyAction(action) {
  bodyEl?.querySelector(`[data-inspector-action="${action}"]`)?.click();
}

export function captureInspectorOpenGroups() {
  if (!bodyEl) return new Set();
  return new Set(
    Array.from(bodyEl.querySelectorAll('.calendar-object-group[open][data-calendar-group-type]'))
      .map((groupEl) => groupEl.dataset.calendarGroupType)
      .filter(Boolean)
  );
}

export function closeInspectorActionMenus(exceptMenu = null) {
  bodyEl?.querySelectorAll('.order-review-ref-menu[open], .calendar-object-menu[open]').forEach((menu) => {
    if (menu !== exceptMenu) menu.removeAttribute('open');
  });
}
