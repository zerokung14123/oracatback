import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import googleOAuthHandler from './handlers/google-oauth.mjs';
import publicConfigHandler from './handlers/public-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https://www.gstatic.com https://lh3.googleusercontent.com",
    "script-src 'self' https://www.gstatic.com https://apis.google.com https://accounts.google.com",
    "connect-src 'self' https://*.googleapis.com https://www.googleapis.com https://oauth2.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://firebaseappcheck.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
    'frame-src https://accounts.google.com',
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ].join('; '),
};

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const PUBLIC_DIRS = new Set(['.well-known', 'assets', 'css', 'js']);
const PUBLIC_ROOT_FILES = new Set([
  'index.html',
  'manifest.webmanifest',
  'offline.html',
  'privacy.html',
  'robots.txt',
  'service-worker.js',
  'terms.html',
]);

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    console.error('Render server failed:', error);
    sendText(response, 500, 'Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`Oracat Manager listening on port ${PORT}`);
});

async function route(request, response) {
  const url = requestUrl(request);

  if (url.pathname === '/api/public-config') {
    return sendFetchResponse(response, await publicConfigHandler(await toFetchRequest(request, url)));
  }

  if (url.pathname === '/api/google-oauth') {
    return sendFetchResponse(response, await googleOAuthHandler(await toFetchRequest(request, url)));
  }

  return serveStatic(response, url.pathname);
}

async function serveStatic(response, pathname) {
  const relativePath = safeStaticPath(pathname);
  if (relativePath === null) return serveSpaFallback(response);
  if (!relativePath) return sendText(response, 403, 'Forbidden');

  const filePath = path.join(ROOT_DIR, relativePath);
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(ROOT_DIR + path.sep)) {
    return sendText(response, 403, 'Forbidden');
  }

  let fileStat;
  try {
    fileStat = await stat(resolvedPath);
  } catch {
    if (path.extname(relativePath)) return sendText(response, 404, 'Not found');
    return serveSpaFallback(response);
  }

  if (!fileStat.isFile()) return sendText(response, 404, 'Not found');

  const body = await readFile(resolvedPath);
  const headers = staticHeaders(relativePath);
  response.writeHead(200, headers);
  response.end(body);
}

async function serveSpaFallback(response) {
  const body = await readFile(path.join(ROOT_DIR, 'index.html'));
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': CONTENT_TYPES['.html'],
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function safeStaticPath(pathname) {
  const cleanPath = decodePath(pathname);
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length === 0) return 'index.html';
  if (segments.some(isUnsafeSegment)) return '';

  const [first] = segments;
  const relativePath = segments.join('/');

  if (segments.length === 1 && PUBLIC_ROOT_FILES.has(first)) return relativePath;
  if (PUBLIC_DIRS.has(first)) return relativePath;
  if (!path.extname(segments.at(-1) || '')) return null;

  return '';
}

function isUnsafeSegment(segment) {
  const lower = segment.toLowerCase();
  return (
    segment === '..' ||
    lower.startsWith('.env') ||
    lower === '.git' ||
    lower === 'node_modules' ||
    lower === 'server' ||
    lower === 'netlify' ||
    lower === 'service-account.json' ||
    lower.startsWith('service-account') ||
    lower.startsWith('firebase-service-account')
  );
}

function staticHeaders(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  const fileName = path.basename(relativePath);
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
  };

  if (fileName === 'service-worker.js') {
    headers['Cache-Control'] = 'no-cache';
    headers['Service-Worker-Allowed'] = '/';
  } else if (fileName === 'manifest.webmanifest' || relativePath === 'offline.html') {
    headers['Cache-Control'] = 'public, max-age=3600';
  } else if (relativePath.startsWith('assets/')) {
    headers['Cache-Control'] = 'public, max-age=3600';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  return headers;
}

async function toFetchRequest(request, url) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach(item => headers.append(key, item));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const body = ['GET', 'HEAD'].includes(request.method || '') ? undefined : await requestBody(request);
  return new Request(url, {
    method: request.method,
    headers,
    body,
  });
}

function requestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function sendFetchResponse(nodeResponse, fetchResponse) {
  const headers = {};
  fetchResponse.headers.forEach((value, key) => {
    headers[key] = value;
  });

  nodeResponse.writeHead(fetchResponse.status, headers);
  nodeResponse.end(Buffer.from(await fetchResponse.arrayBuffer()));
}

function requestUrl(request) {
  const proto = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers.host || `localhost:${PORT}`;
  return new URL(request.url || '/', `${proto}://${host}`);
}

function decodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return '';
  }
}

function sendText(response, status, message) {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(message);
}
