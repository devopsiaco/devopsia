import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');
const listEl = document.getElementById('history-list');
const exportJsonBtn = document.getElementById('export-json-btn');
const exportCsvBtn = document.getElementById('export-csv');
const emptyEl = document.getElementById('history-empty');

function refreshEmptyState() {
  if (!emptyEl) return;
  emptyEl.classList.toggle('hidden', listEl.children.length > 0);
}

// Which subcollection holds history? prefer "history", fallback to "prompts"
let HISTORY_COLL = 'history';

function colRef(uid) {
  return collection(db, 'users', uid, HISTORY_COLL);
}

async function detectHistoryCollection(uid) {
  // Prefer "history"
  try {
    const snapHistory = await getDocs(query(colRefWith('history'), limit(1)));
    if (!snapHistory.empty) {
      HISTORY_COLL = 'history';
      return;
    }
  } catch (_) {}
  // Fallback to "prompts"
  try {
    const snapPrompts = await getDocs(query(colRefWith('prompts'), limit(1)));
    if (!snapPrompts.empty) {
      HISTORY_COLL = 'prompts';
      return;
    }
  } catch (_) {}
  // Default to "history" even if empty (new accounts)
  HISTORY_COLL = 'history';

  function colRefWith(name) {
    return collection(db, 'users', uid, name);
  }
}

async function getOrderedDocs(uid, pageLimit = 50) {
  // Try ordering by createdAt desc, fallback to plain get if it fails
  try {
    const q = query(colRef(uid), orderBy('createdAt', 'desc'), limit(pageLimit));
    return await getDocs(q);
  } catch (err) {
    // Some docs may lack createdAt or index not built; fallback to unordered
    return await getDocs(query(colRef(uid), limit(pageLimit)));
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'fixed top-4 right-4 bg-gray-800 text-white py-2 px-4 rounded shadow z-50';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

onAuthStateChanged(auth, async (user) => {
  if (!user || !user.emailVerified) {
    window.location.replace('/login/');
    return;
  }
  if (loadingEl) loadingEl.classList.add('hidden');
  if (contentEl) contentEl.classList.remove('hidden');

  await detectHistoryCollection(user.uid);

  const exportHistory = async (type) => {
    try {
      const snapAll = await getDocs(colRef(user.uid)); // small datasets
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
    const snap = await getOrderedDocs(user.uid, 50);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const item = document.createElement('li');
      item.className = 'border rounded p-4 bg-gray-50';
      item.dataset.id = docSnap.id;
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

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-entry text-red-500 hover:text-red-700 text-sm ml-2';
      deleteBtn.textContent = '🗑️ Delete';

      const right = document.createElement('div');
      right.className = 'flex items-center';
      right.appendChild(meta);
      right.appendChild(deleteBtn);

      header.appendChild(left);
      header.appendChild(right);

      const body = document.createElement('pre');
      body.className = 'mt-2 whitespace-pre-wrap hidden text-sm bg-white p-2 rounded border';
      body.textContent = data.response || '';

      header.addEventListener('click', (e) => {
        if (starBtn.contains(e.target) || e.target.closest('.delete-entry')) return;
        body.classList.toggle('hidden');
      });

      starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newVal = !data.isFavorite;
        try {
          await updateDoc(doc(db, 'users', user.uid, HISTORY_COLL, docSnap.id), { isFavorite: newVal });
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
    refreshEmptyState();
  } catch (err) {
    console.error('Failed to load prompt history', err);
  }
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-entry');
    if (!btn) return;
    e.stopPropagation();
    const li = btn.closest('li[data-id]');
    const entryId = li?.dataset.id;
    const uid = auth.currentUser?.uid;
    if (!entryId || !uid) return;
    li.remove();
    try {
      await deleteDoc(doc(db, 'users', uid, HISTORY_COLL, entryId));
      showToast('Entry deleted');
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
    refreshEmptyState();
  });

  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete all history?')) return;
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const histRef = colRef(uid);
        const snapAll = await getDocs(histRef);
        const batch = writeBatch(db);
        snapAll.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        listEl.innerHTML = '';
        showToast('All history cleared');
      } catch (err) {
        console.error('Failed to clear history', err);
      }
      refreshEmptyState();
    });
  }
});
