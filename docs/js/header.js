// /docs/js/header.js
(function () {
  const mount = document.getElementById('top-banner');
  if (!mount) return;

  fetch('/components/header.html', { cache: 'no-cache' })
    .then(res => res.text())
    .then(html => {
      mount.innerHTML = html;

      // Active link logic by pathname prefix
      const path = window.location.pathname.replace(/\/index\.html$/, '');
      const map = [
        { key: 'home', test: p => p === '/' || p === '' },
        { key: 'product', test: p => p.startsWith('/product') },
        { key: 'resources', test: p => p.startsWith('/resources') },
      ];
      const match = map.find(m => m.test(path));
      if (match) {
        const active = mount.querySelector(`a[data-nav="${match.key}"]`);
        if (active) active.classList.add('is-active');
      }

      // Ensure page content doesn’t slide under fixed header (if fixed later)
      const header = mount.querySelector('.site-header');
      if (header) {
        const next = mount.nextElementSibling;
        if (next && !next.dataset.headerAdjusted) {
          const rect = header.getBoundingClientRect();
          const h = Math.ceil(rect.height);
          if (h > 0) {
            const style = window.getComputedStyle(header);
            const position = style.position;
            if (position === 'fixed' || position === 'sticky') {
              next.style.scrollMarginTop = h + 'px';
              next.style.paddingTop = 'clamp(8px, 2vw, 16px)';
              next.dataset.headerAdjusted = 'true';
            }
          }
        }
      }
    })
    .catch(err => {
      console.error('Failed to load header:', err);
    });
})();
