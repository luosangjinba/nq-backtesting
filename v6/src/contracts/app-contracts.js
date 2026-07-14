export const APP_COMMANDS = Object.freeze({
  GET_STATUS: 'app.getStatus',
});

export const APP_EVENTS = Object.freeze({
  BOOTED: 'app:booted',
});

export const SESSION_COMMANDS = Object.freeze({
  COPY: 'session.copy',
  CREATE: 'session.create',
  DELETE: 'session.delete',
  GET_ACTIVE: 'session.getActive',
  GET_BY_ID: 'session.getById',
  LIST: 'session.list',
  OPEN: 'session.open',
});

export const SESSION_EVENTS = Object.freeze({
  COPIED: 'session:copied',
  CREATED: 'session:created',
  OPENED: 'session:opened',
});

export const CHART_ENTRY_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntry.getState',
});

export const CHART_ENTRY_EVENTS = Object.freeze({
  ACTIVATED: 'chartEntry:activated',
});

export const CHART_ENTRY_RESTART_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryRestart.getState',
  RESTART: 'chartEntryRestart.restart',
});

export const CHART_ENTRY_RESTART_EVENTS = Object.freeze({
  RESTARTED: 'chartEntryRestart:restarted',
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

export const CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS = Object.freeze({
  GET_STATE: 'chartEntryManualPrevious.getState',
  PREVIOUS: 'chartEntryManualPrevious.previous',
});

export const CHART_ENTRY_MANUAL_PREVIOUS_EVENTS = Object.freeze({
  REWOUND: 'chartEntryManualPrevious:rewound',
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

export const TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS = Object.freeze({
  GET_SNAPSHOT: 'targetMaterializationReplayDiagnostics.getSnapshot',
  UPDATE_SNAPSHOT: 'targetMaterializationReplayDiagnostics.updateSnapshot',
});

export const TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS = Object.freeze({
  SNAPSHOT_READY: 'targetMaterializationReplayDiagnostics:snapshotReady',
});

export const CHART_HISTORY_COMMANDS = Object.freeze({
  GET_STATE: 'chartHistory.getState',
  REQUEST_LEFT_EXTENSION: 'chartHistory.requestLeftExtension',
});

export const CHART_HISTORY_EVENTS = Object.freeze({
  LEFT_EXTENSION_IGNORED: 'chartHistory:leftExtensionIgnored',
  LEFT_EXTENSION_LOADED: 'chartHistory:leftExtensionLoaded',
});

export const BAR_DATA_COMMANDS = Object.freeze({
  GET_BOUNDARY_METADATA: 'barData.getBoundaryMetadata',
  GET_CACHE_SUMMARY: 'barData.getCacheSummary',
  GET_TARGET_CACHE_SUMMARY: 'barData.getTargetCacheSummary',
  GET_TARGET_WINDOW: 'barData.getTargetWindow',
  GET_WINDOW: 'barData.getWindow',
  LOAD_TARGET_WINDOW: 'barData.loadTargetWindow',
  LOAD_WINDOW: 'barData.loadWindow',
  PLAN_TARGET_WINDOW: 'barData.planTargetWindow',
  PLAN_WINDOW: 'barData.planWindow',
  RELEASE_TARGET_WINDOW: 'barData.releaseTargetWindow',
  RELEASE_WINDOW: 'barData.releaseWindow',
});

export const BAR_DATA_EVENTS = Object.freeze({
  TARGET_WINDOW_LOADED: 'barData:targetWindowLoaded',
  TARGET_WINDOW_RELEASED: 'barData:targetWindowReleased',
  WINDOW_LOADED: 'barData:windowLoaded',
  WINDOW_RELEASED: 'barData:windowReleased',
});

export const CHART_BOUNDARY_METADATA_COMMANDS = Object.freeze({
  GET_STATE: 'chartBoundaryMetadata.getState',
  REFRESH: 'chartBoundaryMetadata.refresh',
});

export const CHART_BOUNDARY_METADATA_EVENTS = Object.freeze({
  UPDATED: 'chartBoundaryMetadata:updated',
});

export const REPLAY_COMMANDS = Object.freeze({
  GET_STATE: 'replay.getState',
  LOAD_SESSION: 'replay.loadSession',
  NEXT: 'replay.next',
  PAUSE: 'replay.pause',
  PLAY: 'replay.play',
  PREVIOUS: 'replay.previous',
  RESET: 'replay.reset',
  SET_CURSOR_TIME: 'replay.setCursorTime',
});

export const REPLAY_EVENTS = Object.freeze({
  ADVANCED: 'replay:advanced',
  LOADED: 'replay:loaded',
  PLAYBACK_CHANGED: 'replay:playbackChanged',
  REWOUND: 'replay:rewound',
  RESET: 'replay:reset',
});

export const REPLAY_NAVIGATION_PREFERENCES_COMMANDS = Object.freeze({
  GET_SNAPSHOT: 'replayNavigationPreferences.getSnapshot',
  RESET: 'replayNavigationPreferences.reset',
  UPDATE: 'replayNavigationPreferences.update',
});

export const REPLAY_NAVIGATION_PREFERENCES_EVENTS = Object.freeze({
  RESET: 'replayNavigationPreferences:reset',
  UPDATED: 'replayNavigationPreferences:updated',
});

export const REPLAY_NAVIGATION_COMMANDS = Object.freeze({
  GET_STATE: 'replayNavigation.getState',
  NAVIGATE: 'replayNavigation.navigate',
});

export const REPLAY_NAVIGATION_EVENTS = Object.freeze({
  COMPLETED: 'replayNavigation:completed',
  REJECTED: 'replayNavigation:rejected',
});

export const PANE_COMMANDS = Object.freeze({
  GET_ACTIVE: 'pane.getActive',
  GET_BY_ID: 'pane.getById',
  GET_SNAPSHOT: 'pane.getSnapshot',
  LIST: 'pane.list',
  SET_ACTIVE: 'pane.setActive',
  SET_DISPLAY_TIMEFRAME: 'pane.setDisplayTimeframe',
  SET_INTERVAL_INTENT: 'pane.setIntervalIntent',
  SET_SYMBOL_INTENT: 'pane.setSymbolIntent',
});

export const PANE_EVENTS = Object.freeze({
  ACTIVE_CHANGED: 'pane:activeChanged',
  DISPLAY_TIMEFRAME_CHANGED: 'pane:displayTimeframeChanged',
  INTERVAL_INTENT_CHANGED: 'pane:intervalIntentChanged',
  SYMBOL_INTENT_CHANGED: 'pane:symbolIntentChanged',
});

export const PANE_INTENT_SYNC_COMMANDS = Object.freeze({
  GET_STATE: 'paneIntentSync.getState',
});

export const PANE_INTENT_SYNC_EVENTS = Object.freeze({
  APPLIED: 'paneIntentSync:applied',
  PLANNED: 'paneIntentSync:planned',
});

export const PANE_INTENT_RELOAD_COMMANDS = Object.freeze({
  GET_STATE: 'paneIntentReload.getState',
});

export const PANE_INTENT_RELOAD_EVENTS = Object.freeze({
  INTENT_CREATED: 'paneIntentReload:intentCreated',
});

export const PANE_INTENT_RELOAD_PLAN_COMMANDS = Object.freeze({
  GET_STATE: 'paneIntentReloadPlan.getState',
});

export const PANE_INTENT_RELOAD_PLAN_EVENTS = Object.freeze({
  PLANNED: 'paneIntentReloadPlan:planned',
});

export const PANE_INTENT_RELOAD_DATA_COMMANDS = Object.freeze({
  GET_STATE: 'paneIntentReloadData.getState',
});

export const PANE_INTENT_RELOAD_DATA_EVENTS = Object.freeze({
  LOADED: 'paneIntentReloadData:loaded',
});

export const PANE_INTENT_RELOAD_CHART_DATA_COMMANDS = Object.freeze({
  GET_STATE: 'paneIntentReloadChartData.getState',
});

export const PANE_INTENT_RELOAD_CHART_DATA_EVENTS = Object.freeze({
  REPLACED: 'paneIntentReloadChartData:replaced',
});

export const PANE_INTENT_RELOAD_VIEWPORT_COMMANDS = Object.freeze({
  GET_STATE: 'paneIntentReloadViewport.getState',
});

export const PANE_INTENT_RELOAD_VIEWPORT_EVENTS = Object.freeze({
  PROJECTED: 'paneIntentReloadViewport:projected',
});

export const CHART_DATA_COMMANDS = Object.freeze({
  APPEND_BARS: 'chartData.appendBars',
  CLEAR_PANE: 'chartData.clearPane',
  GET_BARS: 'chartData.getBars',
  GET_SOURCE_BARS: 'chartData.getSourceBars',
  GET_SUMMARY: 'chartData.getSummary',
  PREPEND_BARS: 'chartData.prependBars',
  REPLACE_BARS: 'chartData.replaceBars',
});

export const CHART_DATA_EVENTS = Object.freeze({
  BARS_CHANGED: 'chartData:barsChanged',
});

export const CHART_DATA_PROJECTION_COMMANDS = Object.freeze({
  GET_STATE: 'chartDataProjection.getState',
  PROJECT: 'chartDataProjection.project',
});

export const CHART_DATA_PROJECTION_EVENTS = Object.freeze({
  PROJECTED: 'chartDataProjection:projected',
});

export const CHART_VIEWPORT_COMMANDS = Object.freeze({
  APPLY_CHART_DATA_REVISION: 'chartViewport.applyChartDataRevision',
  ENSURE_INTENT: 'chartViewport.ensureIntent',
  GET_PANE: 'chartViewport.getPane',
  GET_SNAPSHOT: 'chartViewport.getSnapshot',
  RESET_VIEW: 'chartViewport.resetView',
  SET_MANUAL_INTENT: 'chartViewport.setManualIntent',
  UPDATE_DEFAULT_RIGHT_OFFSET: 'chartViewport.updateDefaultRightOffset',
});

export const CHART_VIEWPORT_EVENTS = Object.freeze({
  INTENT_CHANGED: 'chartViewport:intentChanged',
  PROJECTED: 'chartViewport:projected',
});

export const CHART_SURFACE_EVENTS = Object.freeze({
  CROSSHAIR_CHANGED: 'chartSurface:crosshairChanged',
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

export const PLAYBACK_PERIOD_COMMANDS = Object.freeze({
  GET_STATE: 'playbackPeriod.getState',
  SET_PERIOD: 'playbackPeriod.setPeriod',
  SET_SYNC: 'playbackPeriod.setSync',
});

export const PLAYBACK_PERIOD_EVENTS = Object.freeze({
  CHANGED: 'playbackPeriod:changed',
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

export const LAYOUT_PANE_BOOTSTRAP_COMMANDS = Object.freeze({
  BOOTSTRAP_VISIBLE: 'layoutPaneBootstrap.bootstrapVisible',
  GET_STATE: 'layoutPaneBootstrap.getState',
});

export const LAYOUT_PANE_BOOTSTRAP_EVENTS = Object.freeze({
  BOOTSTRAPPED: 'layoutPaneBootstrap:bootstrapped',
});

export const SETTINGS_COMMANDS = Object.freeze({
  GET_DEFAULTS: 'settings.getDefaults',
  GET_SNAPSHOT: 'settings.getSnapshot',
  RESET: 'settings.reset',
  UPDATE: 'settings.update',
});

export const SETTINGS_EVENTS = Object.freeze({
  DRAFT_PREVIEWED: 'settings:draftPreviewed',
  HYDRATED: 'settings:hydrated',
  PERSISTENCE_FAILED: 'settings:persistenceFailed',
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
