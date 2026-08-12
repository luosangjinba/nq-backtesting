import { parse } from 'acorn';
import { SDK_SPECIFIER } from './contract.js';
import { diagnostic } from './diagnostic.js';

const API_PATTERNS = Object.freeze([
  { code: 'V7DK_API_FORBIDDEN', label: 'ambient Date', pattern: /\bDate\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'ambient locale', pattern: /\bIntl\b|\.toLocale(?:String|DateString|TimeString)\s*\(/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'ambient randomness', pattern: /\bMath\s*\.\s*random\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'browser DOM', pattern: /\b(?:document|window|navigator|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D)\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'browser worker', pattern: /\b(?:Worker|SharedWorker|ServiceWorker)\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'environment access', pattern: /\b(?:process|Deno|Bun)\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'network API', pattern: /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'raw chart handle', pattern: /\b(?:IChartApi|ISeriesApi|LightweightCharts|ChartApi|SeriesApi)\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'runtime global escape', pattern: /\bglobalThis\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'prototype or constructor escape', pattern: /\.\s*(?:constructor|__proto__|prototype)\b|\[\s*['"](?:constructor|__proto__|prototype)['"]\s*\]/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'reflective metaprogramming', pattern: /\b(?:Proxy|Reflect)\b|\bObject\s*\.\s*(?:getPrototypeOf|setPrototypeOf)\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'WebAssembly', pattern: /\bWebAssembly\b/u },
  { code: 'V7DK_API_FORBIDDEN', label: 'dynamic code evaluation', pattern: /\beval\s*\(|\b(?:new\s+)?Function\s*\(/u },
  { code: 'V7DK_IMPORT_FORBIDDEN', label: 'CommonJS loading', pattern: /\brequire\s*\(/u },
  { code: 'V7DK_IMPORT_FORBIDDEN', label: 'import metadata', pattern: /\bimport\s*\.\s*meta\b/u },
  { code: 'V7DK_CUSTOM_UI_FORBIDDEN', label: 'custom HTML/CSS', pattern: /\b(?:innerHTML|outerHTML|insertAdjacentHTML|CSSStyleSheet)\b/u },
]);

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (key === 'start' || key === 'end' || key === 'loc') continue;
    if (Array.isArray(child)) child.forEach((entry) => walk(entry, visit));
    else if (child && typeof child === 'object' && typeof child.type === 'string') walk(child, visit);
  }
}

function importDiagnostic(specifier, logicalPath) {
  if (specifier === SDK_SPECIFIER || specifier.startsWith('./') || specifier.startsWith('../')) return null;
  return diagnostic(
    'V7DK_IMPORT_FORBIDDEN',
    'static-analysis',
    'Only the versioned V7 SDK and workspace-relative static imports are allowed.',
    { logicalPath, related: [{ specifier }] },
  );
}

export function scanTypeScriptSource(text, logicalPath) {
  const diagnostics = [];
  const staticImport = /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gu;
  for (const match of text.matchAll(staticImport)) {
    const invalid = importDiagnostic(match[1], logicalPath);
    if (invalid) diagnostics.push(invalid);
  }
  if (/\bimport\s*\(/u.test(text)) {
    diagnostics.push(diagnostic(
      'V7DK_IMPORT_FORBIDDEN',
      'static-analysis',
      'Dynamic import is forbidden.',
      { logicalPath },
    ));
  }
  for (const { code, label, pattern } of API_PATTERNS) {
    if (pattern.test(text)) {
      diagnostics.push(diagnostic(code, 'static-analysis', `Candidate source requests forbidden ${label}.`, {
        logicalPath,
      }));
    }
  }
  return diagnostics;
}

export function analyzeEmittedModule(text, logicalPath, availableModules = new Set([logicalPath])) {
  let ast;
  try {
    ast = parse(text, { ecmaVersion: 2022, locations: true, sourceType: 'module' });
  } catch (error) {
    return [diagnostic('V7DK_ARTIFACT_INVALID', 'static-analysis', 'Emitted JavaScript is not valid ES2022 ESM.', {
      logicalPath,
      related: [{ parseMessage: error.message }],
    })];
  }
  const diagnostics = [];
  walk(ast, (node) => {
    if (node.type === 'ImportExpression') {
      diagnostics.push(diagnostic('V7DK_IMPORT_FORBIDDEN', 'static-analysis', 'Dynamic import is forbidden.', {
        logicalPath,
        sourceSpan: { column: node.loc.start.column + 1, line: node.loc.start.line },
      }));
    }
    if (node.type === 'AwaitExpression' || node.type === 'ForOfStatement' && node.await === true) {
      diagnostics.push(diagnostic('V7DK_API_FORBIDDEN', 'static-analysis', 'Async module execution is forbidden by the stateless fixture ABI.', {
        logicalPath,
        sourceSpan: { column: node.loc.start.column + 1, line: node.loc.start.line },
      }));
    }
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration'
      || (node.type === 'ExportNamedDeclaration' && node.source)) {
      const invalid = importDiagnostic(node.source.value, logicalPath);
      if (invalid) diagnostics.push(invalid);
      if (node.source.value.startsWith('./') || node.source.value.startsWith('../')) {
        const resolved = node.source.value.endsWith('.js')
          ? pathResolve(logicalPath, node.source.value) : null;
        if (resolved === null || !availableModules.has(resolved)) {
          diagnostics.push(diagnostic('V7DK_ARTIFACT_INVALID', 'static-analysis', 'Emitted relative imports must resolve to one declared .js artifact.', {
            logicalPath,
            related: [{ specifier: node.source.value }],
          }));
        }
      }
    }
    if ((node.type === 'CallExpression' && node.callee?.type === 'Identifier'
      && ['eval', 'Function', 'require'].includes(node.callee.name))
      || (node.type === 'NewExpression' && node.callee?.type === 'Identifier'
        && ['Function', 'Worker', 'SharedWorker', 'WebSocket'].includes(node.callee.name))) {
      diagnostics.push(diagnostic('V7DK_API_FORBIDDEN', 'static-analysis', 'Emitted code contains a forbidden API.', {
        logicalPath,
        sourceSpan: { column: node.loc.start.column + 1, line: node.loc.start.line },
      }));
    }
  });
  return diagnostics;
}

function pathResolve(parent, specifier) {
  const parts = parent.split('/');
  parts.pop();
  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}
