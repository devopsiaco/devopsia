import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let userPlan = 'free';
let currentMode = 'secure';

document.addEventListener('promptMode:change', (e) => {
  currentMode = e.detail.mode;
});
document.addEventListener('DOMContentLoaded', () => {
  document.dispatchEvent(new window.Event('promptMode:get'));
});

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'fixed top-4 right-4 bg-gray-800 text-white py-2 px-4 rounded shadow z-50';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');

onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');
  } else {
    window.location.replace('/login/');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const match = path.match(/ai-assistant-([^/]+)/);
  if (match) {
    const name = match[1]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    const breadcrumb = document.createElement('nav');
    breadcrumb.className = 'text-sm text-gray-500 mb-4';
    breadcrumb.innerHTML = `<a href="/" class="hover:underline">Home</a> / ${name}`;
    document.querySelector('main')?.prepend(breadcrumb);
  }
});

export function promptComponent() {
  return {
    isPro: false,
    async init() {
      onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        try {
          const planSnap = await getDoc(userRef);
          if (planSnap.exists() && typeof planSnap.data().plan === 'string') {
            userPlan = planSnap.data().plan.toLowerCase();
            this.isPro = userPlan === 'pro';
          }
        } catch (err) {
          console.error('Failed to load user settings', err);
        }
      });
    }
  };
}

document.getElementById('runPrompt').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value;
  const promptMode = currentMode;
  const tool = document.getElementById('tool')?.value || 'general';
  const resultEl = document.getElementById('result');
  if (promptMode === 'secure' && userPlan !== 'pro') {
    showToast('Secure mode is available on Pro only');
    return;
  }
  resultEl.textContent = 'Generating...';
  try {
    // Central API base. Override via window.__DEVOPSIA_API_BASE if needed.
    const API_BASE = (window.__DEVOPSIA_API_BASE || 'https://e0wxwjllp0.execute-api.eu-north-1.amazonaws.com/prod').replace(/\/+$/, '');
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, promptMode, tool })
    });
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    resultEl.textContent = data.output;
    const user = auth.currentUser;
    if (user) {
      try {
        await addDoc(collection(db, 'users', user.uid, 'prompts'), {
          prompt,
          mode: promptMode,
          response: data.output,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Failed to save prompt history', err);
      }
    }
  } catch (err) {
    resultEl.textContent = 'Error generating code';
  }
});

// ---------------------------
// File processing integration
// ---------------------------
(function attachFileProcessing() {
  const API_BASE = (window.__DEVOPSIA_API_BASE || 'https://e0wxwjllp0.execute-api.eu-north-1.amazonaws.com/prod').replace(/\/+$/, '');

  async function postJSON(path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const raw = await res.text();
    let data; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { _parseError: raw }; }
    if (!res.ok) {
      const detail = data?.detail || data?.error || data?._parseError || raw || `HTTP ${res.status}`;
      throw new Error(detail);
    }
    return data;
  }

  // Optional per-page UI (only wires if present)
  const fileInput = document.getElementById('fileInput');
  const operationSelect = document.getElementById('operationSelect');
  const instructionsInput = document.getElementById('instructionsInput');
  const processBtn = document.getElementById('processFileBtn');
  const resultEl = document.getElementById('processResult');

  if (!processBtn) return;

  processBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('Please choose a file first.');
      return;
    }
    const file = fileInput.files[0];
    const fileName = file.name || 'input.txt';
    const operation = (operationSelect?.value || 'clean').toLowerCase();
    const instructions = (instructionsInput?.value || '').trim();

    // Read file
    let content;
    try { content = await file.text(); }
    catch (err) { console.error('Read file failed:', err); showToast('Failed to read file.'); return; }

    // Guard ~1.2MB
    const byteLen = new TextEncoder().encode(content).length;
    if (byteLen > 1_150_000) { showToast('File too large for processing (~>1.2MB).'); return; }

    const original = processBtn.textContent;
    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';
    if (resultEl) resultEl.textContent = 'Processing...';

    try {
      const data = await postJSON('/process-file', { operation, fileName, content, instructions });
      const out = data?.resultText ?? '';
      if (!out) throw new Error('No resultText returned');
      if (resultEl) {
        if ('value' in resultEl) resultEl.value = out;
        else resultEl.textContent = out;
      }
      showToast('File processed.');
    } catch (err) {
      console.error('Process file error:', err);
      if (resultEl) {
        const msg = String(err?.message || err || 'Error processing file');
        resultEl.textContent = `Error: ${msg}`;
      }
      showToast('Error processing file.');
    } finally {
      processBtn.disabled = false;
      processBtn.textContent = original;
    }
  });
})();
