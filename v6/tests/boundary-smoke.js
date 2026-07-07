import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  createChartSurfaceContract,
  getChartSurfaceEventOnlyBridges,
  getChartSurfaceOwner,
} from '../src/chart-engine/chart-surface-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const V6_ROOT = path.resolve('v6');
const BAR_DATA_ROOT = path.join(V6_ROOT, 'src', 'bar-data');
const CALENDAR_ROOT = path.join(V6_ROOT, 'src', 'calendar');
const CHART_DATA_ROOT = path.join(V6_ROOT, 'src', 'chart-data');
const CHART_ENGINE_ROOT = path.join(V6_ROOT, 'src', 'chart-engine');
const CHART_VIEWPORT_ROOT = path.join(V6_ROOT, 'src', 'chart-viewport');
const DEFAULT_WALL_ROOT = path.join(V6_ROOT, 'src', 'default-wall');
const DISPLAY_TIMEFRAME_ROOT = path.join(V6_ROOT, 'src', 'display-timeframe');
const JOURNAL_PERSISTENCE_ROOT = path.join(V6_ROOT, 'src', 'journal-persistence');
const JOURNAL_ROOT = path.join(V6_ROOT, 'src', 'journal');
const LAYOUT_ROOT = path.join(V6_ROOT, 'src', 'layout');
const LATENCY_ROOT = path.join(V6_ROOT, 'src', 'latency');
const ORDERS_ROOT = path.join(V6_ROOT, 'src', 'orders');
const PANES_ROOT = path.join(V6_ROOT, 'src', 'panes');
const PERSISTENCE_ROOT = path.join(V6_ROOT, 'src', 'persistence');
const REPLAY_ROOT = path.join(V6_ROOT, 'src', 'replay');
const SESSION_ROOT = path.join(V6_ROOT, 'src', 'session');
const SESSION_ANALYTICS_ROOT = path.join(V6_ROOT, 'src', 'session-analytics');
const SESSION_SUMMARY_ROOT = path.join(V6_ROOT, 'src', 'session-summary');
const SETTINGS_ROOT = path.join(V6_ROOT, 'src', 'settings');
const SETTINGS_PANEL_FILE = path.join(V6_ROOT, 'src', 'shell', 'settings-panel.js');
const JOURNAL_SURFACE_FILES = [
  path.join(V6_ROOT, 'src', 'shell', 'journal-surface.js'),
  path.join(V6_ROOT, 'src', 'shell', 'journal-surface-model.js'),
];
const READINESS_FILES = [
  path.join(V6_ROOT, 'src', 'shell', 'readiness-surface.js'),
  path.join(V6_ROOT, 'src', 'shell', 'readiness-surface-model.js'),
];
const REPLAY_WORKFLOW_FILES = [
  path.join(V6_ROOT, 'src', 'shell', 'replay-workflow-surface.js'),
  path.join(V6_ROOT, 'src', 'shell', 'replay-workflow-surface-model.js'),
];
const SESSIONS_SURFACE_FILES = [
  path.join(V6_ROOT, 'src', 'shell', 'sessions-surface.js'),
  path.join(V6_ROOT, 'src', 'shell', 'sessions-surface-model.js'),
];
const STATUS_FILES = [
  path.join(V6_ROOT, 'src', 'shell', 'status-readout.js'),
  path.join(V6_ROOT, 'src', 'shell', 'status-readout-model.js'),
];
const CHART_DATA_SURFACE_BRIDGE_FILE = path.join(V6_ROOT, 'src', 'chart-engine', 'chart-data-surface-bridge.js');
const CHART_HOST_MANAGER_FILE = path.join(V6_ROOT, 'src', 'chart-engine', 'chart-host-manager.js');
const CHART_VIEWPORT_SURFACE_BRIDGE_FILE = path.join(V6_ROOT, 'src', 'chart-engine', 'chart-viewport-surface-bridge.js');
const LIGHTWEIGHT_CHART_ADAPTER_FILE = path.join(V6_ROOT, 'src', 'chart-engine', 'lightweight-chart-adapter.js');
const MANUAL_WALL_INPUT_BRIDGE_FILE = path.join(V6_ROOT, 'src', 'chart-engine', 'manual-wall-input-bridge.js');
const RESET_VIEW_CONTROL_BRIDGE_FILE = path.join(V6_ROOT, 'src', 'chart-engine', 'reset-view-control-bridge.js');
const TRANSPORT_FILE = path.join(V6_ROOT, 'src', 'shell', 'replay-transport.js');
const VIEWPORT_ROOT = path.join(V6_ROOT, 'src', 'viewport');
const WORKSTATION_CHART_SURFACE_FILE = path.join(V6_ROOT, 'src', 'chart-engine', 'workstation-chart-surface.js');
const SOURCE_ROOTS = [
  path.join(V6_ROOT, 'src'),
];
const TEST_ROOTS = [
  path.join(V6_ROOT, 'tests'),
];

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
    } else if (entry.isFile() && /\.(js|html|css)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

async function sourceFilesContaining(token) {
  const matches = [];
  for (const root of SOURCE_ROOTS) {
    for (const file of await walkFiles(root)) {
      const text = await readFile(file, 'utf8');
      if (text.includes(token)) {
        matches.push(path.relative(process.cwd(), file));
      }
    }
  }
  return matches.sort();
}

const forbiddenV5RuntimeImports = [
  {
    pattern: /from\s+['"]\.\.\/\.\.\/v5\/src\/runtime\//,
    reason: 'V6 must not import V5 runtime implementation modules.',
  },
  {
    pattern: /from\s+['"][^'"]*v5\/src\/runtime\//,
    reason: 'V6 must not import V5 runtime implementation modules.',
  },
];

const forbiddenSourcePatterns = [
  ...forbiddenV5RuntimeImports,
  {
    pattern: /primaryState|secondaryState|nonPrimary|non-primary/,
    reason: 'V6 Step 1 must not introduce primary/non-primary state mechanisms.',
  },
];

const forbiddenSessionOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar|bars|viewport)[^'"]*['"]/i,
    reason: 'V6 session modules must not import chart, bar-data, or viewport modules.',
  },
  {
    pattern: /\b(chartRuntime|chartEngine|barData|barsRuntime|viewportIntent|viewportRuntime)\b/,
    reason: 'V6 session modules must not own chart, bar-data, or viewport state.',
  },
];

const forbiddenBarDataOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|replay|session)[^'"]*['"]/i,
    reason: 'V6 bar-data modules must not import chart, replay, or session modules.',
  },
  {
    pattern: /\b(chartRuntime|chartEngine|replayRuntime|replayCursor|viewportIntent|viewportRuntime|setData|updateSeries|setVisibleLogicalRange)\b/,
    reason: 'V6 bar-data modules must not own chart, replay, or viewport state.',
  },
];

const forbiddenReplayOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|viewport)[^'"]*['"]/i,
    reason: 'V6 replay modules must not import chart, bar-data, or viewport modules.',
  },
  {
    pattern: /\b(chartRuntime|chartEngine|barDataRuntime|viewportIntent|viewportRuntime|setData|updateSeries|setVisibleLogicalRange)\b/,
    reason: 'V6 replay modules must not own chart, bar-data, or viewport state.',
  },
];

const forbiddenPaneOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|replay|viewport)[^'"]*['"]/i,
    reason: 'V6 pane modules must not import chart, bar-data, replay, or viewport modules.',
  },
  {
    pattern: /\b(chartRuntime|chartEngine|barDataRuntime|replayRuntime|viewportIntent|viewportRuntime|primaryState|secondaryState|nonPrimary)\b/,
    reason: 'V6 pane modules must not own chart/replay/data/viewport state or primary split state.',
  },
];

const forbiddenViewportDomainPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|replay|session|panes|shell|runtime)[^'"]*['"]/i,
    reason: 'V6 viewport domain modules must remain pure and not import app runtimes or UI modules.',
  },
  {
    pattern: /\b(document|window|HTMLElement|createChart|setData|updateSeries|setVisibleLogicalRange|subscribeVisibleLogicalRangeChange)\b/,
    reason: 'V6 viewport domain modules must not touch DOM or chart engine APIs.',
  },
];

const forbiddenChartDataOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(replay|bar-data\/bar-data-runtime|viewport|shell|runtime\/app-runtime)[^'"]*['"]/i,
    reason: 'V6 chart-data modules must not import replay, bar-data runtime, viewport, shell, or app runtime modules.',
  },
  {
    pattern: /\b(replayCursor|replayRuntime|barDataRuntime|viewportIntent|viewportRuntime|createChart|setData|updateSeries|setVisibleLogicalRange)\b/,
    reason: 'V6 chart-data modules must not own replay cursor, bar-data runtime, viewport intent, or chart engine state.',
  },
];

const forbiddenChartViewportOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|session|shell|v4|vendor|lightweight)[^'"]*['"]/i,
    reason: 'V6 chart-viewport modules must not import bar-data, session, shell, V4, vendor, or chart engine modules.',
  },
  {
    pattern: /\b(createChart|setData|updateSeries|setVisibleLogicalRange|subscribeVisibleLogicalRangeChange|HTMLElement|document|window)\b/,
    reason: 'V6 chart-viewport runtime must not touch DOM or chart engine APIs before the adapter step.',
  },
];

const forbiddenChartEngineOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(replay|bar-data|session|shell|runtime\/app-runtime|chart-viewport)[^'"]*['"]/i,
    reason: 'V6 chart-engine modules must not import business runtimes, shell, or chart-viewport runtime modules.',
  },
  {
    pattern: /\b(viewportIntent|replayCursor|barDataRuntime|replayRuntime|chartViewportRuntime)\b/,
    reason: 'V6 chart-engine adapter must not store durable viewport/replay/bar-data ownership state.',
  },
];

const forbiddenLatencyOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|replay|session|panes|shell|runtime|viewport)[^'"]*['"]/i,
    reason: 'V6 latency modules must remain pure and not import feature runtimes, UI, or chart modules.',
  },
  {
    pattern: /\b(document|window|HTMLElement|LightweightCharts|createChart|setData|updateSeries|setVisibleLogicalRange)\b/,
    reason: 'V6 latency modules must not touch DOM or chart engine APIs.',
  },
];

const forbiddenDefaultWallOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(shell|v4|vendor|lightweight|bar-data)[^'"]*['"]/i,
    reason: 'V6 default-wall modules must not import UI, V4/vendor, chart engine, or bar-data implementation modules.',
  },
  {
    pattern: /\b(document|window|HTMLElement|LightweightCharts|createChart|fetch|XMLHttpRequest|localStorage)\b/,
    reason: 'V6 default-wall modules must not touch DOM, chart engine APIs, browser storage, or network fetch.',
  },
];

const forbiddenTransportOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|replay\/|viewport|default-wall|session|panes)[^'"]*['"]/i,
    reason: 'V6 replay transport UI must dispatch commands only and not import feature runtimes or state modules.',
  },
  {
    pattern: /\b(chartBars|viewportIntent|replayCursor|cursorIndex|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage)\b/,
    reason: 'V6 replay transport UI must not own replay, chart, viewport, data, storage, or network state.',
  },
];

const forbiddenStatusOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|viewport|default-wall|session|panes|replay\/)[^'"]*['"]/i,
    reason: 'V6 status UI must be read-only and not import feature runtimes or state modules.',
  },
  {
    pattern: /\b(dispatchCommand|registerCommand|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage)\b/,
    reason: 'V6 status UI must not dispatch mutation commands or own chart/data/storage/network state.',
  },
];

const forbiddenDisplayTimeframeOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data\/bar-data-runtime|v4|vendor|lightweight|replay\/|session|shell\/workstation|shell\/app)[^'"]*['"]/i,
    reason: 'V6 display-timeframe modules must not import data adapters, replay internals, session, vendor, or shell UI modules.',
  },
  {
    pattern: /\b(createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent)\b/,
    reason: 'V6 display-timeframe modules must not own chart engine, network, storage, replay cursor, or viewport intent state.',
  },
];

const forbiddenLayoutOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|replay|session|shell|v4|vendor|lightweight|display-timeframe)[^'"]*['"]/i,
    reason: 'V6 layout modules must not import chart, data, replay, session, shell, vendor, or feature UI modules.',
  },
  {
    pattern: /\b(document|window|HTMLElement|LightweightCharts|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent|chartBars)\b/,
    reason: 'V6 layout modules must not own DOM, chart engine, network, storage, replay, viewport, or bar state.',
  },
];

const forbiddenSettingsOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|default-wall|display-timeframe|layout|panes|replay|session|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 settings modules must not import feature runtimes, UI, chart, data, replay, session, viewport, V4, or vendor modules.',
  },
  {
    pattern: /\b(document|window|HTMLElement|LightweightCharts|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime)\b/,
    reason: 'V6 settings modules must not own DOM, chart engine, network, storage, replay, data, or viewport state.',
  },
];

const forbiddenSettingsPanelOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|default-wall|display-timeframe|layout|panes|replay|session|settings\/settings-|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 settings UI must dispatch settings commands only and not import feature runtimes, settings internals, or chart/data modules.',
  },
  {
    pattern: /\b(registerCommand|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime)\b/,
    reason: 'V6 settings UI must not own command registration, chart, data, replay, viewport, storage, or network state.',
  },
];

const forbiddenJournalSurfaceOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|default-wall|display-timeframe|layout\/|panes|persistence|replay\/|session|settings\/settings-|v4|vendor|lightweight|viewport|journal\/|journal-persistence)[^'"]*['"]/i,
    reason: 'V6 journal UI must use journal/journal-persistence commands only and not import feature runtimes, internals, V4, vendor, or chart/data modules.',
  },
  {
    pattern: /\b(BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|DEFAULT_WALL_COMMANDS|DISPLAY_TIMEFRAME_COMMANDS|LAYOUT_COMMANDS|PANE_COMMANDS|PERSISTENCE_COMMANDS|REPLAY_COMMANDS|SESSION_COMMANDS|SETTINGS_COMMANDS|registerCommand|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime)\b/,
    reason: 'V6 journal UI must not dispatch or own chart, data, replay, viewport, persistence, settings, storage, or network state.',
  },
];

const forbiddenReadinessSurfaceOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|default-wall|display-timeframe|layout\/|panes|persistence\/|journal\/|journal-persistence|replay\/|session|settings\/settings-|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 readiness UI must read command/runtime metadata only and not import feature runtimes, internals, V4, vendor, or chart/data modules.',
  },
  {
    pattern: /\b(dispatchCommand|registerCommand|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime)\b/,
    reason: 'V6 readiness UI must not dispatch mutation commands or own chart, data, replay, viewport, storage, or network state.',
  },
];

const forbiddenReplayWorkflowSurfaceOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|display-timeframe|layout\/|panes|persistence|journal|session|settings\/settings-|v4|vendor|lightweight|viewport|replay\/|default-wall\/)[^'"]*['"]/i,
    reason: 'V6 replay workflow UI must use replay/default-wall commands only and not import feature runtimes, internals, V4, vendor, or chart/data modules.',
  },
  {
    pattern: /\b(BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|DISPLAY_TIMEFRAME_COMMANDS|JOURNAL_COMMANDS|JOURNAL_PERSISTENCE_COMMANDS|LAYOUT_COMMANDS|PANE_COMMANDS|PERSISTENCE_COMMANDS|SESSION_COMMANDS|SETTINGS_COMMANDS|LOAD_SESSION|DEFAULT_WALL_COMMANDS\.LOAD|DEFAULT_WALL_COMMANDS\.NEXT|REPLAY_COMMANDS\.NEXT|REPLAY_COMMANDS\.PLAY|registerCommand|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime)\b/,
    reason: 'V6 replay workflow UI must not load sessions, advance replay, or own chart, data, viewport, storage, or network state.',
  },
];

const forbiddenSessionsSurfaceOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(chart|bar-data|default-wall|display-timeframe|layout\/|panes|persistence|journal|replay\/|settings\/settings-|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 sessions UI must use session commands only and not import feature runtimes, internals, V4, vendor, or chart/data modules.',
  },
  {
    pattern: /\b(BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|DEFAULT_WALL_COMMANDS|DISPLAY_TIMEFRAME_COMMANDS|JOURNAL_COMMANDS|JOURNAL_PERSISTENCE_COMMANDS|LAYOUT_COMMANDS|PANE_COMMANDS|PERSISTENCE_COMMANDS|REPLAY_COMMANDS|SETTINGS_COMMANDS|registerCommand|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime)\b/,
    reason: 'V6 sessions UI must not dispatch or own chart, data, replay, viewport, persistence, settings, storage, or network state.',
  },
];

const forbiddenPersistenceOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|chart|default-wall|display-timeframe|layout|panes|replay|session|settings|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 persistence modules must not import feature runtimes, UI, chart, data, replay, session, settings, viewport, V4, or vendor modules.',
  },
  {
    pattern: /\b(createChart|setData|setVisibleLogicalRange|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime|chartViewportRuntime|subscribeEvent)\b/,
    reason: 'V6 persistence modules must not own chart, data, replay, viewport, or feature event state.',
  },
];

const forbiddenJournalOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|chart|default-wall|display-timeframe|layout|panes|persistence|replay|session|settings|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 journal modules must not import feature runtimes, UI, persistence internals, chart, data, replay, session, settings, viewport, V4, or vendor modules.',
  },
  {
    pattern: /\b(createChart|setData|setVisibleLogicalRange|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime|chartViewportRuntime|subscribeEvent|localStorage|fetch|XMLHttpRequest)\b/,
    reason: 'V6 journal modules must not own chart, data, replay, viewport, persistence, storage, or network state.',
  },
];

const forbiddenJournalPersistenceOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|chart|default-wall|display-timeframe|layout|panes|replay|session|settings|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 journal-persistence bridge must not import feature runtimes, UI, chart, data, replay, session, settings, viewport, V4, or vendor modules.',
  },
  {
    pattern: /\b(createChart|setData|setVisibleLogicalRange|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime|chartViewportRuntime|subscribeEvent|localStorage|fetch|XMLHttpRequest)\b/,
    reason: 'V6 journal-persistence bridge must not own chart, data, replay, viewport, storage, or network state.',
  },
];

const forbiddenSessionSummaryOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|chart|default-wall|display-timeframe|journal\/|journal-persistence|layout|panes|persistence|replay|settings|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 session-summary modules must stay read-only and not import feature runtimes, UI, V4, vendor, chart, data, replay, viewport, journal, calendar, or settings modules.',
  },
  {
    pattern: /\b(BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|DEFAULT_WALL_COMMANDS|DISPLAY_TIMEFRAME_COMMANDS|JOURNAL_COMMANDS|JOURNAL_PERSISTENCE_COMMANDS|LAYOUT_COMMANDS|PANE_COMMANDS|PERSISTENCE_COMMANDS|REPLAY_COMMANDS|SETTINGS_COMMANDS|dispatchCommand|registerCommand|subscribeEvent|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|document|window|HTMLElement|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime|chartViewportRuntime)\b/,
    reason: 'V6 session-summary modules must not dispatch commands or own chart, data, replay, viewport, UI, storage, or network state.',
  },
];

const forbiddenSessionAnalyticsOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|chart|default-wall|display-timeframe|journal\/|journal-persistence|layout|panes|persistence|replay|settings|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 session-analytics modules must stay read-only and not import feature runtimes, UI, V4, vendor, chart, data, replay, viewport, journal, calendar, or settings modules.',
  },
  {
    pattern: /\b(BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|DEFAULT_WALL_COMMANDS|DISPLAY_TIMEFRAME_COMMANDS|JOURNAL_COMMANDS|JOURNAL_PERSISTENCE_COMMANDS|LAYOUT_COMMANDS|PANE_COMMANDS|PERSISTENCE_COMMANDS|REPLAY_COMMANDS|SETTINGS_COMMANDS|dispatchCommand|registerCommand|subscribeEvent|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|document|window|HTMLElement|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime|chartViewportRuntime)\b/,
    reason: 'V6 session-analytics modules must not dispatch commands or own chart, data, replay, viewport, UI, storage, or network state.',
  },
];

const forbiddenOrdersOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|calendar|chart|default-wall|display-timeframe|journal\/|journal-persistence|layout|panes|persistence|replay|session\/session-|settings|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 orders modules must not import feature runtimes, UI, V4, vendor, chart, data, replay, viewport, journal, calendar, or settings modules before the owner contract is expanded.',
  },
  {
    pattern: /\b(BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|DEFAULT_WALL_COMMANDS|DISPLAY_TIMEFRAME_COMMANDS|JOURNAL_COMMANDS|JOURNAL_PERSISTENCE_COMMANDS|LAYOUT_COMMANDS|PANE_COMMANDS|PERSISTENCE_COMMANDS|REPLAY_COMMANDS|SESSION_COMMANDS|SETTINGS_COMMANDS|dispatchCommand|registerCommand|subscribeEvent|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|document|window|HTMLElement|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime|chartViewportRuntime)\b/,
    reason: 'V6 orders modules must not dispatch commands or own chart, data, replay, viewport, UI, storage, or network state.',
  },
];

