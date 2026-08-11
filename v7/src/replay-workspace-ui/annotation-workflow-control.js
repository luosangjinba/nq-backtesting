function node(tag, className, text = null) {
  const value = document.createElement(tag);
  value.className = className;
  if (text !== null) value.textContent = text;
  return value;
}

function printable(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

function fieldControl(field, snapshot, onUpdate) {
  if (field.control?.kind !== 'number' || field.readOnly) {
    return node('span', 'annotation-inspector-field-value', printable(field.value));
  }
  const input = node('input', 'annotation-inspector-number');
  input.type = 'number';
  input.value = String(field.value);
  if (Number.isFinite(field.control.min)) input.min = String(field.control.min);
  if (Number.isFinite(field.control.max)) input.max = String(field.control.max);
  input.setAttribute('aria-label', field.label);
  input.addEventListener('change', () => {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    onUpdate({
      expectedDraftRevision: snapshot.inspector.draftRevision,
      field: field.id,
      value,
    });
  });
  return input;
}

function renderField(field, snapshot, onUpdate) {
  const row = node('div', 'annotation-inspector-field');
  const copy = node('div', 'annotation-inspector-field-copy');
  copy.append(node('span', 'annotation-inspector-field-label', field.label));
  const source = node('span', `annotation-inspector-source source-${String(field.source).toLowerCase()}`, field.source);
  copy.append(source);
  const control = fieldControl(field, snapshot, onUpdate);
  if (field.baselineValue !== undefined) {
    control.title = `Baseline: ${printable(field.baselineValue)}`;
  }
  row.append(copy, control);
  return row;
}

function renderTabPanel(tab, snapshot, onUpdate) {
  const panel = node('section', 'annotation-inspector-panel');
  panel.dataset.tabId = tab.id;
  panel.setAttribute('role', 'tabpanel');
  for (const group of tab.groups) {
    const section = node('section', 'annotation-inspector-group');
    section.append(node('h3', 'annotation-inspector-group-title', group.label));
    for (const field of group.fields) section.append(renderField(field, snapshot, onUpdate));
    panel.append(section);
  }
  return panel;
}

/** Render portable Semantic tool and Inspector view models without package-specific UI branches. */
export function createAnnotationWorkflowControl({
  onApply,
  onCancel,
  onReset,
  onToggleTool,
  onUpdateField,
} = {}) {
  const toolbar = node('div', 'annotation-tool-strip');
  toolbar.hidden = true;
  toolbar.setAttribute('aria-label', 'Core semantic tools');
  toolbar.setAttribute('role', 'toolbar');
  const inspector = node('aside', 'annotation-inspector');
  inspector.hidden = true;
  inspector.setAttribute('aria-label', 'Semantic Evidence Inspector');
  let activeTabId = null;
  let snapshot = null;
  let workspaceDisabled = false;

  function renderToolbar() {
    toolbar.replaceChildren();
    const tools = snapshot?.tools ?? [];
    toolbar.hidden = tools.length === 0;
    for (const tool of tools) {
      const button = node('button', 'annotation-tool-button', tool.displayName);
      button.type = 'button';
      button.dataset.toolId = tool.id;
      button.dataset.pluginState = tool.state;
      button.disabled = workspaceDisabled || tool.disabled;
      button.title = `${tool.packageName} ${tool.packageVersion} · ${tool.description}`;
      button.setAttribute('aria-pressed', String(tool.active));
      button.addEventListener('click', () => onToggleTool?.(tool.id));
      toolbar.append(button);
    }
    if (snapshot?.error !== null && snapshot?.error !== undefined) {
      const error = node('span', 'annotation-tool-error', snapshot.error.message);
      error.title = `${snapshot.error.code}: ${snapshot.error.message}`;
      error.setAttribute('role', 'status');
      toolbar.append(error);
    }
  }

  function renderInspector() {
    inspector.replaceChildren();
    const value = snapshot?.inspector;
    inspector.hidden = !value?.open;
    if (!value?.open) return;
    const header = node('header', 'annotation-inspector-header');
    const heading = node('div', 'annotation-inspector-heading');
    heading.append(
      node('span', 'annotation-inspector-kicker', `CORE PLUGIN · ${value.packageName}`),
      node('h2', 'annotation-inspector-title', 'Evidence Inspector'),
      node('span', 'annotation-inspector-revision', `artifact rev ${value.artifactRevision ?? '—'}`),
    );
    const close = node('button', 'annotation-inspector-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close Semantic Inspector');
    close.disabled = snapshot.busy && !value.dirty;
    close.addEventListener('click', () => onCancel?.());
    header.append(heading, close);

    const tabs = node('div', 'annotation-inspector-tabs');
    tabs.setAttribute('role', 'tablist');
    const availableIds = new Set(value.tabs.map(({ id }) => id));
    if (!availableIds.has(activeTabId)) activeTabId = value.tabs[0]?.id ?? null;
    const body = node('div', 'annotation-inspector-body');
    for (const tab of value.tabs) {
      const button = node('button', 'annotation-inspector-tab', tab.label);
      button.type = 'button';
      button.dataset.tabId = tab.id;
      button.setAttribute('aria-selected', String(tab.id === activeTabId));
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => {
        activeTabId = tab.id;
        renderInspector();
      });
      tabs.append(button);
      if (tab.id === activeTabId) body.append(renderTabPanel(tab, snapshot, onUpdateField));
    }
    const error = node('div', 'annotation-inspector-error');
    error.hidden = snapshot.error === null;
    error.textContent = snapshot.error?.message ?? '';
    const footer = node('footer', 'annotation-inspector-footer');
    const reset = node('button', 'annotation-inspector-action action-reset', 'Reset');
    const cancel = node('button', 'annotation-inspector-action action-cancel', 'Cancel');
    const apply = node('button', 'annotation-inspector-action action-apply', 'Apply');
    for (const button of [reset, cancel, apply]) button.type = 'button';
    reset.disabled = !value.canReset || snapshot.status === 'saving';
    cancel.disabled = !value.canCancel || snapshot.status === 'saving';
    apply.disabled = !value.canApply || snapshot.status === 'saving';
    reset.addEventListener('click', () => onReset?.());
    cancel.addEventListener('click', () => onCancel?.());
    apply.addEventListener('click', () => onApply?.());
    footer.append(reset, cancel, apply);
    inspector.append(header, tabs, body, error, footer);
  }

  return Object.freeze({
    dispose() {
      toolbar.replaceChildren();
      inspector.replaceChildren();
      toolbar.remove();
      inspector.remove();
      snapshot = null;
    },
    inspector,
    root: toolbar,
    setSnapshot(value) {
      snapshot = value;
      toolbar.dataset.workflowStatus = value?.status ?? 'unavailable';
      inspector.dataset.workflowStatus = value?.status ?? 'unavailable';
      renderToolbar();
      renderInspector();
    },
    setWorkspaceDisabled(value) {
      workspaceDisabled = value === true;
      renderToolbar();
    },
  });
}
