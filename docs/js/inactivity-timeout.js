(function() {
  const TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  let timer;

  function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(handleInactivity, TIMEOUT);
  }

  async function handleInactivity() {
    try {
      window.__autoLogout = true;
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
      await firebase.auth().signOut();
      showToast();
    } catch (e) {
      console.error('Auto sign-out failed', e);
    }
  }

  function showToast() {
    const toast = document.createElement('div');
    toast.textContent = "You've been signed out due to inactivity.";
    toast.className = 'fixed bottom-4 right-4 z-50 px-4 py-2 rounded shadow bg-gray-800 opacity-90 text-white font-semibold text-sm transition-opacity';
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    setTimeout(() => { toast.remove(); window.location.href = '/login/'; }, 3500);
  }

  events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
  resetTimer();
})();
