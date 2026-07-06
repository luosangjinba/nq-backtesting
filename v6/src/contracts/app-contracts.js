export const APP_COMMANDS = Object.freeze({
  GET_STATUS: 'app.getStatus',
});

export const APP_EVENTS = Object.freeze({
  BOOTED: 'app:booted',
});

export const SESSION_COMMANDS = Object.freeze({
  CREATE: 'session.create',
  GET_ACTIVE: 'session.getActive',
  GET_BY_ID: 'session.getById',
  LIST: 'session.list',
  OPEN: 'session.open',
});

export const SESSION_EVENTS = Object.freeze({
  CREATED: 'session:created',
  OPENED: 'session:opened',
});

export const CHART_ENTRY_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntry.getState',
});

export const CHART_ENTRY_EVENTS = Object.freeze({
  ACTIVATED: 'chartEntry:activated',
});

export const CHART_ENTRY_INITIALIZATION_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryInitialization.getState',
});

export const CHART_ENTRY_INITIALIZATION_EVENTS = Object.freeze({
  PLANNED: 'chartEntryInitialization:planned',
});

export const CHART_ENTRY_CONTEXT_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryContext.getState',
});

export const CHART_ENTRY_CONTEXT_EVENTS = Object.freeze({
  LOADED: 'chartEntryContext:loaded',
});

export const CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryReplayBootstrap.getState',
});

export const CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS = Object.freeze({
  LOADED: 'chartEntryReplayBootstrap:loaded',
});

export const CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryDefaultWallPlan.getState',
});

export const CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS = Object.freeze({
  PLANNED: 'chartEntryDefaultWallPlan:planned',
});

export const CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryProjectionPreparation.getState',
});

export const CHART_ENTRY_PROJECTION_PREPARATION_EVENTS = Object.freeze({
  PREPARED: 'chartEntryProjectionPreparation:prepared',
});

export const CHART_ENTRY_PROJECTION_APPLY_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryProjectionApply.getState',
});

export const CHART_ENTRY_PROJECTION_APPLY_EVENTS = Object.freeze({
  APPLIED: 'chartEntryProjectionApply:applied',
});

export const CHART_ENTRY_MANUAL_NEXT_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryManualNext.getState',
  NEXT: 'chartEntryManualNext.next',
});

export const CHART_ENTRY_MANUAL_NEXT_EVENTS = Object.freeze({
  ADVANCED: 'chartEntryManualNext:advanced',
});

export const CHART_ENTRY_AUTO_PLAY_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryAutoPlay.getState',
  SET_SPEED: 'chartEntryAutoPlay.setSpeed',
  START: 'chartEntryAutoPlay.start',
  STOP: 'chartEntryAutoPlay.stop',
});

export const CHART_ENTRY_AUTO_PLAY_EVENTS = Object.freeze({
  STARTED: 'chartEntryAutoPlay:started',
  STOPPED: 'chartEntryAutoPlay:stopped',
  TICKED: 'chartEntryAutoPlay:ticked',
});

export const BAR_DATA_COMMANDS = Object.freeze({
  GET_CACHE_SUMMARY: 'barData.getCacheSummary',
  GET_WINDOW: 'barData.getWindow',
  LOAD_WINDOW: 'barData.loadWindow',
  PLAN_WINDOW: 'barData.planWindow',
  RELEASE_WINDOW: 'barData.releaseWindow',
});

export const BAR_DATA_EVENTS = Object.freeze({
  WINDOW_LOADED: 'barData:windowLoaded',
  WINDOW_RELEASED: 'barData:windowReleased',
});

export const REPLAY_COMMANDS = Object.freeze({
  GET_STATE: 'replay.getState',
  LOAD_SESSION: 'replay.loadSession',
  NEXT: 'replay.next',
  PAUSE: 'replay.pause',
  PLAY: 'replay.play',
  RESET: 'replay.reset',
});

export const REPLAY_EVENTS = Object.freeze({
  ADVANCED: 'replay:advanced',
  LOADED: 'replay:loaded',
  PLAYBACK_CHANGED: 'replay:playbackChanged',
  RESET: 'replay:reset',
});

export const PANE_COMMANDS = Object.freeze({
  GET_ACTIVE: 'pane.getActive',
  GET_BY_ID: 'pane.getById',
  GET_SNAPSHOT: 'pane.getSnapshot',
  LIST: 'pane.list',
  SET_ACTIVE: 'pane.setActive',
  SET_DISPLAY_TIMEFRAME: 'pane.setDisplayTimeframe',
});

export const PANE_EVENTS = Object.freeze({
  ACTIVE_CHANGED: 'pane:activeChanged',
  DISPLAY_TIMEFRAME_CHANGED: 'pane:displayTimeframeChanged',
});

