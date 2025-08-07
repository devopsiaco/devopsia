import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');
const listEl = document.getElementById('prompt-list');

onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');
    await loadPrompts(user.uid);
  } else {
    window.location.replace('/login/');
  }
});

async function loadPrompts(uid) {
  try {
    const q = query(collection(db, 'users', uid, 'prompts'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) {
      const p = document.createElement('p');
      p.textContent = 'No prompts found.';
      listEl.appendChild(p);
      return;
    }
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const card = document.createElement('div');
      card.className = 'border rounded p-4';

      const header = document.createElement('div');
      header.className = 'flex justify-between items-center';

      const promptSpan = document.createElement('span');
      const promptText = data.prompt || '';
      promptSpan.textContent = promptText.length > 60 ? `${promptText.slice(0, 60)}...` : promptText;
      header.appendChild(promptSpan);

      const modeSpan = document.createElement('span');
      modeSpan.textContent = data.mode || '';
      modeSpan.className = 'ml-2 px-2 py-1 bg-gray-200 text-xs rounded';
      header.appendChild(modeSpan);

      const dateSpan = document.createElement('span');
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      dateSpan.textContent = createdAt.toLocaleString();
      dateSpan.className = 'ml-auto text-xs text-gray-500';
      header.appendChild(dateSpan);

      card.appendChild(header);

      const btn = document.createElement('button');
      btn.textContent = 'View Response';
      btn.className = 'mt-2 text-sm text-blue-600 hover:underline';
      card.appendChild(btn);

      const responsePre = document.createElement('pre');
      responsePre.textContent = data.response || '';
      responsePre.className = 'mt-2 p-2 bg-gray-100 rounded hidden whitespace-pre-wrap';
      card.appendChild(responsePre);

      btn.addEventListener('click', () => {
        responsePre.classList.toggle('hidden');
      });

      listEl.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load prompts', err);
  }
}
