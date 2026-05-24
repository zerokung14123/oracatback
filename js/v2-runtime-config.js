// Loads public runtime settings from the active backend.
// Secrets never come back from this endpoint.
function mergePublicConfig(source) {
  if (!window.CONFIG || !source) return;

  Object.keys(source).forEach(key => {
    const value = source[key];
    if (value === undefined || value === null || value === '') return;

    if (key === 'FIREBASE_CONFIG' && typeof value === 'object' && !Array.isArray(value)) {
      window.CONFIG.FIREBASE_CONFIG = window.CONFIG.FIREBASE_CONFIG || {};
      Object.keys(value).forEach(firebaseKey => {
        const firebaseValue = value[firebaseKey];
        if (firebaseValue !== undefined && firebaseValue !== null && firebaseValue !== '') {
          window.CONFIG.FIREBASE_CONFIG[firebaseKey] = firebaseValue;
        }
      });
      return;
    }

    window.CONFIG[key] = value;
  });
}

async function loadV3RuntimeConfig() {
  const configuredEndpoint = window.CONFIG?.RUNTIME_CONFIG_ENDPOINT;
  const runtimeEndpoint = configuredEndpoint === undefined ? '/api/public-config' : String(configuredEndpoint || '').trim();
  window.runtimeConfigState = {
    attempted: false,
    loaded: false,
    endpoint: runtimeEndpoint,
    error: '',
    protocol: window.location.protocol,
  };

  if (!window.CONFIG) return window.CONFIG;
  if (!runtimeEndpoint) {
    window.runtimeConfigState.loaded = true;
    return window.CONFIG;
  }
  if (window.location.protocol === 'file:') {
    window.runtimeConfigState.error = 'เปิดผ่าน file:// จึงโหลด .env.local ไม่ได้';
    return window.CONFIG;
  }

  try {
    window.runtimeConfigState.attempted = true;
    const response = await fetch(runtimeEndpoint, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok) {
      window.runtimeConfigState.error = `${runtimeEndpoint} response ${response.status}`;
      return window.CONFIG;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      window.runtimeConfigState.error = `${runtimeEndpoint} ไม่ได้ส่ง JSON กลับมา`;
      return window.CONFIG;
    }

    const payload = await response.json();
    const runtimeConfig = payload.CONFIG || {};
    mergePublicConfig(runtimeConfig);
    window.runtimeConfigState.loaded = Boolean(window.CONFIG.GOOGLE_OAUTH_CLIENT_ID);
    if (!window.runtimeConfigState.loaded) {
      window.runtimeConfigState.error = 'backend โหลดได้ แต่ไม่มี GOOGLE_OAUTH_CLIENT_ID';
    }
  } catch (error) {
    window.runtimeConfigState.error = error?.message || String(error);
    console.info('Runtime config not loaded:', error?.message || error);
  }

  return window.CONFIG;
}

window.loadV3RuntimeConfig = loadV3RuntimeConfig;
