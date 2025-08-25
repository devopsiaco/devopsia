(function () {
  async function loadFooter() {
    try {
      // Prefer a placeholder container if present; otherwise create one
      let host = document.getElementById('footer-container');
      if (!host) {
        host = document.createElement('div');
        host.id = 'footer-container';
        document.body.appendChild(host);
      }

      // Use an absolute path so subpages like /ai-assistant-terraform/ work
      const url = '/components/footer.html';

      // Cache-buster so updates show up immediately on GH Pages
      const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch footer: ${res.status}`);

      const html = await res.text();

      const existing = document.querySelector('footer[data-autoload]');
      if (existing) existing.remove();
      host.innerHTML = html;

      // If the footer relies on icons or scripts, rehydrate here (not needed for inline SVGs)
      // Example (if we later switch to Lucide): window.lucide?.createIcons?.();

    } catch (err) {
      console.error('[Footer] load error:', err);
    }
  }

  // Load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }
})();
