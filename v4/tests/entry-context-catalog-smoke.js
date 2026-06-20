import assert from 'node:assert/strict';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

globalThis.localStorage = createMemoryStorage();

const bus = await import('../src/event-bus.js');
const catalog = await import('../src/entry-context/entry-context-catalog-store.js');

catalog.resetEntryContextCatalog();

const catalogEvents = [];
const catalogEventListener = (payload) => catalogEvents.push(payload);
bus.on(catalog.ENTRY_CONTEXT_CATALOG_CHANGED, catalogEventListener);

assert.ok(
  catalog.getActiveCatalogItems('patterns').some((item) => item.id === 'purge-ob' && item.label === 'Purge + OB'),
  'default patterns are seeded from order entry pattern definitions'
);
assert.ok(
  catalog.getActiveCatalogItems('sessions').some((item) => item.id === 'silver-bullet' && item.label === 'Silver Bullet'),
  'default sessions are seeded from order entry session definitions'
);
assert.deepEqual(catalog.getActiveCatalogItems('lessons'), [], 'lessons start empty');

const lesson = catalog.addCatalogItem('lessons', 'Late Entry');
assert.equal(lesson.id, 'late-entry', 'lesson id is generated from label');
assert.equal(catalog.resolveCatalogLabel('lessons', 'late-entry'), 'Late Entry', 'lesson label resolves');
assert.equal(catalogEvents.at(-1)?.reason, 'add', 'catalog edits emit a changed event');
assert.equal(catalogEvents.at(-1)?.group, 'lessons', 'catalog changed event includes edited group');

const scopedLesson = catalog.addCatalogItem('lessons', 'Tight Stop-loss');
assert.deepEqual(scopedLesson.lessonRoles, ['stopLoss'], 'known lesson labels get default role scopes');
const scopedUpdate = catalog.setCatalogItemLessonRoles('lessons', scopedLesson.id, ['entry', 'stopLoss', 'entry']);
assert.deepEqual(scopedUpdate.lessonRoles, ['entry', 'stopLoss'], 'lesson role scopes are maintained and deduped');

const duplicate = catalog.addCatalogItem('lessons', 'Late Entry');
assert.equal(duplicate.id, 'late-entry-2', 'duplicate ids are made unique');

const renamed = catalog.renameCatalogItem('lessons', 'late-entry', 'Late Entry After Displacement');
assert.equal(renamed.label, 'Late Entry After Displacement', 'lesson can be renamed');
assert.equal(
  catalog.resolveCatalogLabel('lessons', 'late-entry'),
  'Late Entry After Displacement',
  'renamed lesson resolves new label'
);

catalog.deactivateCatalogItem('lessons', 'late-entry');
assert.equal(
  catalog.getActiveCatalogItems('lessons').some((item) => item.id === 'late-entry'),
  false,
  'deactivated lesson is hidden from active list'
);
assert.equal(
  catalog.getCatalogItems('lessons', { includeInactive: true }).some((item) => item.id === 'late-entry'),
  true,
  'deactivated lesson remains in all items'
);
catalog.activateCatalogItem('lessons', 'late-entry');
assert.equal(
  catalog.getActiveCatalogItems('lessons').some((item) => item.id === 'late-entry'),
  true,
  'deactivated lesson can be reactivated from maintenance UI'
);

catalog.setCatalogItemSort('lessons', 'late-entry-2', 1);
assert.equal(catalog.getCatalogItems('lessons', { includeInactive: true })[0].id, 'late-entry-2', 'sort order updates');

const panel = await import('../src/ui/inspector/entry-context-catalog-panel.js');
const entryHtml = panel.renderEntryContextCatalogEntry();
assert.match(entryHtml, /entry-context-catalog-open/, 'catalog maintenance entry renders open action');
const panelHtml = panel.renderEntryContextCatalogPanel();
assert.match(panelHtml, /entry-context-catalog-add/, 'catalog panel renders add controls');
assert.match(panelHtml, /entry-context-catalog-label/, 'catalog panel renders rename controls');
assert.match(panelHtml, /entry-context-catalog-sort/, 'catalog panel renders sort controls');
assert.match(panelHtml, /entry-context-catalog-lesson-role/, 'catalog panel renders lesson scope controls');
assert.match(panelHtml, /Manual Exits/, 'catalog panel renders lesson scope labels');
assert.match(panelHtml, /entry-context-catalog-deactivate/, 'catalog panel renders deactivate controls');

const savedRaw = globalThis.localStorage.getItem(catalog.getEntryContextCatalogStorageKey());
const saved = JSON.parse(savedRaw);
assert.equal(saved.version, 1, 'catalog persistence version is stored');
assert.equal(saved.catalog.lessons.length, 3, 'catalog persistence stores lessons');
assert.deepEqual(
  saved.catalog.lessons.find((item) => item.id === 'tight-stop-loss').lessonRoles,
  ['entry', 'stopLoss'],
  'catalog persistence stores lesson role scopes'
);

catalog.loadEntryContextCatalog({
  patterns: [{ id: 'custom-pattern', label: 'Custom Pattern', active: true, sort: 10 }],
  sessions: [{ id: 'custom-session', label: 'Custom Session', active: true, sort: 10 }],
  lessons: [{ id: 'discipline', label: 'Discipline', active: true, sort: 10 }],
});
assert.equal(catalog.resolveCatalogLabel('patterns', 'custom-pattern'), 'Custom Pattern');
assert.equal(catalog.resolveCatalogLabel('sessions', 'missing-session', 'Snapshot Session'), 'Snapshot Session');

bus.off(catalog.ENTRY_CONTEXT_CATALOG_CHANGED, catalogEventListener);

console.log('entry context catalog smoke ok');
