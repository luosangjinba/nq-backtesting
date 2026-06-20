import {
  ENTRY_CONTEXT_CATALOG_GROUPS,
  getCatalogItems,
} from '../../entry-context/entry-context-catalog-store.js';
import { escapeHtml, section } from './render-utils.js';

const GROUP_LABELS = Object.freeze({
  patterns: 'Patterns',
  sessions: 'Sessions',
  lessons: 'Lessons',
});

function renderCatalogItem(group, item) {
  const activeText = item.active === false ? 'Inactive' : 'Active';
  const toggleAction = item.active === false ? 'entry-context-catalog-activate' : 'entry-context-catalog-deactivate';
  const toggleText = item.active === false ? 'Activate' : 'Deactivate';
  return `
    <div class="entry-context-catalog-item${item.active === false ? ' inactive' : ''}" data-entry-context-group="${escapeHtml(group)}" data-entry-context-id="${escapeHtml(item.id)}">
      <div class="entry-context-catalog-item-main">
        <input class="inspector-input entry-context-catalog-label" data-inspector-action="entry-context-catalog-label" data-entry-context-group="${escapeHtml(group)}" data-entry-context-id="${escapeHtml(item.id)}" value="${escapeHtml(item.label)}" aria-label="${escapeHtml(`${GROUP_LABELS[group]} label`)}">
        <input class="inspector-input entry-context-catalog-sort" data-inspector-action="entry-context-catalog-sort" data-entry-context-group="${escapeHtml(group)}" data-entry-context-id="${escapeHtml(item.id)}" type="number" step="1" value="${escapeHtml(item.sort)}" aria-label="${escapeHtml(`${GROUP_LABELS[group]} sort`)}">
      </div>
      <div class="entry-context-catalog-item-meta">
        <span>${escapeHtml(item.id)}</span>
        <span>${activeText}</span>
        <button class="inspector-mini-btn" data-inspector-action="${toggleAction}" data-entry-context-group="${escapeHtml(group)}" data-entry-context-id="${escapeHtml(item.id)}" type="button">${toggleText}</button>
      </div>
    </div>
  `;
}

function renderCatalogGroup(group) {
  const items = getCatalogItems(group, { includeInactive: true });
  const rows = items.length
    ? items.map((item) => renderCatalogItem(group, item)).join('')
    : '<div class="inspector-empty">No items.</div>';

  return section(GROUP_LABELS[group], `
    <div class="entry-context-catalog-group" data-entry-context-group="${escapeHtml(group)}">
      <div class="entry-context-catalog-add">
        <input class="inspector-input" data-entry-context-add-input="${escapeHtml(group)}" placeholder="Add ${escapeHtml(GROUP_LABELS[group].slice(0, -1).toLowerCase())}">
        <button class="inspector-button secondary" data-inspector-action="entry-context-catalog-add" data-entry-context-group="${escapeHtml(group)}" type="button">Add</button>
      </div>
      <div class="entry-context-catalog-list">${rows}</div>
    </div>
  `);
}

export function renderEntryContextCatalogEntry() {
  return section('Entry Context Catalogs', `
    <div class="entry-context-catalog-entry">
      <button class="inspector-button secondary" data-inspector-action="entry-context-catalog-open" type="button">
        Maintain Catalogs
      </button>
    </div>
  `);
}

export function renderEntryContextCatalogPanel() {
  return `
    <div class="entry-context-catalog-panel">
      ${ENTRY_CONTEXT_CATALOG_GROUPS.map(renderCatalogGroup).join('')}
    </div>
  `;
}
