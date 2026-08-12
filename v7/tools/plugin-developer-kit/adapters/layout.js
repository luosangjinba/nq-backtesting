import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ADAPTER_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const TOOL_ROOT = path.resolve(ADAPTER_ROOT, '..');
export const V7_ROOT = path.resolve(ADAPTER_ROOT, '../../..');
export const SDK_ROOT = path.join(V7_ROOT, 'sdk/plugin');
export const EXAMPLES_ROOT = path.join(SDK_ROOT, 'examples');
export const TYPESCRIPT_ROOT = path.join(V7_ROOT, 'node_modules/typescript');
export const TYPESCRIPT_CLI = path.join(TYPESCRIPT_ROOT, 'bin/tsc');

export const LOGICAL = Object.freeze({
  outputMarker: '.v7dk-output.json',
  workspace: 'v7-plugin-kit.json',
});
