import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const COOKIE_NAME = 'pm_v3_google_refresh';
const ONE_DAY_SECONDS = 24 * 60 * 60;
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default async function handler(request) {
  const origin = request.headers.get('origin') || '';
  const headers = corsHeaders(origin, request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, headers);
  }

  try {
    if (!isOriginAllowed(origin, request.url)) {
      return json({ error: 'Forbidden origin' }, 403, headers);
    }

    const body = await request.json();
    const action = body.action || 'exchange';

    if (action === 'logout') {
      return json({ ok: true }, 200, {
        ...headers,
        'Set-Cookie': clearCookie(),
      });
    }

    if (action === 'refresh') {
      return refreshAccessToken(request, headers);
    }

    if (action === 'exchange') {
      return exchangeCode(request, body, headers);
    }

    return json({ error: 'Unknown action' }, 400, headers);
  } catch (error) {
    console.error('Google OAuth handler failed:', error);
    return json({ error: 'Internal server error' }, 500, headers);
  }
}

async function exchangeCode(request, body, headers) {
  assertEnv();

  if (request.headers.get('x-requested-with') !== 'XmlHttpRequest') {
    return json({ error: 'Invalid OAuth request' }, 403, headers);
  }

  const code = String(body.code || '').trim();
  if (!code) return json({ error: 'Missing authorization code' }, 400, headers);

  const requestOriginValue = String(body.origin || body.redirectUri || request.headers.get('origin') || '').trim();
  const redirectOrigin = normalizedOrigin(requestOriginValue);
  if (!redirectOrigin || !allowedOrigins(request.url).has(redirectOrigin)) {
    return json({ error: 'Invalid redirect URI' }, 403, headers);
  }

  let tokens;
  try {
    tokens = await tokenRequest({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: oauthRedirectUri(),
      grant_type: 'authorization_code',
    });
  } catch (error) {
    console.warn('Google OAuth code exchange failed:', error?.message || error);
    return json({ error: `Google token exchange failed: ${safeErrorMessage(error)}` }, 400, headers);
  }

  const user = await fetchUser(tokens.access_token);
  if (!user?.sub) return json({ error: 'Google profile did not include user id' }, 401, headers);
  if (!user?.email) return json({ error: 'Google profile did not include email' }, 401, headers);
  let firebase;
  try {
    firebase = await createFirebaseLogin(user);
  } catch (error) {
    console.error('Firebase custom token creation failed:', error);
    return json({ error: `Firebase login failed: ${safeErrorMessage(error)}` }, 500, headers);
  }
  const responseHeaders = { ...headers };
  if (tokens.refresh_token) {
    responseHeaders['Set-Cookie'] = refreshCookie(tokens.refresh_token);
  }

  return json(publicTokenPayload(tokens, user, firebase), 200, responseHeaders);
}

async function refreshAccessToken(request, headers) {
  assertEnv();

  const refreshToken = readCookie(request.headers.get('cookie') || '', COOKIE_NAME);
  if (!refreshToken) return json({ error: 'Missing refresh session' }, 401, headers);

  let tokens;
  try {
    tokens = await tokenRequest({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  } catch (error) {
    console.warn('Google OAuth refresh failed; clearing refresh cookie:', error?.message || error);
    return json({ error: 'Refresh session expired' }, 401, {
      ...headers,
      'Set-Cookie': clearCookie(),
    });
  }
  const user = await fetchUser(tokens.access_token);
  if (!user?.sub || !user?.email) {
    return json({ error: 'Refresh profile invalid' }, 401, {
      ...headers,
      'Set-Cookie': clearCookie(),
    });
  }
  let firebase;
  try {
    firebase = await createFirebaseLogin(user);
  } catch (error) {
    console.error('Firebase custom token refresh failed:', error);
    return json({ error: `Firebase login failed: ${safeErrorMessage(error)}` }, 500, {
      ...headers,
      'Set-Cookie': clearCookie(),
    });
  }
  return json(publicTokenPayload(tokens, user, firebase), 200, {
    ...headers,
    'Set-Cookie': refreshCookie(refreshToken),
  });
}

async function tokenRequest(params) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Google token exchange failed');
  }
  return payload;
}

