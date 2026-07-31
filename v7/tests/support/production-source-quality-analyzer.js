import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

function sorted(values) {
  return [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function repositoryPath(v7Root, absolutePath) {
  return path.relative(v7Root, absolutePath).split(path.sep).join('/');
}

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(candidate, predicate) : (predicate(candidate) ? [candidate] : []);
  });
}

function walkAst(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) {
      value.forEach((child) => walkAst(child, visit, node));
    } else if (value && typeof value === 'object') {
      walkAst(value, visit, node);
    }
  }
}

function declaredNames(declaration) {
  if (!declaration) return [];
  if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') {
    return declaration.id ? [declaration.id.name] : [];
  }
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.flatMap(({ id }) => (id.type === 'Identifier' ? [id.name] : []));
  }
  return [];
}

function parseProductionFile(absolutePath) {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const comments = [];
  const ast = parse(source, {
    allowHashBang: true,
    ecmaVersion: 'latest',
    locations: true,
    onComment: comments,
    sourceType: 'module',
  });
  return Object.freeze({ absolutePath, ast, comments, source });
}

function maskedSource(record) {
  const characters = [...record.source];
  for (const comment of record.comments) {
    for (let index = comment.start; index < comment.end; index += 1) {
      if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
    }
  }
  return characters.join('');
}

