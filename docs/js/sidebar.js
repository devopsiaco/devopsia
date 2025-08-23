(function () {
  // --- Debug helper (optional): comment out if noisy
  const dbg = (...args) => console.debug('[sidebar]', ...args);

  function highlightActiveLink() {
    try {
      const active = document.querySelector(`#sidebar-container a[href="${location.pathname}"]`);
      if (active) active.classList.add('bg-gray-100','text-gray-900','font-semibold');
    } catch {}
  }

  // 1) Event delegation: works for late-injected HTML too
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('#signout-btn,[data-action="signout"]');
    if (!el) return;
    e.preventDefault();
    try {
      if (!window.firebase?.auth) throw new Error('Firebase Auth not loaded');
      // Prevent double-clicks
      if (el.dataset.busy === '1') return;
      el.dataset.busy = '1';
      dbg('Signing out…');
      await firebase.auth().signOut();
      window.location.href = '/login/';
    } catch (err) {
      console.error('Sign out failed:', err);
      // Minimal fallback UX
      alert('Sign out failed. See console for details.');
    } finally {
      el.dataset.busy = '0';
    }
  });

  // 2) Highlight active link when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightActiveLink);
  } else {
    highlightActiveLink();
  }
})();

