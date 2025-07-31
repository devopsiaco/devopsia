import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

export function promptSettings() {
  return {
    promptMode: 'standard',
    async init() {
      onAuthStateChanged(auth, async user => {
        if (user && user.emailVerified) {
          document.body.style.display = '';
          const prefRef = doc(db, 'users', user.uid, 'preferences');
          try {
            const snap = await getDoc(prefRef);
            if (snap.exists() && snap.data().promptMode) {
              this.promptMode = snap.data().promptMode;
            }
          } catch (err) {
            console.error('Failed to load preferences', err);
          }
          this.$watch('promptMode', async value => {
            try {
              await setDoc(prefRef, { promptMode: value }, { merge: true });
            } catch (err) {
              console.error('Failed to save preferences', err);
            }
          });
        } else {
          window.location.replace('/login/');
        }
      });
    }
  };
}

document.getElementById('runPrompt').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value;
  const promptMode = document.getElementById('promptMode').value;
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