async function fetchUser(accessToken) {
  if (!accessToken) return null;
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const profile = await response.json();
  return {
    sub: profile.sub || '',
    email: profile.email || '',
    emailVerified: Boolean(profile.email_verified),
    name: profile.name || '',
    picture: profile.picture || '',
  };
}

async function createFirebaseLogin(user) {
  const auth = getAuth(getFirebaseAdminApp());
  const uid = firebaseUid(user);

  try {
    await auth.updateUser(uid, userRecord(user));
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    await auth.createUser({ uid, ...userRecord(user) });
  }

  const customToken = await auth.createCustomToken(uid, {
    provider: 'google',
  });
  return { custom_token: customToken, uid };
}

function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0];

  const serviceAccount = firebaseServiceAccount();
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

function firebaseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
    return parsed;
  }

  const serviceAccount = {
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    private_key: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''),
  };

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Missing Firebase Admin service account env');
  }
  return serviceAccount;
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

function safeErrorMessage(error) {
  return String(error?.message || error || 'Bad Request')
    .replace(/client_secret=[^&\s]+/gi, 'client_secret=REDACTED')
    .slice(0, 240);
}

function userRecord(user) {
  return {
    email: user.email || undefined,
    emailVerified: Boolean(user.emailVerified),
    displayName: user.name || undefined,
    photoURL: user.picture || undefined,
    disabled: false,
  };
}

function firebaseUid(user) {
  return `google:${user.sub}`.slice(0, 128);
}

function publicTokenPayload(tokens, user, firebase) {
  return {
    access_token: tokens.access_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
    token_type: tokens.token_type,
    user,
    firebase_custom_token: firebase.custom_token,
    firebase_uid: firebase.uid,
  };
}

function assertEnv() {
  const missing = [];
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) missing.push('GOOGLE_OAUTH_CLIENT_ID');
  if (!process.env.GOOGLE_OAUTH_CLIENT_SECRET) missing.push('GOOGLE_OAUTH_CLIENT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required .env.local values: ${missing.join(', ')}`);
  }
}

function oauthRedirectUri() {
  return String(process.env.GOOGLE_OAUTH_REDIRECT_URI || 'postmessage').trim();
}

function corsHeaders(origin, requestUrl) {
  const headers = {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };

  if (isOriginAllowed(origin, requestUrl)) {
    headers['Access-Control-Allow-Origin'] = normalizedOrigin(origin) || requestOrigin(requestUrl);
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

function isOriginAllowed(origin, requestUrl) {
  const normalizedRequestOrigin = normalizedOrigin(origin);
  if (!normalizedRequestOrigin) return true;
  return allowedOrigins(requestUrl).has(normalizedRequestOrigin);
}

function allowedOrigins(requestUrl) {
  const values = [
    requestOrigin(requestUrl),
    process.env.ALLOWED_ORIGIN,
    process.env.ALLOWED_ORIGINS,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ];

  return new Set(values
    .flatMap(value => String(value || '').split(','))
    .map(value => normalizedOrigin(value))
    .filter(Boolean));
}

function requestOrigin(requestUrl) {
  try {
    return new URL(requestUrl).origin;
  } catch {
    return '';
  }
}

function normalizedOrigin(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'null') return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return '';
  }
}

function refreshCookie(value) {
  const secure = process.env.COOKIE_SECURE === 'false' ? '' : '; Secure';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_DAY_SECONDS}; HttpOnly${secure}; SameSite=Lax`;
}

function clearCookie() {
  const secure = process.env.COOKIE_SECURE === 'false' ? '' : '; Secure';
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Lax`;
}

function readCookie(cookieHeader, name) {
  return cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), { status, headers });
}
