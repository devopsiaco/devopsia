// /docs/js/file-processor.js
// Requires Firebase App/Auth/Firestore/Storage scripts to be loaded.
// Assumes window.API_BASE is set to the API Gateway base (e.g., https://api.devopsia.co).

(function () {
  const $ = (id) => document.getElementById(id);

  const els = {
    file: $('fp-file'),
    op: $('fp-operation'),
    ins: $('fp-instructions'),
    run: $('fp-run'),
    status: $('fp-status'),
    resultWrap: $('fp-result-wrap'),
    result: $('fp-result'),
    download: $('fp-download'),
    copy: $('fp-copy'),
    hint: $('fp-file-hint'),
  };

  if (!els.run) return; // Panel not present

  // Plan-based limits (business knobs)
  const PLAN_LIMITS = {
    free: { maxBytes: 200 * 1024 },   // 200 KiB
    pro:  { maxBytes: 1024 * 1024 },  // 1 MiB
  };

  let userPlan = 'free';
  let currentUploadRef = null;
  let currentFileName = null;

  function setStatus(msg) { if (els.status) els.status.textContent = msg || ''; }
  function showResult(text) {
    if (!els.resultWrap || !els.result) return;
    els.result.value = text || '';
    els.resultWrap.classList.remove('hidden');
  }

  function toast(msg, type = 'info') {
    // Minimal toast using alert fallback; replace with your toast util if present
    console[type === 'error' ? 'error' : 'log'](msg);
    setStatus(msg);
  }

  // Load user plan from Firestore (fallback to free)
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(user.uid).get();
      userPlan = (doc.exists && doc.data().plan) || 'free';
    } catch {}
    const kb = Math.floor((PLAN_LIMITS[userPlan]?.maxBytes || PLAN_LIMITS.free.maxBytes) / 1024);
    if (els.hint) els.hint.textContent =
      `Allowed: .json, .txt, .yaml, .yml — Max ${kb} KiB (${userPlan.toUpperCase()} plan)`;
  });

  function validateFile(file) {
    if (!file) throw new Error('Please choose a file.');
    const limit = PLAN_LIMITS[userPlan]?.maxBytes || PLAN_LIMITS.free.maxBytes;
    if (file.size > limit) {
      const kb = Math.floor(limit / 1024);
      throw new Error(`File too large for ${userPlan.toUpperCase()} plan. Limit is ${kb} KiB.`);
    }
    if (!/\.(json|txt|yaml|yml)$/i.test(file.name)) {
      throw new Error('Unsupported type. Use .json, .txt, .yaml, or .yml');
    }
  }

  async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  async function uploadToStorage(uid, file) {
    const ts = Date.now();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `uploads/${uid}/${ts}_${safeName}`;
    const storage = firebase.storage();
    const ref = storage.ref().child(path);
    await ref.put(file, { contentType: file.type || 'text/plain' });
    return ref;
  }

  async function deleteFromStorage(ref) {
    try { await ref.delete(); } catch (e) { console.warn('Delete failed:', e); }
  }

  async function addHistory(uid, payload) {
    try {
      const db = firebase.firestore();
      await db.collection('users').doc(uid).collection('prompt_history').add({
        type: 'file_process',
        plan: userPlan,
        operation: payload.operation,
        fileName: payload.fileName,
        sizeBytes: payload.sizeBytes,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        usage: payload.usage || null,
      });
    } catch (e) {
      console.warn('History write failed:', e);
    }
  }

  els.run.addEventListener('click', async () => {
    try {
      setStatus('');
      if (els.resultWrap) els.resultWrap.classList.add('hidden');
      if (els.result) els.result.value = '';

      const user = firebase.auth().currentUser;
      if (!user) throw new Error('You must be logged in.');

      const file = els.file?.files?.[0];
      validateFile(file);
      currentFileName = file.name;

      setStatus('Uploading file…');
      currentUploadRef = await uploadToStorage(user.uid, file);

      const fileText = await readFileAsText(file);
      setStatus('Processing with AI…');

      const idToken = await user.getIdToken();
      const res = await fetch(`${window.API_BASE}/process-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          operation: els.op?.value || 'clean',
          instructions: els.ins?.value || '',
          fileName: file.name,
          content: fileText,
          plan: userPlan,
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`Processing failed: ${res.status} ${errTxt}`);
      }

      const data = await res.json(); // { resultText, usage }
      showResult(data.resultText || '');
      await addHistory(user.uid, {
        operation: els.op?.value || 'clean',
        fileName: file.name,
        sizeBytes: file.size,
        usage: data.usage || null,
      });

      setStatus('Cleaning up…');
      if (currentUploadRef) await deleteFromStorage(currentUploadRef);
      toast('Done.');
    } catch (e) {
      console.error(e);
      toast(e.message || 'Something went wrong.', 'error');
      if (currentUploadRef) deleteFromStorage(currentUploadRef);
    } finally {
      currentUploadRef = null;
    }
  });

  els.download?.addEventListener('click', () => {
    const blob = new Blob([els.result?.value || ''], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    const base = (currentFileName || 'result.txt').replace(/\.(json|txt|yaml|yml)$/i, '');
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.processed.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  els.copy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.result?.value || '');
      toast('Copied to clipboard.');
    } catch {
      toast('Copy failed.', 'error');
    }
  });
})();
