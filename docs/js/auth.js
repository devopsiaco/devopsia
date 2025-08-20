// /docs/js/auth.js
// Authentication utilities using Firebase Auth.
export function getCurrentUserOnce() {
  return new Promise(resolve => {
    const unsub = firebase.auth().onAuthStateChanged(user => {
      unsub();
      resolve(user);
    });
  });
}

export async function requireAuth({ mustBeVerified = false } = {}) {
  const user = await getCurrentUserOnce();
  if (!user || (mustBeVerified && !user.emailVerified)) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login/?next=${next}`;
    throw new Error('AUTH_REQUIRED');
  }
  return user;
}

export async function sendVerificationEmail(user) {
  try {
    await user.sendEmailVerification();
  } catch (e) {
    console.error('Failed to send verification email', e);
    throw e;
  }
}

export function redirectPostLogin() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/';
  window.location.href = next;
}
