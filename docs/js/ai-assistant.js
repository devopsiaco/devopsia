import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = '/login/';
  }
});

document.getElementById('runPrompt').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value;
  const resultEl = document.getElementById('result');
  resultEl.textContent = 'Generating...';
  try {
    const res = await fetch('https://e0wxwjllp0.execute-api.eu-north-1.amazonaws.com/prod/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    resultEl.textContent = data.output;
  } catch (err) {
    resultEl.textContent = 'Error generating code';
  }
});
