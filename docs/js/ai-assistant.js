import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let userPlan = 'free';

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

        const secureOption = document.querySelector('#promptMode option[value="secure"]');
        if (secureOption) {
          secureOption.disabled = !this.isPro;
        }
        if (!this.isPro && this.promptMode === 'secure') {
          this.promptMode = 'standard';
          this.promptDescription = this.descriptions[this.promptMode];
        }

        this.$watch('promptMode', async (value) => {
          if (value === 'secure' && !this.isPro) {
            this.promptMode = 'standard';
            this.promptDescription = this.descriptions[this.promptMode];
            showToast('Secure mode is available on Pro only');
            return;
          }
          this.promptDescription = this.descriptions[value] || '';
          try {
            await setDoc(prefRef, { promptMode: value }, { merge: true });
          } catch (err) {
            console.error('Failed to save prompt mode', err);
          }
        });
      });
    }
  };
}

document.getElementById('runPrompt').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value;
  const promptMode = document.getElementById('promptMode').value;
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
      body: JSON.stringify({ prompt, promptMode })
    });
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    resultEl.textContent = data.output;
  } catch (err) {
    resultEl.textContent = 'Error generating code';
  }
});
