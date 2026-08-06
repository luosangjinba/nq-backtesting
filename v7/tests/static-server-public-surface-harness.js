import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createStaticServer,
  isPublicAssetPath,
} from '../scripts/static-server.mjs';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');

assert.equal(isPublicAssetPath('/v7/app/index.html'), true);
assert.equal(isPublicAssetPath('/v7/src/module-host/public.js'), true);
assert.equal(isPublicAssetPath('/v7/docs/v7-architecture-manifest.json'), true);
assert.equal(
  isPublicAssetPath('/v7/node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs'),
  true,
);
assert.equal(isPublicAssetPath('/AGENTS.md'), false);
assert.equal(isPublicAssetPath('/v7/docs/V7_ARCHITECTURE.md'), false);
assert.equal(isPublicAssetPath('/v7/server/state_store.py'), false);
assert.equal(isPublicAssetPath('/v7/tests/static-server-public-surface-harness.js'), false);
assert.equal(isPublicAssetPath('/.git'), false);
assert.equal(isPublicAssetPath('/v7/app/../docs/V7_ARCHITECTURE.md'), false);

const server = createStaticServer(repositoryRoot);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
try {
  for (const publicPath of [
    '/',
    '/v7/app/',
    '/v7/src/module-host/public.js',
    '/v7/docs/v7-architecture-manifest.json',
    '/v7/node_modules/vanilla-colorful/hex-alpha-color-picker.js',
  ]) {
    const response = await fetch(`${base}${publicPath}`);
    assert.equal(response.status, 200, `${publicPath} must remain public`);
  }
  for (const privatePath of [
    '/AGENTS.md',
    '/v7/docs/V7_ARCHITECTURE.md',
    '/v7/server/state_store.py',
    '/v7/tests/static-server-public-surface-harness.js',
    '/v4/v4_api.py',
    '/.git',
    '/v7/app/%2e%2e%2fdocs%2fV7_ARCHITECTURE.md',
    '/v7/src/%2e%2e%2fserver%2fstate_store.py',
  ]) {
    const response = await fetch(`${base}${privatePath}`);
    assert.equal(response.status, 404, `${privatePath} must not be served`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-static-surface-root-'));
const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-static-surface-outside-'));
try {
  fs.mkdirSync(path.join(fixtureRoot, 'v7/app'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'v7/private'), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, 'v7/app/index.html'), '<!doctype html><title>public</title>');
  fs.writeFileSync(path.join(fixtureRoot, 'v7/private/internal.txt'), 'private inside repository');
  fs.writeFileSync(path.join(outsideRoot, 'private.txt'), 'must remain private');
  fs.symlinkSync('../private', path.join(fixtureRoot, 'v7/app/internal-escape'), 'dir');
  fs.symlinkSync(outsideRoot, path.join(fixtureRoot, 'v7/app/escaped'), 'dir');

  const symlinkServer = createStaticServer(fixtureRoot);
  await new Promise((resolve, reject) => {
    symlinkServer.once('error', reject);
    symlinkServer.listen(0, '127.0.0.1', resolve);
  });
  const symlinkAddress = symlinkServer.address();
  const symlinkBase = `http://127.0.0.1:${symlinkAddress.port}`;
  try {
    const publicResponse = await fetch(`${symlinkBase}/v7/app/`);
    assert.equal(publicResponse.status, 200, 'ordinary files inside the reviewed real root remain public');
    const internalEscapeResponse = await fetch(`${symlinkBase}/v7/app/internal-escape/internal.txt`);
    assert.equal(internalEscapeResponse.status, 404,
      'symlinks must not escape into an unreviewed repository directory');
    const escapeResponse = await fetch(`${symlinkBase}/v7/app/escaped/private.txt`);
    assert.equal(escapeResponse.status, 404, 'symlinks must not escape the reviewed real root');
  } finally {
    await new Promise((resolve) => symlinkServer.close(resolve));
  }
} finally {
  fs.rmSync(fixtureRoot, { force: true, recursive: true });
  fs.rmSync(outsideRoot, { force: true, recursive: true });
}

console.log('v7 static server public surface harness passed (encoded traversal + symlink escape denied)');
