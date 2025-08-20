// /docs/js/prompt-history.js
const auth = firebase.auth();
const db = firebase.firestore();
const listEl = document.getElementById('history-list');
const exportJsonBtn = document.getElementById('export-json-btn');
const exportCsvBtn = document.getElementById('export-csv');

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.replace('/login/');
    return;
  }
  const exportHistory = async (type) => {
    try {
      const qSnap = await db.collection('users').doc(user.uid).collection('prompts').orderBy('createdAt','desc').get();
      const data = qSnap.docs.map(d => {
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
        const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompt-history.json';
        a.click();
        URL.revokeObjectURL(url);
      } else if (type === 'csv') {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
        const csv = headers + '\n' + rows;
        const blob = new Blob([csv], { type:'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompt-history.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export history', err);
    }
  };

  exportJsonBtn?.addEventListener('click', () => exportHistory('json'));
  exportCsvBtn?.addEventListener('click', () => exportHistory('csv'));

  try {
    const snap = await db.collection('users').doc(user.uid).collection('prompts').orderBy('createdAt','desc').limit(50).get();
    if (listEl) {
      listEl.innerHTML = snap.docs.map(d => {
        const val = d.data();
        const date = val.createdAt?.toDate ? val.createdAt.toDate().toLocaleString() : '';
        return `<div class="p-4 border rounded"><div class="text-sm text-gray-500 mb-1">${date} — ${val.mode || ''}</div><pre class="whitespace-pre-wrap">${val.prompt || ''}\n---\n${val.response || ''}</pre></div>`;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load history', err);
  }
});
