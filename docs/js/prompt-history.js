import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');
const listEl = document.getElementById('history-list');

onAuthStateChanged(auth, async (user) => {
  if (!user || !user.emailVerified) {
    window.location.replace('/login/');
    return;
  }
  if (loadingEl) loadingEl.classList.add('hidden');
  if (contentEl) contentEl.classList.remove('hidden');
  try {
    const q = query(
      collection(db, 'users', user.uid, 'prompts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement('div');
      item.className = 'border rounded p-4 bg-gray-50';

      const header = document.createElement('div');
      header.className = 'flex justify-between items-center cursor-pointer';

      const title = document.createElement('div');
      const text = data.prompt || '';
      title.textContent = text.length > 100 ? text.slice(0, 100) + '…' : text;

      const meta = document.createElement('div');
      const modeSpan = document.createElement('span');
      modeSpan.className = 'text-xs px-2 py-1 rounded bg-gray-200 mr-2';
      modeSpan.textContent = data.mode || '';
      const dateSpan = document.createElement('span');
      const date = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      dateSpan.className = 'text-xs text-gray-500';
      dateSpan.textContent = date ? date.toLocaleString() : '';
      meta.appendChild(modeSpan);
      meta.appendChild(dateSpan);

      header.appendChild(title);
      header.appendChild(meta);

      const body = document.createElement('pre');
      body.className = 'mt-2 whitespace-pre-wrap hidden text-sm bg-white p-2 rounded border';
      body.textContent = data.response || '';

      header.addEventListener('click', () => {
        body.classList.toggle('hidden');
      });

      item.appendChild(header);
      item.appendChild(body);
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load prompt history', err);
  }
});
