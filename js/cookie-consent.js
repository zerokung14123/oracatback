// Cookie consent banner for PixManager.
// Stores only the user's banner decision; authentication cookies are handled by the backend.
(function () {
  const CONSENT_KEY = 'pixmanagerCookieConsent:v1';
  const DISMISSED_KEY = 'pixmanagerCookieDismissed:v1';

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return '';
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // If storage is blocked, the banner can still be closed for this page view.
    }
  }

  function hideBanner(banner) {
    banner.classList.remove('show');
    window.setTimeout(() => {
      banner.hidden = true;
    }, 180);
  }

  function showBanner(banner) {
    banner.hidden = false;
    window.requestAnimationFrame(() => banner.classList.add('show'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('cookieBanner');
    if (!banner) return;

    const accepted = readStorage(CONSENT_KEY) === 'accepted';
    const dismissed = readStorage(DISMISSED_KEY) === 'dismissed';
    if (accepted || dismissed) return;

    const acceptButton = document.getElementById('cookieAcceptBtn');
    const closeButton = document.getElementById('cookieCloseBtn');

    acceptButton?.addEventListener('click', () => {
      writeStorage(CONSENT_KEY, 'accepted');
      hideBanner(banner);
    });

    closeButton?.addEventListener('click', () => {
      writeStorage(DISMISSED_KEY, 'dismissed');
      hideBanner(banner);
    });

    showBanner(banner);
  });
}());