function effectiveLines(source) {
  return source.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function functionName(node, parent, ordinal) {
  if (node.id?.name) return node.id.name;
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name;
  if ((parent?.type === 'Property' || parent?.type === 'MethodDefinition') && parent.key) {
    return parent.key.name ?? parent.key.value ?? `<anonymous-${ordinal}>`;
  }
  return `<anonymous-${ordinal}>`;
}

function functionsIn(record, masked, exceptions) {
  const nodes = [];
  walkAst(record.ast, (node, parent) => {
    if (!['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) return;
    nodes.push({ node, parent });
  });
  return sorted(nodes.map(({ node, parent }, index) => {
    const characters = [...masked.slice(node.start, node.end)];
    for (const nested of nodes.map((entry) => entry.node).filter((candidate) => (
      candidate !== node && candidate.start > node.start && candidate.end < node.end
    ))) {
      for (let offset = nested.start - node.start; offset < nested.end - node.start; offset += 1) {
        if (characters[offset] !== '\n' && characters[offset] !== '\r') characters[offset] = ' ';
      }
    }
    const name = functionName(node, parent, index + 1);
    return Object.freeze({
      effectiveLines: effectiveLines(characters.join('')),
      name,
      reviewedDecompositionException: exceptions.has(name),
    });
  }));
}

function closestDocumentationComment(record, node) {
  const candidates = record.comments.filter((comment) => (
    comment.type === 'Block'
      && comment.value.trimStart().startsWith('*')
      && comment.end <= node.start
      && record.source.slice(comment.end, node.start).trim() === ''
  ));
  return candidates.at(-1)?.value ?? '';
}

function cleanDocumentationLines(comment) {
  return comment.split(/\r?\n/).map((line) => (
    line.replace(/^\s*\*?\s?/, '').trimEnd()
  ));
}

const DOCUMENTATION_LABELS = Object.freeze([
  ['owner', /^Owner\s*:\s*(.*)$/i],
  ['purpose', /^Purpose\s*:\s*(.*)$/i],
  ['inputs', /^Inputs?\s*:\s*(.*)$/i],
  ['outputs', /^Outputs?\s*:\s*(.*)$/i],
  ['sideEffects', /^Side effects?\s*:\s*(.*)$/i],
  ['lifecycle', /^Lifecycle\s*:\s*(.*)$/i],
  ['errors', /^Errors?\s*:\s*(.*)$/i],
  ['concurrencyCancellation', /^(?:Concurrency(?:\s*\/\s*|\s+and\s+)?cancellation|Cancellation)\s*:\s*(.*)$/i],
]);

function documentationFields(comment) {
  const lines = cleanDocumentationLines(comment);
  const documentation = Object.fromEntries(DOCUMENTATION_LABELS.map(([field]) => [field, '']));
  let activeField = null;
  for (const line of lines) {
    const matched = DOCUMENTATION_LABELS.find(([, pattern]) => pattern.test(line));
    if (matched) {
      activeField = matched[0];
      documentation[activeField] = line.match(matched[1])?.[1]?.trim() ?? '';
      continue;
    }
    if (/^[A-Z][A-Za-z /-]*\s*:/.test(line) || /^Protected invariant/i.test(line)) {
      activeField = null;
      continue;
    }
    if (activeField && line.trim()) {
      documentation[activeField] = `${documentation[activeField]} ${line.trim()}`.trim();
    }
  }
  return Object.freeze(documentation);
}

function mergeDocumentation(fallback, specific) {
  return Object.freeze(Object.fromEntries(DOCUMENTATION_LABELS.map(([field]) => [
    field,
    specific[field] || fallback[field] || '',
  ])));
}

function publicEntryDocumentation(record) {
  const comment = record.comments.find((candidate) => (
    candidate.type === 'Block'
      && candidate.value.trimStart().startsWith('*')
      && record.source.slice(0, candidate.start).trim() === ''
  ));
  return documentationFields(comment?.value ?? '');
}

function criticalInvariants(record) {
  const evidence = [];
  for (const comment of record.comments) {
    const text = cleanDocumentationLines(comment.value).join(' ');
    const pattern = /Protected invariant(?:s)?\s*[—-]\s*([a-z0-9-]+)\s*:\s*([^]*?)(?=Protected invariant|$)/gi;
    for (const match of text.matchAll(pattern)) {
      evidence.push(Object.freeze({ id: match[1], why: match[2].trim() }));
    }
  }
  return sorted(evidence);
}

function debtComments(record) {
  const markers = /\b(?:TODO|FIXME|HACK)\b|@(?:compatibility|debt)\b/i;
  return record.comments.filter((comment) => markers.test(comment.value)).map((comment) => {
    const text = cleanDocumentationLines(comment.value).join(' ').trim();
    return Object.freeze({
      decisionId: text.match(/Decision\s*:\s*([A-Za-z0-9._-]+)/i)?.[1] ?? '',
      owner: text.match(/Owner\s*:\s*([^|;]+)/i)?.[1]?.trim() ?? '',
      removalCondition: text.match(/Remove when\s*:\s*([^|;]+)/i)?.[1]?.trim() ?? '',
      text,
    });
  });
}

function declarationIndex(record) {
  const declarations = new Map();
  for (const statement of record.ast.body) {
    if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
      declaredNames(statement.declaration).forEach((name) => declarations.set(name, statement));
      continue;
    }
    declaredNames(statement).forEach((name) => declarations.set(name, statement));
  }
  return declarations;
}

function resolveSourceFile(sourceFile, specifier) {
  const unresolved = path.resolve(path.dirname(sourceFile), specifier);
  if (path.extname(unresolved)) return unresolved;
  if (fs.existsSync(`${unresolved}.js`)) return `${unresolved}.js`;
  return unresolved;
}

function publicExports(publicRecord, recordsByPath, v7Root, moduleId) {
  const exports = [];
  const facadeDocumentation = publicEntryDocumentation(publicRecord);
  for (const statement of publicRecord.ast.body) {
    if (statement.type === 'ExportAllDeclaration') {
      throw new TypeError(`${repositoryPath(v7Root, publicRecord.absolutePath)} uses unsupported export *.`);
    }
    if (statement.type !== 'ExportNamedDeclaration') continue;
    if (statement.declaration) {
      for (const name of declaredNames(statement.declaration)) {
        exports.push({
          declarationFile: publicRecord.absolutePath,
          declarationNode: statement,
          facadeDocumentation,
          moduleId,
          name,
        });
      }
      continue;
    }
    const declarationFile = statement.source
      ? resolveSourceFile(publicRecord.absolutePath, statement.source.value)
      : publicRecord.absolutePath;
    const declarationRecord = recordsByPath.get(declarationFile);
    if (!declarationRecord) {
      throw new TypeError(`Public export target is outside production: ${repositoryPath(v7Root, declarationFile)}.`);
    }
    const declarations = declarationIndex(declarationRecord);
    for (const specifier of statement.specifiers) {
      const localName = specifier.local.name ?? specifier.local.value;
      const declarationNode = declarations.get(localName);
      if (!declarationNode) {
        throw new TypeError(
          `Cannot resolve ${localName} in ${repositoryPath(v7Root, declarationFile)} for ${moduleId}.`,
        );
      }
      exports.push({
        declarationFile,
        declarationNode,
        facadeDocumentation,
        moduleId,
        name: specifier.exported.name ?? specifier.exported.value,
      });
    }
  }
  return exports;
}

function sourceHash(source) {
  return crypto.createHash('sha256').update(source).digest('hex');
}

function moduleRecords({ manifest, v7Root }) {
  return manifest.activeProductionModules.map((descriptorPath) => {
    const absoluteDescriptorPath = path.join(v7Root, descriptorPath);
    const descriptor = JSON.parse(fs.readFileSync(absoluteDescriptorPath, 'utf8'));
    return Object.freeze({
      descriptor,
      publicEntry: path.resolve(v7Root, descriptor.publicEntry),
      sourceDirectory: path.dirname(path.resolve(v7Root, descriptor.publicEntry)),
    });
  });
}

function ownerForFile(records, absolutePath) {
  const matches = records.filter(({ sourceDirectory }) => (
    absolutePath === sourceDirectory || absolutePath.startsWith(`${sourceDirectory}${path.sep}`)
  ));
  if (matches.length > 1) throw new TypeError(`Production file has multiple module owners: ${absolutePath}.`);
  return matches[0] ?? null;
}

function policyIndex(policy) {
  const index = new Map();
  for (const [kind, moduleIds] of Object.entries(policy.moduleKinds)) {
    for (const moduleId of moduleIds) {
      if (index.has(moduleId)) throw new TypeError(`Source kind policy duplicates ${moduleId}.`);
      index.set(moduleId, kind);
    }
  }
  return index;
}

/**
 * Owner: Test Governance.
 * Purpose: scan every real V7 production JavaScript source with an ESTree AST.
 * Inputs: committed architecture manifest, source-quality policy, and V7 root.
 * Outputs: deterministic file/function/public-contract/invariant/debt snapshot.
 * Side effects: reads production sources and descriptors; never writes them.
 * Lifecycle: one synchronous scan per Harness invocation.
 * Errors: malformed JavaScript, incomplete ownership, unresolved public exports,
 * or incomplete kind policy fail the scan before validation.
 * Concurrency/cancellation: synchronous and non-cancellable by design so a gate
 * cannot publish a partial production inventory.
 */
export function analyzeProductionSourceQuality({ manifest, policy, v7Root }) {
  const absoluteV7Root = path.resolve(v7Root);
  const records = moduleRecords({ manifest, v7Root: absoluteV7Root });
  const kindsByModuleId = policyIndex(policy);
  const activeIds = new Set(records.map(({ descriptor }) => descriptor.id));
  if (kindsByModuleId.size !== activeIds.size
    || [...activeIds].some((moduleId) => !kindsByModuleId.has(moduleId))) {
    throw new TypeError('Source kind policy must classify every active production module exactly once.');
  }

  const absoluteFiles = policy.productionRoots.flatMap((root) => (
    walk(path.join(absoluteV7Root, root), (file) => /\.(?:js|mjs)$/.test(file))
  )).sort();
  const parsedRecords = absoluteFiles.map(parseProductionFile);
  const recordsByPath = new Map(parsedRecords.map((record) => [record.absolutePath, record]));
  const filesByPath = new Map();

  for (const record of parsedRecords) {
    const module = ownerForFile(records, record.absolutePath);
    const inApplicationRoot = record.absolutePath.startsWith(`${path.join(absoluteV7Root, 'app')}${path.sep}`);
    if (!module && !inApplicationRoot) {
      throw new TypeError(`Production source has no active module owner: ${repositoryPath(absoluteV7Root, record.absolutePath)}.`);
    }
    const moduleId = module?.descriptor.id ?? 'application';
    const owner = module?.descriptor.owner ?? policy.application.owner;
    const kind = module ? kindsByModuleId.get(moduleId) : policy.application.kind;
    const relativePath = repositoryPath(absoluteV7Root, record.absolutePath);
    const masked = maskedSource(record);
    const functionExceptions = new Set((policy.functionExceptions ?? [])
      .filter((exception) => exception.path === relativePath).map(({ name }) => name));
    const sizeException = (policy.sizeExceptions ?? []).find((exception) => exception.path === relativePath);
    filesByPath.set(record.absolutePath, {
      adaptsBoundary: ['adapter', 'composition', 'persistence', 'ui'].includes(kind),
      criticalInvariants: criticalInvariants(record),
      debtComments: debtComments(record),
      effectiveLines: effectiveLines(masked),
      forwardingOnly: record.ast.body.every((node) => (
        node.type === 'ImportDeclaration'
          || node.type === 'ExportAllDeclaration'
          || (node.type === 'ExportNamedDeclaration' && node.declaration === null)
      )),
      functions: functionsIn(record, masked, functionExceptions),
      kind,
      moduleId,
      owner,
      ownsContract: module?.publicEntry === record.absolutePath,
      path: relativePath,
      publicExports: [],
      responsibilities: [owner],
      sizeException: sizeException ?? null,
      sourceHash: sourceHash(record.source),
    });
  }

  for (const module of records) {
    const publicRecord = recordsByPath.get(module.publicEntry);
    if (!publicRecord) throw new TypeError(`Missing public entry source for ${module.descriptor.id}.`);
    for (const exported of publicExports(publicRecord, recordsByPath, absoluteV7Root, module.descriptor.id)) {
      const declarationRecord = recordsByPath.get(exported.declarationFile);
      const declarationDocumentation = documentationFields(closestDocumentationComment(
        declarationRecord,
        exported.declarationNode,
      ));
      filesByPath.get(exported.declarationFile).publicExports.push(Object.freeze({
        documentation: mergeDocumentation(exported.facadeDocumentation, declarationDocumentation),
        moduleId: exported.moduleId,
        name: exported.name,
      }));
    }
  }

  const files = sorted([...filesByPath.values()].map((file) => Object.freeze({
    ...file,
    publicExports: sorted(file.publicExports),
  })));
  return Object.freeze({
    files,
    schemaVersion: 1,
    summary: Object.freeze({
      effectiveLines: files.reduce((total, file) => total + file.effectiveLines, 0),
      files: files.length,
      functions: files.reduce((total, file) => total + file.functions.length, 0),
      publicExports: files.reduce((total, file) => total + file.publicExports.length, 0),
    }),
  });
}

/** Return one stable violation when committed source-quality evidence drifts. */
export function compareProductionSourceQualitySnapshots(expected, actual) {
  const comparable = (snapshot) => ({
    files: snapshot.files,
    schemaVersion: snapshot.schemaVersion,
    summary: snapshot.summary,
  });
  if (JSON.stringify(comparable(expected)) === JSON.stringify(comparable(actual))) {
    return Object.freeze([]);
  }
  return Object.freeze([Object.freeze({
    code: 'production-source-quality-snapshot-drift',
    detail: 'file, hash, function, contract, invariant, debt, owner, or metric evidence changed',
    subject: 'production-source-quality-baseline',
  })]);
}
