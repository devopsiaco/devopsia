async function loadFragment(id, url) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    el.innerHTML = await res.text();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadFragment('header-container', '/components/header.html');
  document.dispatchEvent(new Event('header-loaded'));
  await loadFragment('footer-container', '/components/footer.html');
});
