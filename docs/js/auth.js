// /docs/js/auth.js
// Shared Firebase Auth helpers for Devopsia (GitHub Pages)
// Assumes firebase-app.js and firebase-auth.js are loaded globally on pages that use this.
// Exports:
// - requireAuth({ mustBeVerified: true, redirectIfAuthedTo })
// - getCurrentUserOnce()
// - sendVerificationEmail(user)

export async function getCurrentUserOnce() {
  return new Promise((resolve) => {
    const unsub = firebase.auth().onAuthStateChanged((u) => {
      unsub();
      resolve(u || null);
    });
  });
}

export async function requireAuth({ mustBeVerified = true } = {}) {
  const user = await getCurrentUserOnce();
  // If no user, bounce to login with ?next=<current-url>
  if (!user) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login/?next=${next}`;
    return Promise.reject(new Error('Unauthenticated'));
  }
  // If must be verified, enforce emailVerified
  if (mustBeVerified && !user.emailVerified) {
    // Sign out to avoid partial session usage, then route to verify page
    await firebase.auth().signOut();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/verify-email/?next=${next}`;
    return Promise.reject(new Error('Email not verified'));
  }
  return user;
}

export async function sendVerificationEmail(user) {
  try {
    await user.sendEmailVerification({
      // Optional: customize with dynamic link domain if configured in Firebase Auth
      // url: `${location.origin}/verify-email/`,
      handleCodeInApp: false,
    });
    return true;
  } catch (err) {
    console.error('sendVerificationEmail failed', err);
    return false;
  }
}

// Helper: handle “next” param after successful login
export function redirectPostLogin() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (next) {
    window.location.replace(next);
  } else {
    window.location.replace('/ai-assistant/');
  }
}

