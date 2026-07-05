import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const V6_ROOT = path.resolve('v6');
const BAR_DATA_ROOT = path.join(V6_ROOT, 'src', 'bar-data');
const CHART_DATA_ROOT = path.join(V6_ROOT, 'src', 'chart-data');
const CHART_ENGINE_ROOT = path.join(V6_ROOT, 'src', 'chart-engine');
const CHART_VIEWPORT_ROOT = path.join(V6_ROOT, 'src', 'chart-viewport');
const DEFAULT_WALL_ROOT = path.join(V6_ROOT, 'src', 'default-wall');
const LATENCY_ROOT = path.join(V6_ROOT, 'src', 'latency');
const PANES_ROOT = path.join(V6_ROOT, 'src', 'panes');
const REPLAY_ROOT = path.join(V6_ROOT, 'src', 'replay');
const SESSION_ROOT = path.join(V6_ROOT, 'src', 'session');
const VIEWPORT_ROOT = path.join(V6_ROOT, 'src', 'viewport');
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

assert.deepEqual(violations, []);

console.log('v6 boundary smoke passed');
