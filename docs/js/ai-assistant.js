import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const toast = (msg) => {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'), 1600);
};

function activeAssistantFromPath(){
  const m = location.pathname.match(/ai-assistant-([^/]+)\//);
  return m ? m[1] : 'terraform';
}

async function injectSidebar(){
  const c = document.getElementById('sidebar-container');
  if (!c) return;
  try {
    const res = await fetch('/components/sidebar.html', { cache: 'no-cache' });
    c.innerHTML = await res.text();
    // highlight active link
    const curr = activeAssistantFromPath();
    c.querySelectorAll('[data-assistant]').forEach(a=>{
      if (a.getAttribute('data-assistant') === curr) a.classList.add('active');
    });
    // logout
    const btn = c.querySelector('#logout-btn');
    btn?.addEventListener('click', async ()=>{ await signOut(auth); location.href='/login/'; });
  } catch (e) { console.error('sidebar load failed', e); }
}

function wireControls(user){
  const titleMap = {
    terraform:'Terraform Assistant',
    helm:'Helm Assistant',
    k8s:'K8s Assistant',
    ansible:'Ansible Assistant',
    yaml:'YAML Assistant',
    docker:'Docker Assistant'
  };
  const key = activeAssistantFromPath();
  document.getElementById('crumb-assistant')?.textContent = titleMap[key] || 'Assistant';
  document.getElementById('page-title')?.textContent = titleMap[key] || 'Assistant';

  const runBtn = document.getElementById('run-btn');
  const copyBtn = document.getElementById('copy-output');
  const saveFav = document.getElementById('save-fav');
  const out = document.getElementById('output');
  const textarea = document.getElementById('prompt');
  const modeSel = document.getElementById('mode-select');
  const modePill = document.getElementById('mode-pill');

  modeSel?.addEventListener('change',()=>{
    const label = modeSel.options[modeSel.selectedIndex]?.text || modeSel.value;
    if(modePill) modePill.textContent = `Mode: ${label}`;
  });

  copyBtn?.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(out.textContent || ''); toast('Copied'); }catch{ toast('Copy failed'); }
  });

  saveFav?.addEventListener('click', async ()=>{
    try{
      const uid = user.uid;
      const id = crypto.randomUUID();
      await setDoc(doc(db,'users',uid,'history',id), {
        prompt: textarea.value || '',
        mode: modeSel.value || 'optimized',
        response: out.textContent || '',
        isFavorite: true,
        createdAt: serverTimestamp(),
      });
      toast('Saved to favorites');
    }catch(e){ console.error(e); toast('Save failed'); }
  });

  runBtn?.addEventListener('click', async ()=>{
    const prompt = (textarea.value || '').trim();
    if (!prompt){ toast('Enter a prompt'); return; }
    out.textContent = '// Running…';
    try {
      const res = await fetch('https://e0wxwjllp0.execute-api.eu-north-1.amazonaws.com/prod/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, promptMode: modeSel.value, tool: key })
      });
      if(!res.ok) throw new Error('Request failed');
      const data = await res.json();
      out.textContent = data.output || JSON.stringify(data,null,2);
      const uid = user.uid;
      const id = crypto.randomUUID();
      await setDoc(doc(db,'users',uid,'history',id), {
        prompt,
        mode: modeSel.value || 'optimized',
        response: out.textContent || '',
        isFavorite: false,
        createdAt: serverTimestamp(),
      });
      document.querySelector('.panel:nth-of-type(2)')?.scrollIntoView({ behavior:'smooth' });
    } catch(e){
      console.error(e); toast('Run failed');
      out.textContent = '// Error';
    }
  });
}

onAuthStateChanged(auth, async (user)=>{
  if (!user || !user.emailVerified){ location.href='/login/'; return; }
  await injectSidebar();
  wireControls(user);
});