const forbiddenCalendarOwnershipPatterns = [
  {
    pattern: /from\s+['"][^'"]*(bar-data|chart|default-wall|display-timeframe|journal\/|journal-persistence|layout|orders|panes|persistence|replay|session\/session-|settings|shell|v4|vendor|lightweight|viewport)[^'"]*['"]/i,
    reason: 'V6 calendar modules must not import feature runtimes, UI, V4, vendor, chart, data, replay, viewport, journal, orders, or settings modules before the owner contract is expanded.',
  },
  {
    pattern: /\b(BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|DEFAULT_WALL_COMMANDS|DISPLAY_TIMEFRAME_COMMANDS|JOURNAL_COMMANDS|JOURNAL_PERSISTENCE_COMMANDS|LAYOUT_COMMANDS|PANE_COMMANDS|PERSISTENCE_COMMANDS|REPLAY_COMMANDS|SESSION_COMMANDS|SETTINGS_COMMANDS|dispatchCommand|registerCommand|subscribeEvent|createChart|setData|setVisibleLogicalRange|fetch|XMLHttpRequest|localStorage|document|window|HTMLElement|replayCursor|viewportIntent|chartBars|barDataRuntime|replayRuntime|chartViewportRuntime)\b/,
    reason: 'V6 calendar modules must not dispatch commands or own chart, data, replay, viewport, UI, storage, or network state.',
  },
];

const violations = [];
for (const root of SOURCE_ROOTS) {
  for (const file of await walkFiles(root)) {
    const text = await readFile(file, 'utf8');
    forbiddenSourcePatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(text)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          pattern: String(pattern),
          reason,
        });
      }
    });
  }
}

for (const root of TEST_ROOTS) {
  for (const file of await walkFiles(root)) {
    const text = await readFile(file, 'utf8');
    forbiddenV5RuntimeImports.forEach(({ pattern, reason }) => {
      if (pattern.test(text)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          pattern: String(pattern),
          reason,
        });
      }
    });
  }
}

