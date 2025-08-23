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
        { key: 'pricing', test: p => p.startsWith('/pricing') },
      ];
      const match = map.find(m => m.test(path));
      if (match) {
        const active = mount.querySelector(`a[data-nav="${match.key}"]`);
        if (active) active.classList.add('is-active');
      }

    })
    .catch(err => {
      console.error('Failed to load header:', err);
    });
})();
