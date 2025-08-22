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
        item.className = 'history-item is-collapsed';
        item.dataset.id = docSnap.id;
        if (data.isFavorite) item.classList.add('bg-yellow-50');

        // grid wrapper
        const row = document.createElement('div');
        row.className = 'history-grid';

        // col 1: star (fixed size)
        const starBtn = document.createElement('button');
        starBtn.type = 'button';
        starBtn.className = 'star-btn';
        starBtn.title = data.isFavorite ? 'Unfavorite' : 'Save to favorites';
        starBtn.textContent = data.isFavorite ? '⭐' : '☆';

        // col 2: prompt (title + expandable body)
        const promptCol = document.createElement('div');
        const title = document.createElement('div');
        const text = data.prompt || data.input || '';
        title.className = 'prompt-text';
        title.textContent = text;

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'toggle-btn text-sm text-blue-600 hover:underline';
        toggleBtn.textContent = '\u25B6 Expand';

        const body = document.createElement('pre');
        body.className = 'history-body hidden';
        body.textContent = data.response || data.output || '';

        promptCol.appendChild(title);
        promptCol.appendChild(toggleBtn);
        promptCol.appendChild(body);

        // col 3: meta + delete
        const metaCol = document.createElement('div');
        metaCol.className = 'meta-wrap';
        const modeSpan = document.createElement('span');
        modeSpan.className = 'mode-badge';
        modeSpan.textContent = data.mode || data.profile || 'default';
        const dateSpan = document.createElement('span');
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : null;
        dateSpan.textContent = date ? date.toLocaleString() : '';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-entry text-red-500 hover:text-red-700';
        deleteBtn.textContent = 'Delete';
        metaCol.appendChild(modeSpan);
        metaCol.appendChild(dateSpan);
        metaCol.appendChild(deleteBtn);

        // assemble row
        row.appendChild(starBtn);
        row.appendChild(promptCol);
        row.appendChild(metaCol);

        // toggle details when clicking prompt area (but not star/delete)
        item.appendChild(row);
        listEl.appendChild(item);

        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const collapsed = item.classList.toggle('is-collapsed');
          body.classList.toggle('hidden', collapsed);
          toggleBtn.textContent = collapsed ? '\u25B6 Expand' : '\u25BC Collapse';
        });

        // Optional: expand on title click
        title.addEventListener('click', (e) => {
          const collapsed = item.classList.toggle('is-collapsed');
          body.classList.toggle('hidden', collapsed);
          toggleBtn.textContent = collapsed ? '\u25B6 Expand' : '\u25BC Collapse';
        });

        starBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const newVal = !data.isFavorite;
          try {
            await updateDoc(doc(db, 'users', user.uid, HISTORY_COLL, docSnap.id), { isFavorite: newVal });
            data.isFavorite = newVal;
            starBtn.textContent = newVal ? '⭐' : '☆';
            item.classList.toggle('bg-yellow-50', newVal);
          } catch (err) {
            console.error('Failed to toggle favorite', err);
          }
        });
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
