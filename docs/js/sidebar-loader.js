// /docs/js/sidebar-loader.js
// Injects sidebar + overlay + topbar, handles mobile drawer, highlight, user info, breadcrumbs.
export async function mountChrome({ activeId, crumbs }) {
  const sidebarHost = document.getElementById('sidebar-container');
  const overlayHost = document.getElementById('overlay-container');
  const topbarHost  = document.getElementById('topbar-container');
  // Inject components
  if (topbarHost) {
    const t = await fetch('/components/topbar.html', { cache: 'no-store' }).then(r => r.text());
    topbarHost.innerHTML = t;
  }
  if (overlayHost) {
    const o = await fetch('/components/overlay.html', { cache: 'no-store' }).then(r => r.text());
    overlayHost.innerHTML = o;
  }
  if (sidebarHost) {
    const s = await fetch('/components/sidebar.html', { cache: 'no-store' }).then(r => r.text());
    sidebarHost.innerHTML = s;
  }
  // Mobile drawer behavior
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openBtn = document.getElementById('nav-open');
  const closeBtn = document.getElementById('nav-close');
  function openDrawer() {
    sidebar?.classList.remove('-translate-x-full');
    overlay?.classList.remove('hidden');
    // focus trap basic
    sidebar?.setAttribute('tabindex', '-1');
    sidebar?.focus();
  }
  function closeDrawer() {
    sidebar?.classList.add('-translate-x-full');
    overlay?.classList.add('hidden');
  }
  openBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  // Collapsible AI group
  const caret = document.getElementById('ai-assistant-caret');
  const group = document.getElementById('ai-assistant-group');
  const toggle = document.getElementById('ai-assistant-toggle');
  const saved = localStorage.getItem('nav.ai.open') === '1';
  if (saved) { group?.classList?.remove('hidden'); if (caret) caret.textContent = '▾'; toggle?.setAttribute('aria-expanded', 'true'); }
  toggle?.addEventListener('click', () => {
    const hidden = group.classList.contains('hidden');
    group.classList.toggle('hidden');
    if (caret) caret.textContent = hidden ? '▾' : '▸';
    toggle.setAttribute('aria-expanded', hidden ? 'true' : 'false');
    localStorage.setItem('nav.ai.open', hidden ? '1' : '0');
  });
  // Highlight current item
  if (activeId) {
    const el = document.querySelector(`[data-id="${activeId}"]`);
    el?.classList?.add('active');
    if (activeId.startsWith('assistant-')) {
      group?.classList?.remove('hidden');
      if (caret) caret.textContent = '▾';
      toggle?.setAttribute('aria-expanded', 'true');
      localStorage.setItem('nav.ai.open', '1');
    }
  }
  // User info + avatar + plan + Start Building button behavior
  firebase.auth().onAuthStateChanged(async (user) => {
    const emailEl = document.getElementById('sidebar-user-email');
    const planEl  = document.getElementById('sidebar-user-plan');
    const avatarEl= document.getElementById('sidebar-avatar');
    const buildBtn= document.getElementById('topbar-build');
    if (!user) {
      if (emailEl) emailEl.textContent = 'Not signed in';
      if (planEl)  planEl.textContent = '';
      if (buildBtn) buildBtn.href = '/login/?next=/ai-assistant/';
      return;
    }
    if (emailEl) emailEl.textContent = user.email || 'User';
    try {
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(user.uid).get();
      const data = doc.exists ? doc.data() : {};
      if (planEl) planEl.textContent = data?.plan || 'Free';
      if (data?.avatarUrl && avatarEl) avatarEl.src = data.avatarUrl;
    } catch (e) { console.warn('Failed to load user profile', e); }
    if (buildBtn) {
      if (user.emailVerified) buildBtn.href = '/ai-assistant/';
      else buildBtn.href = '/login/?next=/ai-assistant/';
    }
  });
  // Logout
  document.getElementById('sidebar-logout')?.addEventListener('click', async () => {
    try { await firebase.auth().signOut(); window.location.href = '/login/'; } catch (e) { console.error(e); }
  });
  // Breadcrumbs
  renderBreadcrumbs(crumbs);
}
// Simple breadcrumb renderer
export function renderBreadcrumbs(crumbs) {
  const slot = document.getElementById('breadcrumbs');
  if (!slot) return;
  if (!Array.isArray(crumbs) || !crumbs.length) { slot.textContent = ''; return; }
  // e.g., [{label:'Home', href:'/'}, {label:'AI Assistant', href:'/ai-assistant/'}, {label:'Terraform'}]
  const parts = crumbs.map((c, i) => {
    if (c.href && i !== crumbs.length - 1) {
      return `<a href="${c.href}" class="hover:underline">${c.label}</a>`;
    }
    return `<span class="text-gray-800">${c.label}</span>`;
  });
  slot.innerHTML = parts.join(' / ');
}
