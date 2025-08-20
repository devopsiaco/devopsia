// Requires Firebase Auth already initialized
(function () {
  const signOutBtn = document.getElementById('sidebar-signout');
  if (signOutBtn && window.firebase?.auth) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await firebase.auth().signOut();
        window.location.href = '/';
      } catch (e) {
        console.error('Sign out failed:', e);
        alert('Sign out failed. See console for details.');
      }
    });
  }

  // Active link highlight based on path
  const path = window.location.pathname.replace(/\/+$/, '/').toLowerCase();

  function markActive(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      el.classList.remove('bg-gray-100', 'text-gray-900', 'font-semibold');
    });
    return function (el) {
      el.classList.add('bg-gray-100', 'text-gray-900', 'font-semibold');
    };
  }

  const setActive = markActive('.sidebar-link, .sidebar-sublink');

  // Map routes to data-link keys
  const routeMap = [
    { match: /^\/$/, key: 'home' },
    { match: /^\/ai-assistant\/terraform\/?$/i, key: 'terraform', openAI: true },
    { match: /^\/ai-assistant\/helm\/?$/i, key: 'helm', openAI: true },
    { match: /^\/ai-assistant\/k8s\/?$/i, key: 'k8s', openAI: true },
    { match: /^\/ai-assistant\/ansible\/?$/i, key: 'ansible', openAI: true },
    { match: /^\/ai-assistant\/yaml\/?$/i, key: 'yaml', openAI: true },
    { match: /^\/ai-assistant\/docker\/?$/i, key: 'docker', openAI: true },
    { match: /^\/profile\/?$/i, key: 'profile' },
    { match: /^\/prompt-history\/?$/i, key: 'prompt-history' },
  ];

  const hit = routeMap.find(r => r.match.test(path));
  if (hit) {
    const target = document.querySelector(`[data-link="${hit.key}"]`);
    if (target) setActive(target);

    // Ensure AI Assistants accordion opens if a child route is active
    if (hit.openAI) {
      const acc = document.getElementById('ai-assistants-accordion');
      if (acc && !acc.open) acc.open = true;
    }
  }
})();
