// Requires Firebase Auth already initialized
(function () {
  function attachSignOut(el) {
    if (!el || el.__wired) return;
    el.__wired = true;
    el.addEventListener('click', async () => {
      try {
        if (!window.firebase?.auth) throw new Error('Firebase Auth not loaded');
        await firebase.auth().signOut();
        window.location.href = '/login/';
      } catch (e) {
        console.error('Sign out failed:', e);
        alert('Sign out failed. See console for details.');
      }
    });
  }

  function findAndWire() {
    const btn = document.getElementById('signout-btn') ||
                document.querySelector('[data-action="signout"]');
    attachSignOut(btn);
  }

  // Wire immediately if present
  document.addEventListener('DOMContentLoaded', findAndWire);

  // Also observe sidebar container for late-injected HTML
  const sidebarCtn = document.getElementById('sidebar-container') || document.body;
  const mo = new MutationObserver(() => findAndWire());
  mo.observe(sidebarCtn, { childList: true, subtree: true });

  // Highlight active link if the sidebar is present
  function highlightActive() {
    try {
      const active = document.querySelector(`#sidebar-container a[href="${location.pathname}"]`);
      if (active) active.classList.add('bg-gray-100','text-gray-900','font-semibold');
    } catch {}
  }
  document.addEventListener('DOMContentLoaded', highlightActive);
})();
