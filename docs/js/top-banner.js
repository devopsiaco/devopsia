(async function loadTopBanner() {
  const host = document.getElementById('top-banner');
  if (!host) return;
  try {
    const res = await fetch('/components/top-banner.html', { cache: 'no-store' });
    host.innerHTML = await res.text();
  } catch (e) {
    console.error('Failed to load top banner:', e);
  }
})();
