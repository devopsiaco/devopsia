import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let currentUserPlan = null;

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');

onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      currentUserPlan = userSnap.exists() ? userSnap.data().plan : null;
      if (currentUserPlan !== 'pro') {
        const secureOption = document.querySelector('#promptMode option[value="secure"]');
        if (secureOption) secureOption.disabled = true;
      }
    } catch (err) {
      console.error('Failed to load user plan', err);
    }

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
        try {
          const snap = await getDoc(prefRef);
          if (snap.exists() && snap.data().promptMode) {
            this.promptMode = snap.data().promptMode;
            if (this.promptMode === 'secure' && currentUserPlan !== 'pro') {
              this.promptMode = 'standard';
            }
            this.promptDescription = this.descriptions[this.promptMode];
          }
        } catch (err) {
          console.error('Failed to load prompt mode', err);
        }

        this.$watch('promptMode', async (value) => {
          if (value === 'secure' && currentUserPlan !== 'pro') {
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
  const prompt = document.getElementById('promptInput').value.trim();
  const promptMode = document.getElementById('promptMode').value;
  if (promptMode === 'secure' && currentUserPlan !== 'pro') {
    showToast('Secure mode is available on Pro only');
    return;
  }

  const resultEl = document.getElementById('result');
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
