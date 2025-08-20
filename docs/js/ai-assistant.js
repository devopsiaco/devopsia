// /docs/js/ai-assistant.js
// Handles prompt submission and history saving.
const auth = firebase.auth();
const db = firebase.firestore();
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

export function promptComponent() {
  return {
    isPro: false,
    async init() {
      auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        const userRef = db.collection('users').doc(user.uid);
        try {
          const planSnap = await userRef.get();
          if (planSnap.exists && typeof planSnap.data().plan === 'string') {
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
// expose for Alpine.js
window.promptComponent = promptComponent;

document.getElementById('runPrompt')?.addEventListener('click', async () => {
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
        await db.collection('users').doc(user.uid).collection('prompts').add({
          prompt,
          mode: promptMode,
          response: data.output,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.error('Failed to save prompt history', err);
      }
    }
  } catch (err) {
    resultEl.textContent = 'Error generating code';
  }
});
