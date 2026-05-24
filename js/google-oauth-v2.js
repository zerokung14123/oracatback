// Google OAuth v3 code-flow helper.
// Google OAuth helper. Static hosting uses Firebase Google popup by default.
const googleOAuthV3 = (() => {
  const STATE_KEY = 'fotoManagerV3GoogleSession';
  const ACTIVITY_KEY = 'fotoManagerV3LastActiveAt';
  const GIS_SCRIPT_ID = 'gisCodeClientScript';
  let codeClient = null;
  let session = readSession();
  let refreshTimer = null;

  function config() {
    return window.CONFIG || {};
  }

  function endpoint() {
    return String(config().GOOGLE_OAUTH_TOKEN_ENDPOINT || '').trim();
  }

  function clientId() {
    return String(config().GOOGLE_OAUTH_CLIENT_ID || '').trim();
  }

  function isConfigured() {
    return hasBackendCodeFlow() || hasStaticFirebaseAuth();
  }

  function hasBackendCodeFlow() {
    return Boolean(clientId() && endpoint());
  }

  function hasStaticFirebaseAuth() {
    return Boolean(!endpoint() && window.firebaseData?.signInWithGooglePopup);
  }

  function configErrorMessage() {
    const runtime = window.runtimeConfigState || {};
    if (runtime.protocol === 'file:') {
      return 'กรุณาเปิดเว็บผ่าน web server หรือ domain จริง ไม่ใช่ file://';
    }
    if (runtime.attempted && !runtime.loaded) {
      return `โหลด runtime config ไม่สำเร็จ: ${runtime.error || 'unknown error'}`;
    }
    return 'ยังไม่ได้ตั้งค่า Google Login: เปิด Firebase Authentication > Google provider และใส่ Firebase Web config ใน js/config.js';
  }

  function oauthErrorMessage(error) {
    const message = error?.message || String(error || 'Unknown error');
    if (message.includes('GOOGLE_OAUTH_CLIENT_SECRET')) {
      return 'Google OAuth ล้มเหลว: backend OAuth secret ยังไม่ได้ตั้งค่า';
    }
    if (message.includes('GOOGLE_OAUTH_CLIENT_ID')) {
      return 'Google OAuth ล้มเหลว: Google OAuth Client ID ยังไม่ได้ตั้งค่า';
    }
    return 'Google OAuth ล้มเหลว: ' + message;
  }

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function writeSession(nextSession) {
    session = nextSession || {};
    if (session.accessToken) {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        expiresAt: session.expiresAt || 0,
        user: session.user || null,
      }));
    } else {
      localStorage.removeItem(STATE_KEY);
    }
    scheduleRefresh();
  }

  function markActivity() {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  }

  function idleLimitMs() {
    return Number(config().GOOGLE_SESSION_IDLE_LIMIT_MS) || 5 * 60 * 1000;
  }

  function isIdleExpired() {
    const lastActiveAt = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
    return Boolean(lastActiveAt && Date.now() - lastActiveAt > idleLimitMs());
  }

  function enforceIdleTimeout() {
    if (isIdleExpired()) {
      logout({ quiet: true });
      showToast('ไม่ได้ใช้งานเกิน 5 นาที กรุณา Login ใหม่', 'error');
      return false;
    }
    return true;
  }

  function bindActivityTracking() {
    ['click', 'keydown', 'touchstart', 'mousemove'].forEach(eventName => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    if (!localStorage.getItem(ACTIVITY_KEY)) markActivity();
    window.setInterval(enforceIdleTimeout, 60 * 1000);
  }

  function loadGisScript() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.getElementById(GIS_SCRIPT_ID) || document.getElementById('gisScript');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Identity script failed')), { once: true });
        if (window.google?.accounts?.oauth2) resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = GIS_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Identity script failed'));
      document.head.appendChild(script);
    });
  }

  async function ensureCodeClient() {
    if (!hasBackendCodeFlow()) {
      throw new Error(configErrorMessage());
    }
    await loadGisScript();
    if (codeClient) return codeClient;

    codeClient = google.accounts.oauth2.initCodeClient({
      client_id: clientId(),
      scope: config().SCOPES,
      ux_mode: 'popup',
      include_granted_scopes: true,
      callback: async response => {
        if (response.error) {
          showToast('Google OAuth ล้มเหลว: ' + response.error, 'error');
          return;
        }
        try {
          await exchangeCode(response.code);
        } catch (error) {
          console.error('Google OAuth exchange failed:', error);
          showToast(oauthErrorMessage(error), 'error');
        }
      },
      error_callback: error => {
        console.error('Google OAuth popup failed:', error);
        const message = error?.type || error?.message || 'popup ถูกปิดหรือถูกบล็อก';
        showToast('Google OAuth ล้มเหลว: ' + message, 'error');
      },
    });
    return codeClient;
  }

  async function postTokenAction(body) {
    if (!hasBackendCodeFlow()) {
      throw new Error('OAuth backend endpoint ไม่ได้เปิดใช้งานใน static hosting mode');
    }

    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XmlHttpRequest',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if ([404, 405].includes(response.status) && !payload.error) {
        throw new Error(`OAuth endpoint ${endpoint()} ใช้งานไม่ได้ (${response.status})`);
      }
      throw new Error(payload.error || `OAuth request failed (${response.status})`);
    }
    return payload;
  }

  async function exchangeCode(code) {
    if (!code) throw new Error('Missing authorization code');
    markActivity();
    const payload = await postTokenAction({
      action: 'exchange',
      code,
      redirectUri: window.location.origin,
    });
    await applyTokenPayload(payload);
    showToast('เชื่อมต่อ Google v3 สำเร็จ', 'success');
    return payload;
  }

  async function applyTokenPayload(payload) {
    const expiresIn = Number(payload.expires_in || 3600);
    writeSession({
      accessToken: payload.access_token,
      expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000,
      user: payload.user || null,
    });
    window.applyGoogleAccessToken?.(payload.access_token, { source: 'oauth-v3' });
    if (payload.firebase_custom_token && window.firebaseData?.signInWithCustomToken) {
      await window.firebaseData.signInWithCustomToken(payload.firebase_custom_token);
    }
    updateLabel();
  }

  async function loginWithFirebasePopup() {
    const result = await window.firebaseData?.signInWithGooglePopup?.({ scopes: config().SCOPES });
    if (!result?.user) return false;

    if (result.accessToken) {
      window.applyGoogleAccessToken?.(result.accessToken, { source: 'firebase-google-popup' });
      writeSession({
        accessToken: result.accessToken,
        expiresAt: Date.now() + 50 * 60 * 1000,
        user: {
          email: result.user.email || '',
          displayName: result.user.displayName || '',
        },
      });
    }
    updateLabel();
    showToast('เข้าสู่ระบบ Google สำเร็จ', 'success');
    return true;
  }

  async function login() {
    if (!enforceIdleTimeout()) return false;
    try {
      if (hasStaticFirebaseAuth()) {
        return await loginWithFirebasePopup();
      }
      const client = await ensureCodeClient();
      client.requestCode();
      return true;
    } catch (error) {
      console.error('Google OAuth login failed:', error);
      showToast(oauthErrorMessage(error), 'error');
      return false;
    }
  }

  async function refresh() {
    if (!isConfigured() || !enforceIdleTimeout()) return false;
    if (hasStaticFirebaseAuth()) {
      updateLabel();
      return Boolean(window.firebaseData?.currentUser?.());
    }
    try {
      const payload = await postTokenAction({ action: 'refresh' });
      await applyTokenPayload(payload);
      return true;
    } catch (error) {
      writeSession({});
      updateLabel();
      return false;
    }
  }

  async function logout(options = {}) {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    writeSession({});
    localStorage.removeItem(ACTIVITY_KEY);
    window.clearGoogleAccessToken?.({ revoke: false });
    if (window.firebaseData?.currentUser?.()) {
      await window.firebaseData.signOut();
    }
    window.clearAppData?.({ clearPersistent: true, quiet: true });
    if (hasBackendCodeFlow()) {
      try {
        await postTokenAction({ action: 'logout' });
      } catch {
        // Ignore logout network failures; local session is already cleared.
      }
    }
    updateLabel();
    if (!options.quiet) showToast('ออกจากระบบ Google v3 แล้ว');
  }

  function scheduleRefresh() {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    if (!session?.expiresAt || !session?.user) return;

    const delay = Math.max(60 * 1000, session.expiresAt - Date.now() - 2 * 60 * 1000);
    refreshTimer = window.setTimeout(() => {
      if (!isIdleExpired()) refresh();
    }, delay);
  }

  async function toggle() {
    if (session?.accessToken) {
      await logout();
      return;
    }
    await login();
  }

  function updateLabel() {
    window.firebaseData?.updateAuthUI?.();
  }

  async function init() {
    bindActivityTracking();
    if (!isConfigured() || isIdleExpired()) {
      enforceIdleTimeout();
      return false;
    }

    if (hasStaticFirebaseAuth()) {
      updateLabel();
      return Boolean(window.firebaseData?.currentUser?.());
    }

    if (session?.expiresAt && session.expiresAt > Date.now()) {
      updateLabel();
      scheduleRefresh();
    }
    return refresh();
  }

  return {
    init,
    login,
    logout,
    toggle,
    refresh,
    isConfigured,
    markActivity,
  };
})();

window.googleOAuthV3 = googleOAuthV3;
