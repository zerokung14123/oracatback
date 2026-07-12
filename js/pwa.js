(() => {
  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

  if (!('serviceWorker' in navigator)) return;
  if (!window.isSecureContext && !isLocalhost) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(() => {});
  });
})();
