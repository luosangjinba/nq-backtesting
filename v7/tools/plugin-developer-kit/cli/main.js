#!/usr/bin/env node
import fs from 'node:fs';
import { canonicalJson } from '../domain/canonical-json.js';
import { runDeveloperKit } from '../engine.js';

function requestPath(argv) {
  if (argv.length !== 2 || argv[0] !== '--request' || typeof argv[1] !== 'string') return null;
  return argv[1];
}

const source = requestPath(process.argv.slice(2));
let request;
if (source === null) {
  request = { operation: 'discover', operationVersion: 0, options: {}, schemaVersion: 0 };
} else {
  try {
    request = JSON.parse(source === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(source, 'utf8'));
  } catch {
    request = { operation: 'discover', operationVersion: 0, options: {}, schemaVersion: 0 };
  }
}
const result = runDeveloperKit(request);
process.stdout.write(`${canonicalJson(result)}\n`);
process.exitCode = result.exitCode;
