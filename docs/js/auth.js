// /docs/js/auth.js
// Shared Firebase Auth helpers for Devopsia (GitHub Pages)
// Uses the modular Firebase SDK and exports:
// - requireAuth({ mustBeVerified: true })
// - getCurrentUserOnce()
// - sendVerificationEmail(user)
// - redirectPostLogin()

import { auth } from './firebase.js';
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

export async function getCurrentUserOnce() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u || null);
    });
  });
}

export async function requireAuth({ mustBeVerified = true } = {}) {
  const user = await getCurrentUserOnce();
  if (!user) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login/?next=${next}`;
    return Promise.reject(new Error('Unauthenticated'));
  }
  if (mustBeVerified && !user.emailVerified) {
    await signOut(auth);
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/verify-email/?next=${next}`;
    return Promise.reject(new Error('Email not verified'));
  }
  return user;
}

export async function sendVerificationEmail(user) {
  try {
    await sendEmailVerification(user, { handleCodeInApp: false });
    return true;
  } catch (err) {
    console.error('sendVerificationEmail failed', err);
    return false;
  }
}

export function redirectPostLogin() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (next) {
    window.location.replace(next);
  } else {
    window.location.replace('/ai-assistant/');
  }
}

// Attach handlers to all "Start Building" buttons
document.addEventListener('DOMContentLoaded', () => {
  const next = encodeURIComponent('/ai-assistant/');
  document.querySelectorAll('.start-button').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const user = await getCurrentUserOnce();
      if (user && user.emailVerified) {
        window.location.href = '/ai-assistant/';
      } else {
        window.location.href = `/login/?next=${next}`;
      }
    });
  });
});

