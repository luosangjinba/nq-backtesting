import {
  CONTRACT_PROFILE,
  OPERATIONS,
  OPERATION_VERSION,
  SDK_VERSION,
  TEMPLATE_ID,
} from './contract.js';
import { fail } from './diagnostic.js';

const REQUEST_FIELDS = new Set([
  'contractProfile', 'fixtureSelection', 'operation', 'operationVersion', 'options',
  'outputRoot', 'schemaVersion', 'sdkVersion', 'workspaceRoot',
]);
const ROOTS = Object.freeze({
  build: ['workspaceRoot', 'outputRoot'],
  discover: [],
  inspect: ['workspaceRoot'],
  pack: ['workspaceRoot', 'outputRoot'],
  preview: ['workspaceRoot', 'outputRoot'],
  scaffold: ['workspaceRoot'],
  test: ['workspaceRoot', 'outputRoot'],
  validate: ['workspaceRoot'],
});

function exactFields(value, allowed, label, phase = 'request') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('request', 'V7DK_REQUEST_INVALID', phase, `${label} must be an object.`);
  }
  const unknown = Object.keys(value).filter((key) => !allowed.has(key)).sort();
  if (unknown.length > 0) {
    fail('request', 'V7DK_REQUEST_UNKNOWN_FIELD', phase, `${label} contains an unknown field.`, {
      jsonPointer: `/${unknown[0]}`,
      related: unknown.map((field) => ({ field })),
    });
  }
}

function validateOptions(operation, options) {
  const allowed = new Set(operation === 'scaffold'
    ? ['templateId']
    : operation === 'inspect' ? ['path', 'target'] : []);
  exactFields(options, allowed, `${operation} options`);
  if (operation === 'scaffold' && options.templateId !== TEMPLATE_ID) {
    fail('request', 'V7DK_REQUEST_INVALID', 'request', `scaffold requires templateId ${TEMPLATE_ID}.`, {
      jsonPointer: '/options/templateId',
    });
  }
  if (operation === 'inspect') {
    if (!['workspace', 'bundle'].includes(options.target)) {
      fail('request', 'V7DK_REQUEST_INVALID', 'request', 'inspect target must be workspace or bundle.', {
        jsonPointer: '/options/target',
      });
    }
    if (options.target === 'bundle') {
      if (typeof options.path !== 'string' || options.path.length === 0) {
        fail('request', 'V7DK_REQUEST_INVALID', 'request', 'Bundle inspection requires a logical path.', {
          jsonPointer: '/options/path',
        });
      }
    } else if (Object.hasOwn(options, 'path')) {
      fail('request', 'V7DK_REQUEST_UNKNOWN_FIELD', 'request', 'Workspace inspection does not accept path.', {
        jsonPointer: '/options/path',
      });
    }
  }
}

/** Fail closed and resolve one public request without reading either root. */
export function readRequest(value) {
  exactFields(value, REQUEST_FIELDS, 'Developer Kit request');
  if (value.schemaVersion !== 1 || value.operationVersion !== OPERATION_VERSION) {
    fail('request', 'V7DK_REQUEST_INVALID', 'request', 'Unsupported request or operation version.');
  }
  if (!OPERATIONS.includes(value.operation)) {
    fail('request', 'V7DK_OPERATION_UNSUPPORTED', 'request', 'The requested operation is unsupported.', {
      jsonPointer: '/operation',
    });
  }
  if (!Object.hasOwn(value, 'options')) {
    fail('request', 'V7DK_REQUEST_INVALID', 'request', 'The request must include options.', {
      jsonPointer: '/options',
    });
  }
  if (value.contractProfile !== undefined && value.contractProfile !== CONTRACT_PROFILE) {
    fail('request', 'V7DK_PROFILE_UNSUPPORTED', 'request', 'The requested contract profile is unsupported.', {
      jsonPointer: '/contractProfile',
    });
  }
  if (value.sdkVersion !== undefined && value.sdkVersion !== SDK_VERSION) {
    fail('request', 'V7DK_SDK_UNSUPPORTED', 'request', 'The requested SDK version is unsupported.', {
      jsonPointer: '/sdkVersion',
    });
  }
  for (const root of ['workspaceRoot', 'outputRoot']) {
    if (value[root] !== undefined && (typeof value[root] !== 'string' || value[root].length === 0)) {
      fail('request', 'V7DK_REQUEST_INVALID', 'request', `${root} must be a non-empty adapter path.`, {
        jsonPointer: `/${root}`,
      });
    }
  }
  const requiredRoots = ROOTS[value.operation];
  for (const root of requiredRoots) {
    if (!Object.hasOwn(value, root)) {
      fail('request', 'V7DK_REQUEST_INVALID', 'request', `${value.operation} requires ${root}.`, {
        jsonPointer: `/${root}`,
      });
    }
  }
  for (const root of ['workspaceRoot', 'outputRoot']) {
    if (!requiredRoots.includes(root) && Object.hasOwn(value, root)) {
      fail('request', 'V7DK_REQUEST_INVALID', 'request', `${value.operation} does not accept ${root}.`, {
        jsonPointer: `/${root}`,
      });
    }
  }
  if (value.fixtureSelection !== undefined) {
    if (!['test', 'preview'].includes(value.operation)
      || !Array.isArray(value.fixtureSelection)
      || value.fixtureSelection.some((id) => typeof id !== 'string' || !/^[a-z][a-z0-9.-]{0,127}$/.test(id))
      || new Set(value.fixtureSelection).size !== value.fixtureSelection.length) {
      fail('request', 'V7DK_REQUEST_INVALID', 'request', 'fixtureSelection is invalid for this operation.', {
        jsonPointer: '/fixtureSelection',
      });
    }
  }
  validateOptions(value.operation, value.options);
  return Object.freeze({
    contractProfile: CONTRACT_PROFILE,
    fixtureSelection: Object.freeze([...(value.fixtureSelection ?? [])].sort()),
    operation: value.operation,
    operationVersion: OPERATION_VERSION,
    options: Object.freeze({ ...value.options }),
    outputRoot: value.outputRoot,
    schemaVersion: 1,
    sdkVersion: SDK_VERSION,
    workspaceRoot: value.workspaceRoot,
  });
}

/** Remove root capabilities before constructing canonical identity. */
export function requestIdentity(request) {
  return {
    contractProfile: request.contractProfile,
    fixtureSelection: request.fixtureSelection,
    operation: request.operation,
    operationVersion: request.operationVersion,
    options: request.options,
    schemaVersion: request.schemaVersion,
    sdkVersion: request.sdkVersion,
  };
}
