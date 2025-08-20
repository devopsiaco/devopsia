import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let userPlan = 'free';
let currentMode = 'default';

window.onModeChange = (mode) => {
  currentMode = mode;
};

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
        const secureBtn = document.querySelector('#prompt-mode-buttons .btn-mode[data-mode="secure"]');
        if (secureBtn && !this.isPro) {
          secureBtn.disabled = true;
          secureBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        const self = this;
        window.onModeChange = function(mode) {
          if (mode === 'secure' && !self.isPro) {
            showToast('Secure mode is available on Pro only');
            return;
          }
          currentMode = mode;
        };
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
    const res = await fetch('https://e0wxwjllp0.execute-api.eu-north-1.amazonaws.com/prod/generate', {
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
