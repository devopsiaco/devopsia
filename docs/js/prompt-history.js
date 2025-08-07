import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');
const listEl = document.getElementById('history-list');
const exportJsonBtn = document.getElementById('export-json');
const exportCsvBtn = document.getElementById('export-csv');

onAuthStateChanged(auth, async (user) => {
  if (!user || !user.emailVerified) {
    window.location.replace('/login/');
    return;
  }
  if (loadingEl) loadingEl.classList.add('hidden');
  if (contentEl) contentEl.classList.remove('hidden');

  const exportHistory = async (type) => {
    try {
      const qAll = query(
        collection(db, 'users', user.uid, 'prompts'),
        orderBy('createdAt', 'desc')
      );
      const snapAll = await getDocs(qAll);
      const data = snapAll.docs.map((d) => {
        const val = d.data();
        return {
          prompt: val.prompt || '',
          mode: val.mode || '',
          createdAt: val.createdAt?.toDate ? val.createdAt.toDate().toISOString() : '',
          response: val.response || '',
          isFavorite: val.isFavorite ?? ''
        };
      });
      if (type === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompt-history.json';
        a.click();
        URL.revokeObjectURL(url);
      } else if (type === 'csv') {
        const header = ['prompt', 'mode', 'createdAt', 'response', 'isFavorite'];
        const rows = data.map((row) =>
          header
            .map((key) => `"${String(row[key]).replace(/"/g, '""')}"`)
            .join(',')
        );
        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompt-history.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export prompt history', err);
    }
  };

  if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => exportHistory('json'));
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportHistory('csv'));
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
      if (data.isFavorite) item.classList.add('bg-yellow-50');

      const header = document.createElement('div');
      header.className = 'flex justify-between items-center cursor-pointer';

      const left = document.createElement('div');
      left.className = 'flex items-center';

      const starBtn = document.createElement('button');
      starBtn.type = 'button';
      starBtn.className = 'mr-2 text-xl p-1';
      starBtn.textContent = data.isFavorite ? '⭐' : '☆';

      const title = document.createElement('div');
      const text = data.prompt || '';
      title.textContent = text.length > 100 ? text.slice(0, 100) + '…' : text;

      left.appendChild(starBtn);
      left.appendChild(title);

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
      if (data.isFavorite) {
        const favSpan = document.createElement('span');
        favSpan.className = 'text-yellow-500 ml-2';
        favSpan.textContent = '⭐ Favorite';
        meta.appendChild(favSpan);
      }

      header.appendChild(left);
      header.appendChild(meta);

      const body = document.createElement('pre');
      body.className = 'mt-2 whitespace-pre-wrap hidden text-sm bg-white p-2 rounded border';
      body.textContent = data.response || '';

      header.addEventListener('click', (e) => {
        if (starBtn.contains(e.target)) return;
        body.classList.toggle('hidden');
      });

      starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newVal = !data.isFavorite;
        try {
          await updateDoc(doc(db, 'users', user.uid, 'prompts', docSnap.id), { isFavorite: newVal });
          data.isFavorite = newVal;
          starBtn.textContent = newVal ? '⭐' : '☆';
          if (newVal) {
            item.classList.add('bg-yellow-50');
            const favSpan = document.createElement('span');
            favSpan.className = 'text-yellow-500 ml-2';
            favSpan.textContent = '⭐ Favorite';
            meta.appendChild(favSpan);
          } else {
            item.classList.remove('bg-yellow-50');
            meta.querySelectorAll('.text-yellow-500').forEach((el) => el.remove());
          }
        } catch (err) {
          console.error('Failed to toggle favorite', err);
        }
      });

      item.appendChild(header);
      item.appendChild(body);
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error('Failed to load prompt history', err);
  }
});
