/** Load header/footer & handle mobile menu **/
(async function(){
  async function inject(id, url){
    const el = document.getElementById(id);
    if(!el) return;
    try{ const res = await fetch(url, { cache:'no-cache' }); el.innerHTML = await res.text(); }
    catch(e){ console.error('include failed', url, e); }
  }
  await inject('site-header', '/components/site-header.html');
  await inject('site-footer', '/components/site-footer.html');

  // After injection, wire mobile toggle
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-menu');
  toggle?.addEventListener('click', ()=>{
    const open = menu?.classList.toggle('open');
    if (toggle) toggle.setAttribute('aria-expanded', String(!!open));
  });
})();
