import { auth } from './firebase.js';
import { signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorEl = document.getElementById('loginError');
  const googleBtn = document.getElementById('google-login');
  const resendBtn = document.getElementById('resend-verification');

  const showError = (msg) => {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    } else {
      alert(msg);
    }
  };

  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      loginBtn.disabled = true;
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      loginBtn.appendChild(spinner);
      try {
        const userCred = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        if (!userCred.user.emailVerified) {
          await signOut(auth);
          showError('Please verify your email before logging in.');
        } else {
          window.location.href = '/ai-assistant';
        }
      } catch (err) {
        showError(err.message);
      }
      loginBtn.disabled = false;
      spinner.remove();
    });
  }

  if (googleBtn) {
    const provider = new GoogleAuthProvider();
    googleBtn.addEventListener('click', async () => {
      try {
        const { user } = await signInWithPopup(auth, provider);
        if (!user.emailVerified) {
          await signOut(auth);
          showError('Please verify your email before logging in.');
        } else {
          window.location.href = '/ai-assistant';
        }
      } catch (err) {
        showError(err.message);
      }
    });
  }

  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const email = emailInput.value;
      const password = passwordInput.value;
      if (!email || !password) {
        showError('Please enter your email and password first.');
        return;
      }
      resendBtn.disabled = true;
      const spin = document.createElement('span');
      spin.className = 'spinner';
      resendBtn.appendChild(spin);
      try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(user);
        await signOut(auth);
        showError('A new verification email has been sent. Please check your inbox.');
      } catch (err) {
        showError(err.message);
      }
      resendBtn.disabled = false;
      spin.remove();
    });
  }
});