for (const file of await walkFiles(SESSION_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenSessionOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(BAR_DATA_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenBarDataOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(REPLAY_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenReplayOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(PANES_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenPaneOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(VIEWPORT_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenViewportDomainPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(CHART_DATA_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenChartDataOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(CHART_VIEWPORT_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenChartViewportOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(CHART_ENGINE_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenChartEngineOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(LATENCY_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenLatencyOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(DEFAULT_WALL_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenDefaultWallOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

{
  const text = await readFile(TRANSPORT_FILE, 'utf8');
  forbiddenTransportOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), TRANSPORT_FILE),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of STATUS_FILES) {
  const text = await readFile(file, 'utf8');
  forbiddenStatusOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(DISPLAY_TIMEFRAME_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenDisplayTimeframeOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(LAYOUT_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenLayoutOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(SETTINGS_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenSettingsOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

{
  const text = await readFile(SETTINGS_PANEL_FILE, 'utf8');
  forbiddenSettingsPanelOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), SETTINGS_PANEL_FILE),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of READINESS_FILES) {
  const text = await readFile(file, 'utf8');
  forbiddenReadinessSurfaceOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of JOURNAL_SURFACE_FILES) {
  const text = await readFile(file, 'utf8');
  forbiddenJournalSurfaceOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of REPLAY_WORKFLOW_FILES) {
  const text = await readFile(file, 'utf8');
  forbiddenReplayWorkflowSurfaceOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of SESSIONS_SURFACE_FILES) {
  const text = await readFile(file, 'utf8');
  forbiddenSessionsSurfaceOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(PERSISTENCE_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenPersistenceOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(JOURNAL_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenJournalOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(JOURNAL_PERSISTENCE_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenJournalPersistenceOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(SESSION_SUMMARY_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenSessionSummaryOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(SESSION_ANALYTICS_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenSessionAnalyticsOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(ORDERS_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenOrdersOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

for (const file of await walkFiles(CALENDAR_ROOT)) {
  const text = await readFile(file, 'utf8');
  forbiddenCalendarOwnershipPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(text)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        pattern: String(pattern),
        reason,
      });
    }
  });
}

const chartSurfaceContract = createChartSurfaceContract();
if (getChartSurfaceOwner() !== 'workstation-chart-surface') {
  violations.push({
    file: 'v6/src/chart-engine/chart-surface-contract.js',
    pattern: 'getChartSurfaceOwner()',
    reason: 'V6 chart surface owner must remain workstation-chart-surface.',
  });
}

[
  ['canWriteSeriesData', true],
  ['canApplyVisibleLogicalRange', true],
  ['canMeasureUserVisibleRange', true],
  ['canFetchBars', false],
  ['canAdvanceReplay', false],
  ['canLoadSession', false],
  ['canOwnDashboardRowActions', false],
].forEach(([field, expected]) => {
  if (chartSurfaceContract[field] !== expected) {
    violations.push({
      file: 'v6/src/chart-engine/chart-surface-contract.js',
      pattern: field,
      reason: `V6 chart surface contract ${field} must remain ${expected}.`,
    });
  }
});

const chartApiExpectedFiles = [
  {
    expected: [path.relative(process.cwd(), LIGHTWEIGHT_CHART_ADAPTER_FILE)],
    token: 'createChart(host',
  },
  {
    expected: [path.relative(process.cwd(), LIGHTWEIGHT_CHART_ADAPTER_FILE)],
    token: 'series.setData',
  },
  {
    expected: [path.relative(process.cwd(), LIGHTWEIGHT_CHART_ADAPTER_FILE)],
    token: 'series.update',
  },
  {
    expected: [
      path.relative(process.cwd(), CHART_HOST_MANAGER_FILE),
      path.relative(process.cwd(), LIGHTWEIGHT_CHART_ADAPTER_FILE),
      path.relative(process.cwd(), WORKSTATION_CHART_SURFACE_FILE),
    ].sort(),
    token: 'setVisibleLogicalRange',
  },
];

for (const { expected, token } of chartApiExpectedFiles) {
  const actual = await sourceFilesContaining(token);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    violations.push({
      file: 'v6/src/chart-engine',
      pattern: token,
      reason: `V6 chart surface contract allows ${token} only in ${expected.join(', ')}.`,
    });
  }
}

const bridgeFilesById = new Map([
  ['chart-data-surface-bridge', CHART_DATA_SURFACE_BRIDGE_FILE],
  ['chart-viewport-surface-bridge', CHART_VIEWPORT_SURFACE_BRIDGE_FILE],
]);
for (const bridgeId of getChartSurfaceEventOnlyBridges()) {
  const bridgeFile = bridgeFilesById.get(bridgeId);
  const text = bridgeFile ? await readFile(bridgeFile, 'utf8') : '';
  if (!bridgeFile || !/subscribeEvent/.test(text) || /dispatchCommand|BAR_DATA_COMMANDS|REPLAY_COMMANDS|SESSION_COMMANDS|fetch\(|XMLHttpRequest/.test(text)) {
    violations.push({
      file: bridgeFile ? path.relative(process.cwd(), bridgeFile) : 'v6/src/chart-engine/chart-surface-contract.js',
      pattern: bridgeId,
      reason: 'V6 chart-data/chart-viewport surface bridges must remain event-only.',
    });
  }
}

for (const file of [MANUAL_WALL_INPUT_BRIDGE_FILE, RESET_VIEW_CONTROL_BRIDGE_FILE]) {
  const text = await readFile(file, 'utf8');
  if (!/CHART_VIEWPORT_COMMANDS/.test(text) || /\bsetData\b|REPLAY_COMMANDS|SESSION_COMMANDS|fetch\(|XMLHttpRequest/.test(text)) {
    violations.push({
      file: path.relative(process.cwd(), file),
      pattern: 'chart surface control bridge',
      reason: 'V6 manual-wall/reset-view control bridges may dispatch viewport commands only.',
    });
  }
}

if (JSON.stringify(getVisibleRecentSessionRowActions().map((action) => action.id)) !== JSON.stringify(['summary', 'analytics', 'copy'])) {
  violations.push({
    file: 'v6/src/shell/session-row-action-boundaries.js',
    pattern: 'getVisibleRecentSessionRowActions',
    reason: 'V6 chart surface boundary work must not expose more dashboard row actions.',
  });
}

assert.deepEqual(violations, []);

console.log('v6 boundary smoke passed');
