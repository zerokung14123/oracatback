export default async function handler() {
  const CONFIG = {};

  setIfPresent(CONFIG, 'GOOGLE_OAUTH_CLIENT_ID', process.env.GOOGLE_OAUTH_CLIENT_ID);
  setIfPresent(CONFIG, 'GOOGLE_OAUTH_TOKEN_ENDPOINT', process.env.GOOGLE_OAUTH_TOKEN_ENDPOINT || defaultGoogleOAuthEndpoint());
  setIfPresent(CONFIG, 'SHEET_ID', process.env.GOOGLE_SHEET_ID);
  setIfPresent(CONFIG, 'SHEET_NAME', process.env.GOOGLE_SHEET_NAME);
  setIfPresent(CONFIG, 'CALENDAR_ID', process.env.GOOGLE_CALENDAR_ID);
  setIfPresent(CONFIG, 'FIREBASE_APP_CHECK_SITE_KEY', process.env.FIREBASE_APP_CHECK_SITE_KEY);

  const firebaseConfig = parseFirebaseConfig();
  if (firebaseConfig) CONFIG.FIREBASE_CONFIG = firebaseConfig;

  return new Response(JSON.stringify({ CONFIG }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  });
}

function setIfPresent(target, key, value) {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    target[key] = value;
  }
}

function defaultGoogleOAuthEndpoint() {
  return process.env.GOOGLE_OAUTH_CLIENT_ID ? '/api/google-oauth' : '';
}

function parseFirebaseConfig() {
  if (process.env.FIREBASE_CONFIG_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_CONFIG_JSON);
    } catch {
      return null;
    }
  }

  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  return Object.values(config).every(Boolean) ? config : null;
}
