import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const WORK_ROOT = '/work';
const BUILD_ROOT = `${WORK_ROOT}/build`;
const SDK_SPECIFIER = '@replay-lab/v7-plugin-sdk';

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function safeModulePath(specifier, parent) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    throw new TypeError('Forbidden module specifier.');
  }
  const target = path.resolve(path.dirname(parent), specifier);
  if (!target.startsWith(`${BUILD_ROOT}/`) || !target.endsWith('.js')) {
    throw new TypeError('Module path escapes the isolated build.');
  }
  return target;
}

async function execute(request) {
  const sandbox = Object.create(null);
  Object.assign(sandbox, {
    Date: undefined,
    EventSource: undefined,
    Function: undefined,
    Intl: undefined,
    SharedWorker: undefined,
    WebAssembly: undefined,
    WebSocket: undefined,
    Worker: undefined,
    XMLHttpRequest: undefined,
    console: undefined,
    document: undefined,
    fetch: undefined,
    global: undefined,
    navigator: undefined,
    performance: undefined,
    process: undefined,
    require: undefined,
    window: undefined,
  });
  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false },
    name: 'v7dk-synthetic-host-v1',
  });
  new vm.Script(`
    Object.defineProperty(Math, 'random', {
      configurable: false,
      enumerable: false,
      value: undefined,
      writable: false,
    });
    Object.freeze(Math);
  `, { filename: 'v7dk-intrinsics.js' }).runInContext(context);
  const defineSemanticConstruction = new vm.Script(`
    (definition) => {
      if (!definition || definition.schemaVersion !== 1
        || definition.kind !== 'semantic-construction'
        || definition.executionModel !== 'stateless-evidence-construction'
        || typeof definition.run !== 'function') {
        throw new TypeError('Invalid semantic construction definition.');
      }
      return Object.freeze(definition);
    }
  `, { filename: 'v7dk-sdk.js' }).runInContext(context);
  const modules = new Map();
  const sdk = new vm.SyntheticModule(
    ['defineSemanticConstruction'],
    function initialize() { this.setExport('defineSemanticConstruction', defineSemanticConstruction); },
    { context, identifier: SDK_SPECIFIER },
  );
  modules.set(SDK_SPECIFIER, sdk);
  async function load(file) {
    if (modules.has(file)) return modules.get(file);
    const source = fs.readFileSync(file, 'utf8');
    const module = new vm.SourceTextModule(source, {
      context,
      identifier: file,
      initializeImportMeta(meta) { Object.preventExtensions(meta); },
    });
    modules.set(file, module);
    await module.link(async (specifier, referencing) => {
      if (specifier === SDK_SPECIFIER) return sdk;
      return load(safeModulePath(specifier, referencing.identifier));
    });
    return module;
  }
  const entrypoint = path.resolve(BUILD_ROOT, request.entrypoint);
  if (!entrypoint.startsWith(`${BUILD_ROOT}/`) || !entrypoint.endsWith('.js')) {
    throw new TypeError('Invalid isolated entrypoint.');
  }
  const module = await load(entrypoint);
  await module.evaluate({ timeout: request.timeoutMs });
  const definition = module.namespace.default;
  if (!definition || typeof definition.run !== 'function') throw new TypeError('Entrypoint must default-export one SDK definition.');
  sandbox.__v7dkDefinition = definition;
  sandbox.__v7dkInputJson = JSON.stringify(request.input);
  sandbox.__v7dkInput = deepFreeze(new vm.Script(
    'JSON.parse(__v7dkInputJson)',
    { filename: 'v7dk-input.js' },
  ).runInContext(context));
  sandbox.__v7dkInputJson = undefined;
  const invoke = new vm.Script(`
    const __candidateResult = __v7dkDefinition.run(__v7dkInput);
    if (__candidateResult && typeof __candidateResult.then === 'function') {
      throw new TypeError('Async candidate results are forbidden.');
    }
    JSON.stringify(__candidateResult);
  `, { filename: 'v7dk-invoke.js' });
  const serialized = invoke.runInContext(context, { timeout: request.timeoutMs });
  if (typeof serialized !== 'string') throw new TypeError('Candidate output must be portable JSON.');
  return JSON.parse(serialized);
}

try {
  const request = JSON.parse(fs.readFileSync('/work/request.json', 'utf8'));
  const output = await execute(request);
  process.stdout.write(JSON.stringify({ ok: true, output }));
} catch (error) {
  process.stdout.write(JSON.stringify({
    code: error?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT'
      ? 'V7DK_RESOURCE_LIMIT' : error?.code ?? 'V7DK_ARTIFACT_INVALID',
    message: error?.name ?? 'CandidateError',
    ok: false,
  }));
  process.exitCode = 1;
}
