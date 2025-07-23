import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

function updateAuthButton(user) {
  const btn = document.getElementById('authButton');
  if (!btn) return;
  btn.onclick = null;
  if (user) {
    btn.textContent = 'Logout';
    btn.href = '#';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = '/';
    }, { once: true });
  } else {
    btn.textContent = 'Login';
    btn.href = '/login/';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthButton(auth.currentUser);
  onAuthStateChanged(auth, updateAuthButton);
});