export const CHART_DATA_COMMANDS = Object.freeze({
  APPEND_BARS: 'chartData.appendBars',
  CLEAR_PANE: 'chartData.clearPane',
  GET_BARS: 'chartData.getBars',
  GET_SUMMARY: 'chartData.getSummary',
  REPLACE_BARS: 'chartData.replaceBars',
});

export const CHART_DATA_EVENTS = Object.freeze({
  BARS_CHANGED: 'chartData:barsChanged',
});

export const CHART_VIEWPORT_COMMANDS = Object.freeze({
  APPLY_CHART_DATA_REVISION: 'chartViewport.applyChartDataRevision',
  ENSURE_INTENT: 'chartViewport.ensureIntent',
  GET_PANE: 'chartViewport.getPane',
  GET_SNAPSHOT: 'chartViewport.getSnapshot',
  SET_MANUAL_INTENT: 'chartViewport.setManualIntent',
});

export const CHART_VIEWPORT_EVENTS = Object.freeze({
  INTENT_CHANGED: 'chartViewport:intentChanged',
  PROJECTED: 'chartViewport:projected',
});

export const DEFAULT_WALL_COMMANDS = Object.freeze({
  GET_STATE: 'defaultWall.getState',
  LOAD: 'defaultWall.load',
  NEXT: 'defaultWall.next',
});

export const DEFAULT_WALL_EVENTS = Object.freeze({
  LOADED: 'defaultWall:loaded',
  ADVANCED: 'defaultWall:advanced',
});

export const DISPLAY_TIMEFRAME_COMMANDS = Object.freeze({
  APPLY: 'displayTimeframe.apply',
});

export const DISPLAY_TIMEFRAME_EVENTS = Object.freeze({
  APPLIED: 'displayTimeframe:applied',
});

export const LAYOUT_COMMANDS = Object.freeze({
  GET_SNAPSHOT: 'layout.getSnapshot',
  SET_ACTIVE_PANE: 'layout.setActivePane',
  SET_MODE: 'layout.setMode',
  SET_SYNC: 'layout.setSync',
});

export const LAYOUT_EVENTS = Object.freeze({
  ACTIVE_PANE_CHANGED: 'layout:activePaneChanged',
  MODE_CHANGED: 'layout:modeChanged',
  SYNC_CHANGED: 'layout:syncChanged',
});

export const SETTINGS_COMMANDS = Object.freeze({
  GET_SNAPSHOT: 'settings.getSnapshot',
  RESET: 'settings.reset',
  UPDATE: 'settings.update',
});

export const SETTINGS_EVENTS = Object.freeze({
  RESET: 'settings:reset',
  UPDATED: 'settings:updated',
});

export const PERSISTENCE_COMMANDS = Object.freeze({
  CLEAR: 'persistence.clear',
  DELETE_RECORD: 'persistence.deleteRecord',
  GET_RECORD: 'persistence.getRecord',
  LIST_RECORDS: 'persistence.listRecords',
  SAVE_RECORD: 'persistence.saveRecord',
});

export const PERSISTENCE_EVENTS = Object.freeze({
  CLEARED: 'persistence:cleared',
  DELETED: 'persistence:deleted',
  SAVED: 'persistence:saved',
});

export const JOURNAL_COMMANDS = Object.freeze({
  ADD_ENTRY: 'journal.addEntry',
  ANALYZE_RECORDS: 'journal.analyzeRecords',
  DELETE_ENTRY: 'journal.deleteEntry',
  GET_ENTRY: 'journal.getEntry',
  LIST_ENTRIES: 'journal.listEntries',
  REPLACE_ENTRIES: 'journal.replaceEntries',
  UPDATE_ENTRY: 'journal.updateEntry',
});

export const JOURNAL_EVENTS = Object.freeze({
  ENTRY_ADDED: 'journal:entryAdded',
  ENTRY_DELETED: 'journal:entryDeleted',
  ENTRY_REPLACED: 'journal:entryReplaced',
  ENTRY_UPDATED: 'journal:entryUpdated',
});

export const JOURNAL_PERSISTENCE_COMMANDS = Object.freeze({
  DELETE_SNAPSHOT: 'journalPersistence.deleteSnapshot',
  LOAD_SNAPSHOT: 'journalPersistence.loadSnapshot',
  SAVE_SNAPSHOT: 'journalPersistence.saveSnapshot',
});

export const JOURNAL_PERSISTENCE_EVENTS = Object.freeze({
  SNAPSHOT_DELETED: 'journalPersistence:snapshotDeleted',
  SNAPSHOT_LOADED: 'journalPersistence:snapshotLoaded',
  SNAPSHOT_SAVED: 'journalPersistence:snapshotSaved',
});
