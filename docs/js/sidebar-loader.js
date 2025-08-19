// /docs/js/sidebar-loader.js
// Injects sidebar, highlights active link, and loads user info/avatar.
export async function loadSidebar(activeId) {
  const container = document.getElementById('sidebar-container');
  if (!container) return;
  try {
    const resp = await fetch('/components/sidebar.html', { cache: 'no-store' });
    const html = await resp.text();
    container.innerHTML = html;
    // Highlight active link
    if (activeId) {
      const el = container.querySelector(`[data-id="${activeId}"]`);
      el?.classList?.add('active');
      // Auto-open AI group if a sublink is active
      if (activeId.startsWith('assistant-')) {
        const caret = container.querySelector('#ai-assistant-caret');
        const group = container.querySelector('#ai-assistant-group');
        group?.classList?.remove('hidden');
        if (caret) caret.textContent = '▾';
      }
    }
    // Populate user data
    firebase.auth().onAuthStateChanged(async (user) => {
      const emailEl = container.querySelector('#sidebar-user-email');
      const planEl  = container.querySelector('#sidebar-user-plan');
      const avatarEl= container.querySelector('#sidebar-avatar');
      if (!user) {
        if (emailEl) emailEl.textContent = 'Not signed in';
        if (planEl)  planEl.textContent = '';
        return;
      }
      if (emailEl) emailEl.textContent = user.email || 'User';
      try {
        const db = firebase.firestore();
        const doc = await db.collection('users').doc(user.uid).get();
        const data = doc.exists ? doc.data() : {};
        if (planEl) planEl.textContent = data?.plan || 'Free';
        if (data?.avatarUrl && avatarEl) avatarEl.src = data.avatarUrl;
      } catch (e) {
        console.warn('Failed to load profile:', e);
      }
    });
  } catch (e) {
    console.error('Sidebar load failed', e);
  }
}
