import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let userPlan = 'free';
let currentMode = 'standard';

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
    promptMode: 'standard',
    promptDescription: '',
    isPro: false,
    descriptions: {
      standard: 'General guidance without additional optimizations.',
      secure: 'Applies security best practices to every response.',
      optimized: 'Focuses on performance and efficiency improvements.'
    },
    async init() {
      this.promptDescription = this.descriptions[this.promptMode];
      onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        const prefRef = doc(db, 'users', user.uid, 'preferences');
        const userRef = doc(db, 'users', user.uid);
        try {
          const [prefSnap, planSnap] = await Promise.all([
            getDoc(prefRef),
            getDoc(userRef)
          ]);
          if (prefSnap.exists() && prefSnap.data().promptMode) {
            this.promptMode = prefSnap.data().promptMode;
            this.promptDescription = this.descriptions[this.promptMode];
          }
          if (planSnap.exists() && typeof planSnap.data().plan === 'string') {
            userPlan = planSnap.data().plan.toLowerCase();
            this.isPro = userPlan === 'pro';
          }
        } catch (err) {
          console.error('Failed to load user settings', err);
        }

        const secureBtn = document.querySelector('#prompt-mode-buttons button[data-mode="secure"]');
        if (secureBtn) {
          if (!this.isPro) {
            secureBtn.disabled = true;
            secureBtn.classList.add('opacity-50', 'cursor-not-allowed');
          }
        }
        if (!this.isPro && this.promptMode === 'secure') {
          this.promptMode = 'standard';
          this.promptDescription = this.descriptions[this.promptMode];
        }

        this.updateButtons();

        document.querySelectorAll('#prompt-mode-buttons button').forEach(btn => {
          btn.addEventListener('click', async () => {
            const mode = btn.getAttribute('data-mode');
            if (mode === 'secure' && !this.isPro) {
              showToast('Secure mode is available on Pro only');
              return;
            }
            this.promptMode = mode;
            this.promptDescription = this.descriptions[mode] || '';
            this.updateButtons();
            try {
              await setDoc(prefRef, { promptMode: mode }, { merge: true });
            } catch (err) {
              console.error('Failed to save prompt mode', err);
            }
          });
        });
      });
    },
    updateButtons() {
      document.querySelectorAll('#prompt-mode-buttons button').forEach(b => {
        b.classList.remove('bg-green-500');
        if (b.getAttribute('data-mode') === this.promptMode) {
          b.classList.add('bg-green-500');
        }
      });
      currentMode = this.promptMode;
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
