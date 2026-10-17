/* One anonymous visit event per main-site page load. No personal data. */
(() => {
  if (location.pathname !== '/' && location.pathname !== '/index.html') return;
  try {
    fetch('/api/visit', {
      method:'POST', cache:'no-store', keepalive:true,
      credentials:'omit', headers:{'Content-Type':'text/plain'}, body:'visit'
    }).catch(() => {});
  } catch (_) { /* The learning game must never depend on analytics. */ }
})();
