import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const CONTENT_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
});

const PUBLIC_DIRECTORY_ROUTES = Object.freeze([
  Object.freeze({
    filesystemPath: 'v7/app',
    urlPrefix: '/v7/app/',
  }),
  Object.freeze({
    filesystemPath: 'v7/src',
    urlPrefix: '/v7/src/',
  }),
  Object.freeze({
    filesystemPath: 'v7/node_modules/lightweight-charts',
    urlPrefix: '/v7/node_modules/lightweight-charts/',
  }),
  Object.freeze({
    filesystemPath: 'v7/node_modules/vanilla-colorful',
    urlPrefix: '/v7/node_modules/vanilla-colorful/',
  }),
]);
const PUBLIC_EXACT_FILES = Object.freeze([
  Object.freeze({
    filesystemPath: 'v7/docs/v7-architecture-manifest.json',
    urlPath: '/v7/docs/v7-architecture-manifest.json',
  }),
]);

function isContainedPath(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === ''
    || (!path.isAbsolute(relative)
      && relative !== '..'
      && !relative.startsWith(`..${path.sep}`));
}

function isSafeDecodedPath(pathname) {
  if (typeof pathname !== 'string'
    || !pathname.startsWith('/')
    || pathname.includes('\0')
    || pathname.includes('\\')
    || pathname.includes('//')) {
    return false;
  }
  return pathname.split('/').every((segment) => segment !== '.' && segment !== '..');
}

function createDirectoryRoute(repositoryRoot, repositoryRealRoot, { filesystemPath, urlPrefix }) {
  return Object.freeze({
    expectedRealRoot: path.resolve(repositoryRealRoot, filesystemPath),
    filesystemRoot: path.resolve(repositoryRoot, filesystemPath),
    urlPrefix,
  });
}

function resolveReviewedFile(repositoryRealRoot, route, pathname) {
  const relativeUrlPath = pathname.slice(route.urlPrefix.length);
  if (!relativeUrlPath || relativeUrlPath.startsWith('/')) return null;
  const lexicalFile = path.resolve(route.filesystemRoot, relativeUrlPath);
  if (!isContainedPath(route.filesystemRoot, lexicalFile)) return null;

  try {
    const routeRealRoot = fs.realpathSync(route.filesystemRoot);
    const realFile = fs.realpathSync(lexicalFile);
    if (routeRealRoot !== route.expectedRealRoot
      || !isContainedPath(repositoryRealRoot, routeRealRoot)
      || !isContainedPath(routeRealRoot, realFile)
      || !fs.statSync(realFile).isFile()) {
      return null;
    }
    return realFile;
  } catch {
    return null;
  }
}

function resolveExactFile(repositoryRoot, repositoryRealRoot, route) {
  const lexicalFile = path.resolve(repositoryRoot, route.filesystemPath);
  try {
    const parentRealRoot = fs.realpathSync(path.dirname(lexicalFile));
    const realFile = fs.realpathSync(lexicalFile);
    const expectedParentRealRoot = path.dirname(path.resolve(repositoryRealRoot, route.filesystemPath));
    if (parentRealRoot !== expectedParentRealRoot
      || !isContainedPath(repositoryRealRoot, parentRealRoot)
      || realFile !== path.join(parentRealRoot, path.basename(lexicalFile))
      || !fs.statSync(realFile).isFile()) {
      return null;
    }
    return realFile;
  } catch {
    return null;
  }
}

/** Return whether one decoded URL path belongs to the reviewed browser asset surface. */
export function isPublicAssetPath(pathname) {
  return isSafeDecodedPath(pathname)
    && (PUBLIC_EXACT_FILES.some((route) => route.urlPath === pathname)
      || PUBLIC_DIRECTORY_ROUTES.some((route) => pathname.startsWith(route.urlPrefix)));
}

/** Create the no-cache local static server used by V7 manual and browser gates. */
export function createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes = [],
  databaseImportProxy = null,
  stateProxy = null,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const realRoot = fs.realpathSync(root);
  const directoryRoutes = Object.freeze(PUBLIC_DIRECTORY_ROUTES.map((route) => (
    createDirectoryRoute(root, realRoot, route)
  )));
  const additionalRoutes = Object.freeze(additionalPublicPathPrefixes.map((prefix) => {
    if (typeof prefix !== 'string'
      || !prefix.startsWith('/')
      || !prefix.endsWith('/')
      || !isSafeDecodedPath(prefix)) {
      throw new TypeError('Additional public path prefixes must be absolute directory URL prefixes.');
    }
    return createDirectoryRoute(root, realRoot, {
      filesystemPath: prefix.slice(1, -1),
      urlPrefix: prefix,
    });
  }));
  return http.createServer((request, response) => {
    if (databaseImportProxy?.handles(request)) {
      databaseImportProxy.forward(request, response);
      return;
    }
    if (stateProxy?.handles(request)) {
      stateProxy.forward(request, response);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch {
      response.writeHead(400);
      response.end('Bad request');
      return;
    }
    if (pathname === '/') pathname = '/v7/app/index.html';
    else if (pathname.endsWith('/')) pathname = `${pathname}index.html`;
    if (!isSafeDecodedPath(pathname)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const exactRoute = PUBLIC_EXACT_FILES.find((route) => route.urlPath === pathname);
    const directoryRoute = directoryRoutes.find((route) => pathname.startsWith(route.urlPrefix))
      ?? additionalRoutes.find((route) => pathname.startsWith(route.urlPrefix));
    const file = exactRoute
      ? resolveExactFile(root, realRoot, exactRoute)
      : directoryRoute
        ? resolveReviewedFile(realRoot, directoryRoute, pathname)
        : null;
    if (!file) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
  });
}
