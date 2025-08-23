// /docs/js/sidebar.js
// Assumes the sidebar HTML may be injected dynamically.
// We use event delegation so the handler works no matter when the button appears.

(function () {
  async function doSignOut() {
    try {
      // Try Firebase v8 (namespaced)
      if (window.firebase && typeof firebase.auth === 'function') {
        await firebase.auth().signOut();
      } else {
        // Try Firebase v9 (modular) on global scope
        const getAuth = window.getAuth || (window.firebase && window.firebase.getAuth);
        const signOut = window.signOut || (window.firebase && window.firebase.signOut);
        if (typeof getAuth === 'function' && typeof signOut === 'function') {
          const auth = getAuth();
          await signOut(auth);
        } else {
          throw new Error('Firebase Auth not initialized on page.');
        }
      }
      // Redirect after successful sign out
      window.location.href = '/login/';
    } catch (e) {
      console.error('Sign out failed:', e);
      alert('Sign out failed. Please try again.');
    }
  }

  // Event delegation: works even if #signout-btn is injected later
  document.addEventListener('click', function (e) {
    const btn = e.target && (e.target.id === 'signout-btn' ? e.target : e.target.closest && e.target.closest('#signout-btn'));
    if (btn) {
      e.preventDefault();
      doSignOut();
    }
  });

  // --- (Optional) Keep your active-link code below this line ---
  // Active link highlight (preserve existing logic)
  try {
    const path = window.location.pathname.replace(/\/+$/, '/').toLowerCase();
    const clearCls = (selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.remove('bg-gray-100', 'text-gray-900', 'font-semibold');
      });
      return (el) => el && el.classList.add('bg-gray-100', 'text-gray-900', 'font-semibold');
    };
    const setActive = clearCls('.sidebar-link, .sidebar-sublink');
    // Map routes to data-link keys (adjust as needed)
    const map = [
      { rx: /^\/$/, key: 'home' },
      { rx: /^\/ai-assistant-terraform\/?$/i, key: 'terraform', openAI: true },
      { rx: /^\/ai-assistant-helm\/?$/i, key: 'helm', openAI: true },
      { rx: /^\/ai-assistant-k8s\/?$/i, key: 'k8s', openAI: true },
      { rx: /^\/ai-assistant-ansible\/?$/i, key: 'ansible', openAI: true },
      { rx: /^\/ai-assistant-yaml\/?$/i, key: 'yaml', openAI: true },
      { rx: /^\/ai-assistant-docker\/?$/i, key: 'docker', openAI: true },
      { rx: /^\/prompt-history\/?$/i, key: 'history' },
      { rx: /^\/profile\/?$/i, key: 'profile' },
    ];
    const hit = map.find(m => m.rx.test(path));
    if (hit) {
      const el = document.querySelector(`[data-link="${hit.key}"]`);
      setActive(el);
      // Ensure AI Assistants accordion opens if a child route is active
      if (hit.openAI) {
        const acc = document.getElementById('ai-assistants-accordion');
        if (acc && !acc.open) acc.open = true;
      }
    }
  } catch (_) {}
})();
